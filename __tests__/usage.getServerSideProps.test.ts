import {beforeEach, describe, expect, it, vi} from 'vitest';
import type {GetServerSidePropsContext} from 'next';

import {getServerSideProps} from '../pages/usage';
import {clearTraceUsageCache} from '../utils/traceUsage';
import {clearCatalogueCache} from '../services/pluginCatalogueService';
import {catalogueResponse} from './fixtures/catalogue';
import {usageWithInstalls, usageWithoutInstalls} from './fixtures/traceUsage';

interface Row {
    slug: string;
    title: string;
    icon: string | null;
    usage: {application: string} | null;
}

const ctx = {} as GetServerSidePropsContext;

const run = async () => (await getServerSideProps(ctx) as {props: {rows: Row[]; renderedAt: number}}).props;

// summary: trace's /api/public/summary body, or undefined for a 404.
// programs: per-program bodies by trace name; any other name 404s.
const stub = (summary: unknown, programs: Record<string, unknown>) => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
        if (/\/api\/v1\/plugins$/.test(url)) {
            return catalogueResponse();
        }
        if (url.endsWith('/api/public/summary')) {
            return summary === undefined
                ? {ok: false, status: 404, statusText: 'Not Found'} as Response
                : {ok: true, json: async () => summary} as unknown as Response;
        }
        const program = decodeURIComponent(url.split('/api/public/programs/')[1] ?? '');
        if (program && programs[program] !== undefined) {
            return {ok: true, json: async () => programs[program]} as unknown as Response;
        }
        return {ok: false, status: 404, statusText: 'Not Found'} as Response;
    }));
};

const programUrls = () => (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls
    .map(([url]) => url as string)
    .filter((url) => url.includes('/api/public/programs/'));

beforeEach(() => {
    clearTraceUsageCache();
    clearCatalogueCache();
    vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('/usage getServerSideProps', () => {
    it('asks only about programs the summary has heard from, and ranks servers before starts', async () => {
        stub(
            [
                {application: 'Fiefs', count: 5, lastSeen: '2026-10-03T00:00:00Z'},
                {application: 'Currencies', count: 900, lastSeen: '2026-10-02T00:00:00Z'},
            ],
            {
                Fiefs: {...usageWithoutInstalls(), application: 'Fiefs'},
                Currencies: {...usageWithInstalls(), application: 'Currencies'},
            }
        );

        const {rows} = await run();

        expect(programUrls().sort()).toEqual([
            'https://trace.danielstephenson.dev/api/public/programs/Currencies',
            'https://trace.danielstephenson.dev/api/public/programs/Fiefs',
        ]);
        expect(rows).toHaveLength(27);
        expect(rows.slice(0, 2).map((r) => r.slug)).toEqual(['currencies', 'fiefs']);
        // The catalogue supplies display titles; a plugin missing from it falls back to its trace name.
        expect(rows[0].title).toBe('Currencies');
        expect(rows.find((r) => r.slug === 'wild-pets')?.title).toBe('WildPets');
        expect(rows.slice(2).every((r) => r.usage === null)).toBe(true);
    });

    it('asks about every plugin when the summary is unavailable, and degrades to no figures on 404s', async () => {
        stub(undefined, {});

        const {rows} = await run();

        expect(programUrls()).toHaveLength(27);
        expect(rows.every((r) => r.usage === null)).toBe(true);
        // With nothing to rank by, the order is alphabetical by title.
        const titles = rows.map((r) => r.title);
        expect(titles).toEqual([...titles].sort((a, b) => a.localeCompare(b)));
    });
});
