// @vitest-environment jsdom
//
// Renders the resource page's Usage panel in both of trace's states, to pin
// what it is allowed to call a server.
import {afterEach, describe, expect, it} from 'vitest';
import {cleanup, render, screen} from '@testing-library/react';
import UsagePanel from '../components/UsagePanel';
import {usageWithInstalls, usageWithoutInstalls} from './fixtures/traceUsage';

afterEach(cleanup);

const NOW = Date.parse('2026-10-03T16:00:00Z');

describe('UsagePanel', () => {
    it('shows active servers and versions by share of servers when trace counted servers', () => {
        render(<UsagePanel usage={usageWithInstalls()} now={NOW}/>);

        expect(screen.getByTestId('usage-active-servers').textContent).toBe('57Active servers (30 days)');
        expect(screen.getByTestId('usage-starts').textContent).toBe('412 server starts in the last 30 days');
        const versions = screen.getByTestId('usage-versions');
        expect(versions.getAttribute('data-basis')).toBe('servers');
        expect(versions.textContent).toContain('share of active servers');
        expect(versions.textContent).toContain('72% · 41 servers');
    });

    it('never claims servers when trace only counted starts', () => {
        const {container} = render(<UsagePanel usage={usageWithoutInstalls()} now={NOW}/>);

        expect(screen.queryByTestId('usage-active-servers')).toBeNull();
        expect(screen.getByTestId('usage-last-reported').textContent).toBe('Last reported in use 2 days ago');
        expect(screen.getByTestId('usage-starts').textContent).toBe('412 server starts in the last 30 days');
        const versions = screen.getByTestId('usage-versions');
        expect(versions.getAttribute('data-basis')).toBe('starts');
        expect(versions.textContent).toContain('share of server starts');
        expect(versions.textContent).toContain('73% · 300 starts');
        expect(container.textContent).not.toMatch(/install|active server/i);
    });

    it('attributes the figures to trace, links how it works, and says CI is excluded', () => {
        render(<UsagePanel usage={usageWithoutInstalls()} now={NOW}/>);

        const link = screen.getByRole('link', {name: /how it works/});
        expect(link.getAttribute('href')).toBe('https://github.com/Stephenson-Software/trace#usage-reporting');
        expect(screen.getByTestId('trace-attribution').textContent).toContain('CI and test servers are excluded');
        expect(screen.getByRole('link', {name: 'Usage of every plugin'}).getAttribute('href')).toBe('/usage');
    });

    it('describes the 30-day sparkline in words for screen readers', () => {
        render(<UsagePanel usage={usageWithoutInstalls()} now={NOW}/>);

        const chart = screen.getByRole('img');
        expect(chart.getAttribute('aria-label')).toMatch(/^Server starts per day from Sep 4 to Oct 3: \d+ in total, peaking at 7 on /);
    });
});
