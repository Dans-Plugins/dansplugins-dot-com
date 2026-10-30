// @vitest-environment jsdom
//
// Renders the resource page's Usage panel in both of trace's states, to pin
// what it is allowed to call a server.
import {afterEach, describe, expect, it} from 'vitest';
import {cleanup, render, screen} from '@testing-library/react';
import UsagePanel from '../components/UsagePanel';
import {usageWithDailyServers, usageWithInstalls, usageWithoutInstalls} from './fixtures/traceUsage';

afterEach(cleanup);

const NOW = Date.parse('2026-10-03T16:00:00Z');

describe('UsagePanel', () => {
    it('shows active servers and versions by share of servers when trace counted servers', () => {
        render(<UsagePanel usage={usageWithInstalls()} now={NOW}/>);

        expect(screen.getByTestId('usage-active-servers').textContent).toBe('57Active servers (30 days)');
        expect(screen.getByTestId('usage-servers-note').textContent).toMatch(/only from newer plugin versions/);
        expect(screen.getByTestId('usage-starts').textContent).toBe('412 server starts in the last 30 days (one server can start many times)');
        const versions = screen.getByTestId('usage-versions');
        expect(versions.getAttribute('data-basis')).toBe('servers');
        expect(versions.textContent).toContain('share of active servers');
        expect(versions.textContent).toContain('72% · 41 servers');
    });

    it('never claims servers when trace only counted starts', () => {
        const {container} = render(<UsagePanel usage={usageWithoutInstalls()} now={NOW}/>);

        expect(screen.queryByTestId('usage-active-servers')).toBeNull();
        expect(screen.getByTestId('usage-last-reported').textContent).toBe('Last reported in use 2 days ago');
        expect(screen.getByTestId('usage-servers-note').textContent).toMatch(/only from newer plugin versions.*no server count is shown/);
        expect(screen.getByTestId('usage-starts').textContent).toBe('412 server starts in the last 30 days (one server can start many times)');
        const versions = screen.getByTestId('usage-versions');
        expect(versions.getAttribute('data-basis')).toBe('starts');
        expect(versions.textContent).toContain('share of server starts');
        expect(versions.textContent).toContain('73% · 300 starts');
        expect(container.textContent).not.toMatch(/install|active server/i);
    });

    it('leads with servers: the server count comes before starts, and starts come last', () => {
        render(<UsagePanel usage={usageWithInstalls()} now={NOW}/>);

        const order = ['usage-active-servers', 'usage-last-reported', 'usage-starts', 'usage-versions']
            .map((id) => screen.getByTestId(id));
        for (let i = 1; i < order.length; i++) {
            expect(order[i - 1].compareDocumentPosition(order[i]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        }
        // The starts chart sits below the versions.
        expect(order[3].compareDocumentPosition(screen.getByRole('img')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('attributes the figures to trace, links how it works, and says CI is excluded', () => {
        render(<UsagePanel usage={usageWithoutInstalls()} now={NOW}/>);

        const link = screen.getByRole('link', {name: /how it works/});
        expect(link.getAttribute('href')).toBe('https://danielstephenson.dev/usage-reporting');
        expect(screen.getByTestId('trace-attribution').textContent).toContain('CI and test servers are excluded');
        expect(screen.getByRole('link', {name: 'Usage of every plugin'}).getAttribute('href')).toBe('/usage');
    });

    it('describes the 30-day sparkline in words for screen readers', () => {
        render(<UsagePanel usage={usageWithoutInstalls()} now={NOW}/>);

        const chart = screen.getByRole('img');
        expect(chart.getAttribute('aria-label')).toMatch(/^Server starts per day from Sep 4 to Oct 3: \d+ in total, peaking at 7 on /);
        expect(chart.getAttribute('aria-label')).toMatch(/(Up|Down) \d+%|Steady/);
    });

    it('draws only the starts trend while trace serves no per-day server count, and says how it changed', () => {
        render(<UsagePanel usage={usageWithInstalls()} now={NOW}/>);

        expect(screen.queryByTestId('trend-servers')).toBeNull();
        expect(screen.getByRole('heading', {name: 'Server starts per day'})).toBeTruthy();
        expect(screen.getByTestId('trend-starts-change').textContent).toMatch(/: last 14 days vs the 14 before$/);
    });

    it('draws the servers trend first once trace sends per-day servers, the headline still on top', () => {
        render(<UsagePanel usage={usageWithDailyServers()} now={NOW}/>);

        const headline = screen.getByTestId('usage-active-servers');
        const servers = screen.getByTestId('trend-servers');
        const starts = screen.getByTestId('trend-starts');
        expect(headline.compareDocumentPosition(servers) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        expect(servers.compareDocumentPosition(starts) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        expect(screen.getByRole('heading', {name: 'Active servers per day'})).toBeTruthy();
        expect(screen.getByTestId('trend-servers-change').textContent).toBe('Up 50%: last 14 days vs the 14 before');
        // Starts count coalesced repeats: 430 uses, not 412 raw starts.
        expect(screen.getByTestId('usage-starts').textContent).toMatch(/^430 server starts/);
    });

    it('draws no trend when nothing started and no servers were counted per day', () => {
        render(<UsagePanel usage={{...usageWithoutInstalls(), startups30d: 0, days: []}} now={NOW}/>);

        expect(screen.queryByTestId('usage-trends')).toBeNull();
        expect(screen.queryByRole('img')).toBeNull();
    });
});
