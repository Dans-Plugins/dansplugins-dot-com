import {beforeEach, describe, expect, it, vi} from 'vitest';
import type {GetServerSidePropsContext} from 'next';
import {clearCatalogueCache} from '../services/pluginCatalogueService';
import {API_CATALOGUE, catalogueResponse} from './fixtures/catalogue';

import {getServerSideProps} from '../pages/guides';

interface GuidesPropsShape {
    props: {
        guides: {id: string; title: string}[];
    };
}

// The page's function ignores its context, so an empty object stands in for it.
const run = async () => await getServerSideProps({} as GetServerSidePropsContext) as GuidesPropsShape;

// The catalogue is read from dpc-api and cached per process (see
// services/pluginCatalogueService.ts); each test starts from an empty cache.
beforeEach(() => {
    clearCatalogueCache();
    vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('guides page getServerSideProps', () => {
    it('lists every catalogue plugin as just its id and title', async () => {
        vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(catalogueResponse())));

        const result = await run();

        expect(result.props.guides).toEqual(API_CATALOGUE.map(({slug, title}) => ({id: slug, title})));
    });

    // The API already serves the catalogue alphabetically, but the page sorts
    // again rather than trusting that; serve it reversed to pin the page's sort.
    it('sorts the guides by title even when the API does not', async () => {
        const reversed = [...API_CATALOGUE].reverse();
        vi.stubGlobal('fetch', vi.fn(() =>
            Promise.resolve({ok: true, json: async () => reversed} as unknown as Response)));

        const result = await run();

        expect(result.props.guides.map((g) => g.title)).toEqual([
            'Activity Tracker',
            'Currencies',
            "Dan's Essentials",
            'Fiefs',
            'Medieval Cookery',
            'Medieval Factions',
        ]);
    });

    it('returns an empty list when the catalogue cannot be read (the page shows its unavailable message)', async () => {
        vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('network unreachable'))));

        const result = await run();

        expect(result).toEqual({props: {guides: []}});
    });

    it('returns an empty list when the API answers with an error status', async () => {
        vi.stubGlobal('fetch', vi.fn(() =>
            Promise.resolve({ok: false, status: 503, statusText: 'Service Unavailable'} as Response)));

        const result = await run();

        expect(result.props.guides).toEqual([]);
    });
});
