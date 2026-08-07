import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import type {Mock} from 'vitest';
import type {GetServerSidePropsContext} from 'next';

import {getServerSideProps} from '../pages/robots.txt';

// The route only touches context.res, so a spy with the three methods it calls
// covers every branch without constructing a real ServerResponse. The mocks are
// typed to the arguments the route passes, so a wrong-arity call is a type error
// rather than something the assertions have to catch.
interface ResponseSpy {
    setHeader: Mock<[string, string], void>;
    write: Mock<[string], boolean>;
    end: Mock<[], void>;
}

const createResponseSpy = (): ResponseSpy => ({
    setHeader: vi.fn(),
    write: vi.fn(),
    end: vi.fn()
});

const contextWith = (res: ResponseSpy): GetServerSidePropsContext =>
    ({res} as unknown as GetServerSidePropsContext);

const bodyWrittenTo = (res: ResponseSpy): string => res.write.mock.calls[0][0];

beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_BASE_URL', 'https://example.test');
});

afterEach(() => {
    vi.unstubAllEnvs();
});

describe('robots.txt getServerSideProps', () => {
    it('serves the document as plain text', async () => {
        const res = createResponseSpy();

        await getServerSideProps(contextWith(res));

        expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/plain; charset=utf-8');
    });

    it('writes the body and ends the response', async () => {
        const res = createResponseSpy();

        await getServerSideProps(contextWith(res));

        expect(res.write).toHaveBeenCalledTimes(1);
        expect(res.end).toHaveBeenCalledTimes(1);
        expect(bodyWrittenTo(res)).toContain('User-agent: *');
    });

    it('advertises the sitemap and the disallowed routes', async () => {
        const res = createResponseSpy();

        await getServerSideProps(contextWith(res));

        const body = bodyWrittenTo(res);
        expect(body).toContain('Sitemap: https://example.test/sitemap.xml');
        expect(body).toContain('Disallow: /account');
        expect(body).toContain('Disallow: /dev');
        expect(body).toContain('Disallow: /api/');
    });

    it('reads NEXT_PUBLIC_BASE_URL per request rather than caching it at import time', async () => {
        const first = createResponseSpy();
        await getServerSideProps(contextWith(first));

        vi.stubEnv('NEXT_PUBLIC_BASE_URL', 'https://other.test');
        const second = createResponseSpy();
        await getServerSideProps(contextWith(second));

        expect(bodyWrittenTo(first)).toContain('Sitemap: https://example.test/sitemap.xml');
        expect(bodyWrittenTo(second)).toContain('Sitemap: https://other.test/sitemap.xml');
    });

    it('returns empty props (the response is written, never rendered)', async () => {
        const res = createResponseSpy();

        const result = await getServerSideProps(contextWith(res));

        expect(result).toEqual({props: {}});
    });
});
