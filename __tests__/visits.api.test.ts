import fs from 'fs';
import path from 'path';
import type { NextApiRequest, NextApiResponse } from 'next';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import handler from '../pages/api/visits';

const VISITS_FILE = path.join(process.cwd(), 'data', 'visits.json');

const removeVisitsFile = () => {
    if (fs.existsSync(VISITS_FILE)) {
        fs.rmSync(VISITS_FILE);
    }
};

interface MockRes extends NextApiResponse {
    statusCode: number;
    body: unknown;
}

const mockRes = (): MockRes => {
    const res = {} as MockRes;
    res.status = vi.fn().mockImplementation((code: number) => {
        res.statusCode = code;
        return res;
    });
    res.json = vi.fn().mockImplementation((body: unknown) => {
        res.body = body;
        return res;
    });
    return res;
};

describe('visits API handler', () => {
    beforeEach(() => {
        removeVisitsFile();
        vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterAll(removeVisitsFile);

    it('returns 200 with visit data on GET', () => {
        const res = mockRes();
        handler({ method: 'GET' } as NextApiRequest, res);
        expect(res.statusCode).toBe(200);
        expect((res.body as { visits: number }).visits).toBeTypeOf('number');
    });

    it('increments and returns 200 on POST', () => {
        const res = mockRes();
        handler({ method: 'POST' } as NextApiRequest, res);
        expect(res.statusCode).toBe(200);
        expect((res.body as { visits: number }).visits).toBe(1);
    });

    it('returns 405 for unsupported methods', () => {
        const res = mockRes();
        handler({ method: 'DELETE' } as NextApiRequest, res);
        expect(res.statusCode).toBe(405);
    });
});
