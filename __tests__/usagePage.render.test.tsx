/**
 * @vitest-environment jsdom
 */
// Renders /usage to pin that it leads with servers, demotes server starts to
// small print, and says servers are counted only from newer plugin versions.
import React from 'react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {cleanup, render, screen, within} from '@testing-library/react';

vi.mock('next/router', () => ({useRouter: () => ({pathname: '/usage', asPath: '/usage', query: {}, push: vi.fn()})}));

import Usage from '../pages/usage';
import {usageWithInstalls, usageWithoutInstalls} from './fixtures/traceUsage';

afterEach(cleanup);

const NOW = Date.parse('2026-10-03T16:00:00Z');

const row = (slug: string, title: string, usage: unknown, serversYear: number | null) =>
    ({slug, title, icon: null, usage, serversYear});

const renderPage = (rows: ReturnType<typeof row>[]) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    render(<Usage rows={rows as any} renderedAt={NOW}/>);

describe('/usage page', () => {
    it('explains that servers are counted only from newer plugin versions', () => {
        renderPage([row('medieval-factions', 'Medieval Factions', usageWithInstalls(), 31)]);
        expect(screen.getByTestId('usage-servers-note').textContent).toMatch(/only from newer plugin versions/);
    });

    it('leads a row with active servers, then servers in the past year, with starts last', () => {
        renderPage([row('medieval-factions', 'Medieval Factions', usageWithInstalls(), 31)]);
        const item = screen.getByTestId('usage-row');
        const servers = within(item).getByTestId('usage-row-servers');
        const year = within(item).getByTestId('usage-row-servers-year');
        const starts = within(item).getByTestId('usage-row-starts');
        expect(servers.textContent).toBe('57 active servers (30 days)');
        expect(year.textContent).toBe('31 servers seen in the past year');
        expect(starts.textContent).toBe('412 server starts in the last 30 days');
        expect(servers.compareDocumentPosition(year) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        expect(year.compareDocumentPosition(starts) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('leads with servers in the past year when trace has no 30-day server count', () => {
        renderPage([row('fiefs', 'Fiefs', usageWithoutInstalls(), 3)]);
        expect(screen.queryByTestId('usage-row-servers')).toBeNull();
        expect(screen.getByTestId('usage-row-servers-year').textContent).toBe('3 servers seen in the past year');
    });

    it('falls back to last reported and starts, never calling them servers, when trace counted none', () => {
        renderPage([row('currencies', 'Currencies', usageWithoutInstalls(), null)]);
        const item = screen.getByTestId('usage-row');
        expect(within(item).queryByTestId('usage-row-servers')).toBeNull();
        expect(within(item).queryByTestId('usage-row-servers-year')).toBeNull();
        expect(within(item).getByTestId('usage-row-last-reported').textContent).toBe('Last reported in use 2 days ago');
        expect(item.textContent).not.toMatch(/active server|servers seen|install/i);
    });

    it('shows a row with a past-year count even when the per-plugin figures are missing', () => {
        renderPage([row('herald', 'Herald', null, 4)]);
        expect(screen.getByTestId('usage-row-servers-year').textContent).toBe('4 servers seen in the past year');
        expect(screen.queryByTestId('usage-row-none')).toBeNull();
        expect(screen.queryByTestId('usage-unavailable')).toBeNull();
    });
});
