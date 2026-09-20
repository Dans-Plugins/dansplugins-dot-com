import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import type {Mock} from 'vitest';
import type {GetServerSidePropsContext} from 'next';

import {API_CATALOGUE, catalogueResponse} from './fixtures/catalogue';
import {clearCatalogueCache} from '../services/pluginCatalogueService';
import {STATIC_SITEMAP_PATHS} from '../utils/sitemap';
import {getServerSideProps} from '../pages/sitemap.xml';

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

const renderSitemap = async (): Promise<string> => {
    const res = createResponseSpy();
    await getServerSideProps(contextWith(res));
    return bodyWrittenTo(res);
};

beforeEach(() => {
    // The catalogue comes from dpc-api; serve the fixture and start uncached.
    clearCatalogueCache();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(catalogueResponse()));
    vi.stubEnv('NEXT_PUBLIC_BASE_URL', 'https://example.test');
});

afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
});

describe('sitemap.xml getServerSideProps', () => {
    it('serves the document as XML', async () => {
        const res = createResponseSpy();

        await getServerSideProps(contextWith(res));

        expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/xml; charset=utf-8');
        expect(res.write).toHaveBeenCalledTimes(1);
        expect(res.end).toHaveBeenCalledTimes(1);
    });

    it('emits a well-formed urlset', async () => {
        const body = await renderSitemap();

        expect(body.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
        expect(body).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
        expect(body).toContain('</urlset>');
    });

    it('lists every static page as an absolute URL', async () => {
        const body = await renderSitemap();

        STATIC_SITEMAP_PATHS.forEach((path) => {
            const expected = path === '/' ? 'https://example.test/' : `https://example.test${path}`;
            expect(body).toContain(`<loc>${expected}</loc>`);
        });
    });

    // The guide URLs come from the catalogue the API stub serves, so this fails
    // if the route stops feeding the catalogue through guideSitemapPaths.
    it('lists a guide URL for every plugin in the catalogue', async () => {
        const body = await renderSitemap();

        expect(API_CATALOGUE.length).toBeGreaterThan(0);
        API_CATALOGUE.forEach((plugin) => {
            expect(body).toContain(`<loc>https://example.test/guides/${plugin.slug}</loc>`);
        });
    });

    // Same reasoning as the guide URLs above: sourced from the catalogue, so this
    // fails if the route stops feeding it through resourceSitemapPaths.
    it('lists a resource URL for every plugin in the catalogue', async () => {
        const body = await renderSitemap();

        expect(API_CATALOGUE.length).toBeGreaterThan(0);
        API_CATALOGUE.forEach((plugin) => {
            expect(body).toContain(`<loc>https://example.test/resources/${plugin.slug}</loc>`);
        });
    });

    it('reads NEXT_PUBLIC_BASE_URL per request rather than caching it at import time', async () => {
        const first = await renderSitemap();

        vi.stubEnv('NEXT_PUBLIC_BASE_URL', 'https://other.test');
        const second = await renderSitemap();

        expect(first).toContain('<loc>https://example.test/</loc>');
        expect(second).toContain('<loc>https://other.test/</loc>');
    });

    it('returns empty props (the response is written, never rendered)', async () => {
        const res = createResponseSpy();

        const result = await getServerSideProps(contextWith(res));

        expect(result).toEqual({props: {}});
    });
});
