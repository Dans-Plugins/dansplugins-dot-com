// @vitest-environment node
import { NextRequest } from 'next/server';
import { describe, expect, it, vi } from 'vitest';

describe('middleware', () => {
    it('passes every request through and reports nothing when no key is configured', async () => {
        vi.stubEnv('USAGE_REPORTING_KEY', '');
        const fetch = vi.spyOn(globalThis, 'fetch');
        const { middleware, config } = await import('../middleware');
        const waitUntil = vi.fn();
        const response = middleware(
            new NextRequest('http://localhost/', { headers: { accept: 'text/html', 'user-agent': 'Mozilla/5.0 Firefox/128.0' } }),
            { waitUntil } as never,
        );
        expect(response.headers.get('x-middleware-next')).toBe('1');
        expect(waitUntil).not.toHaveBeenCalled();
        expect(fetch).not.toHaveBeenCalled();
        expect(config.matcher).toEqual(['/((?!_next/|api/|.*\\..*).*)']);
        fetch.mockRestore();
        vi.unstubAllEnvs();
    });
});
