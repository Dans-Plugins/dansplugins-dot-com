import type { NextApiRequest, NextApiResponse } from 'next';
import { describe, expect, it } from 'vitest';
import handler from '../pages/api/version';
import nextConfig from '../next.config.js';
import pkg from '../package.json';

interface Recorded {
    statusCode: number;
    headers: Record<string, string>;
    body: string | undefined;
}

const call = (method: string): Recorded => {
    const recorded: Recorded = { statusCode: 0, headers: {}, body: undefined };
    const res = {
        setHeader(name: string, value: string) {
            recorded.headers[name.toLowerCase()] = value;
            return this;
        },
        status(code: number) {
            recorded.statusCode = code;
            return this;
        },
        send(body: string) {
            recorded.body = body;
            return this;
        },
        end() {
            return this;
        },
    };
    handler({ method } as NextApiRequest, res as unknown as NextApiResponse);
    return recorded;
};

describe('GET /version.json', () => {
    it('answers 200 with JSON naming the package.json version', () => {
        const res = call('GET');
        expect(res.statusCode).toBe(200);
        expect(res.headers['content-type']).toBe('application/json');
        expect(JSON.parse(res.body ?? '')).toEqual({ version: pkg.version });
    });

    it('is never cached', () => {
        expect(call('GET').headers['cache-control']).toBe('no-store');
    });

    it('refuses other methods with 405', () => {
        const res = call('POST');
        expect(res.statusCode).toBe(405);
        expect(res.headers['allow']).toBe('GET, HEAD');
    });

    it('is reached at /version.json through a rewrite in next.config.js', async () => {
        const rewrites = await nextConfig.rewrites();
        expect(rewrites).toContainEqual({ source: '/version.json', destination: '/api/version' });
    });
});
