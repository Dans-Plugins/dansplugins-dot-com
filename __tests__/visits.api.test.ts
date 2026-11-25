import fs from 'fs';
import path from 'path';
import type { NextApiRequest, NextApiResponse } from 'next';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import handler, { config } from '../pages/api/visits';
import { POST_LIMIT_PER_MINUTE, recordVisit, resetVisitCounterState } from '../utils/visitCounter';

const VISITS_FILE = path.join(process.cwd(), 'data', 'visits.json');

const removeVisitsFile = () => {
    if (fs.existsSync(VISITS_FILE)) {
        fs.rmSync(VISITS_FILE);
    }
};

interface MockRes extends NextApiResponse {
    statusCode: number;
    body: unknown;
    headers: Record<string, string>;
}

const mockRes = (): MockRes => {
    const res = { headers: {} } as MockRes;
    res.status = vi.fn().mockImplementation((code: number) => {
        res.statusCode = code;
        return res;
    });
    res.json = vi.fn().mockImplementation((body: unknown) => {
        res.body = body;
        return res;
    });
    res.setHeader = vi.fn().mockImplementation((name: string, value: string) => {
        res.headers[name.toLowerCase()] = value;
        return res;
    });
    return res;
};

// A POST as a browser on the site sends it through the gateway's Traefik.
const browserPost = (address = '203.0.113.7', headers: Record<string, string> = {}) => ({
    method: 'POST',
    headers: {
        host: 'dansplugins.com',
        origin: 'https://dansplugins.com',
        'x-forwarded-for': address,
        ...headers,
    },
    socket: { remoteAddress: '172.18.0.2' },
}) as unknown as NextApiRequest;

const call = (req: NextApiRequest) => {
    const res = mockRes();
    handler(req, res);
    return res;
};

const visitsOf = (res: MockRes) => (res.body as { visits: number }).visits;

describe('visits API handler', () => {
    beforeEach(() => {
        removeVisitsFile();
        resetVisitCounterState();
        vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterAll(removeVisitsFile);

    it('returns 200 with visit data on GET, with no origin required', () => {
        const res = call({ method: 'GET', headers: {} } as NextApiRequest);
        expect(res.statusCode).toBe(200);
        expect(visitsOf(res)).toBeTypeOf('number');
    });

    it('increments and returns 200 on a same-origin POST', () => {
        const res = call(browserPost());
        expect(res.statusCode).toBe(200);
        expect(visitsOf(res)).toBe(1);
    });

    it('returns 405 with an Allow header for unsupported methods', () => {
        const res = call({ method: 'DELETE', headers: {} } as NextApiRequest);
        expect(res.statusCode).toBe(405);
        expect(res.headers.allow).toBe('GET, POST');
    });

    it('refuses a POST with no Origin or Referer, such as a bare curl, without counting it', () => {
        const res = call({ method: 'POST', headers: { host: 'dansplugins.com' } } as unknown as NextApiRequest);
        expect(res.statusCode).toBe(403);
        expect(visitsOf(call({ method: 'GET', headers: {} } as NextApiRequest))).toBe(0);
    });

    it('refuses a POST from another site', () => {
        const res = call(browserPost('203.0.113.7', { origin: 'https://evil.example' }));
        expect(res.statusCode).toBe(403);
    });

    it('counts one address once per visit window however often it posts', () => {
        expect(visitsOf(call(browserPost()))).toBe(1);
        expect(visitsOf(call(browserPost()))).toBe(1);
        expect(visitsOf(call(browserPost('198.51.100.9')))).toBe(2);
    });

    it('does not let a spoofed leftmost X-Forwarded-For entry mint new visitors', () => {
        call(browserPost('10.0.0.1, 203.0.113.7'));
        const res = call(browserPost('10.0.0.2, 203.0.113.7'));
        expect(visitsOf(res)).toBe(1);
    });

    it('shares the visit window with the home page, which counts in-process', () => {
        recordVisit('203.0.113.7');
        expect(visitsOf(call(browserPost()))).toBe(1);
    });

    it('answers 429 with Retry-After once an address spends its per-minute budget', () => {
        for (let i = 0; i < POST_LIMIT_PER_MINUTE; i++) {
            expect(call(browserPost()).statusCode).toBe(200);
        }
        const res = call(browserPost());
        expect(res.statusCode).toBe(429);
        expect(Number(res.headers['retry-after'])).toBeGreaterThan(0);
        expect(call(browserPost('198.51.100.9')).statusCode).toBe(200);
    });

    it('caps the request body at 1kb', () => {
        expect(config.api.bodyParser.sizeLimit).toBe('1kb');
    });
});
