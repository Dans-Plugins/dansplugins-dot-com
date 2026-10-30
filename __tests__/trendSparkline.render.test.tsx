// @vitest-environment jsdom
//
// Renders one trend line directly, to pin what its accessible name and
// visible words say at the edges UsagePanel's fixtures never reach: no
// starts, a tie for the peak, one day, a day trace sent that is not a date,
// and the compact /usage variant.
import {afterEach, describe, expect, it} from 'vitest';
import {cleanup, render, screen} from '@testing-library/react';
import TrendSparkline from '../components/TrendSparkline';
import {usageTrends, type Trend} from '../utils/usageTrends';
import type {DailyStarts} from '../utils/traceUsage';
import {usageWithDailyServers, usageWithoutInstalls} from './fixtures/traceUsage';

afterEach(cleanup);

// Read well after the days, so none of them is today.
const LATER = Date.parse('2026-11-01T00:00:00Z');

const days = (...startups: number[]): DailyStarts[] =>
    startups.map((n, i) => ({day: `2026-10-0${i + 1}`, startups: n}));

const startsTrend = (d: DailyStarts[]): Trend => {
    const trend = usageTrends({...usageWithoutInstalls(), startups30d: 1, days: d}, LATER).starts;
    if (!trend) throw new Error('expected a starts trend');
    return trend;
};

const linePath = (container: HTMLElement): string | null =>
    container.querySelectorAll('path')[1].getAttribute('d');

describe('TrendSparkline', () => {
    it('names the range, the total, the first of two equal peaks and the change', () => {
        render(<TrendSparkline trend={startsTrend(days(3, 7, 7, 2))}/>);

        expect(screen.getByRole('img').getAttribute('aria-label'))
            .toBe('Server starts per day from Oct 1 to Oct 4: 19 in total, peaking at 7 on Oct 2. Down 10%: last 2 days vs the 2 before.');
        expect(screen.getByTestId('trend-starts').textContent)
            .toBe('Oct 1Peak 7 on Oct 2Oct 4Down 10%: last 2 days vs the 2 before');
        expect(screen.getByTestId('trend-starts').getAttribute('data-direction')).toBe('down');
    });

    it('claims no peak and draws a flat line along the bottom when no server started', () => {
        const {container} = render(<TrendSparkline trend={startsTrend(days(0, 0))}/>);

        expect(screen.getByRole('img').getAttribute('aria-label'))
            .toBe('Server starts per day from Oct 1 to Oct 2: 0 in total.');
        expect(screen.getByTestId('trend-starts').textContent).toBe('Oct 1Oct 2');
        expect(linePath(container)).toBe('M0.0,46.0 L300.0,46.0');
    });

    it('draws a single day as one point at the top, claiming no change', () => {
        const {container} = render(<TrendSparkline trend={startsTrend(days(5))}/>);

        expect(screen.getByRole('img').getAttribute('aria-label'))
            .toBe('Server starts per day from Oct 1 to Oct 1: 5 in total, peaking at 5 on Oct 1.');
        expect(linePath(container)).toBe('M0.0,2.0');
        expect(screen.queryByTestId('trend-starts-change')).toBeNull();
        expect(screen.getByTestId('trend-starts').getAttribute('data-direction')).toBe('none');
    });

    it('groups thousands in the accessible name and the peak label', () => {
        render(<TrendSparkline trend={startsTrend(days(1234, 1000))}/>);

        expect(screen.getByRole('img').getAttribute('aria-label'))
            .toBe('Server starts per day from Oct 1 to Oct 2: 2,234 in total, peaking at 1,234 on Oct 1.');
        expect(screen.getByTestId('trend-starts').textContent).toContain('Peak 1,234 on Oct 1');
    });

    it('shows a day that is not a date as trace sent it', () => {
        render(<TrendSparkline trend={startsTrend([{day: 'not-a-date', startups: 4}])}/>);

        expect(screen.getByRole('img').getAttribute('aria-label'))
            .toBe('Server starts per day from not-a-date to not-a-date: 4 in total, peaking at 4 on not-a-date.');
    });

    it('compact: one short caption, the full description kept in the accessible name', () => {
        render(<TrendSparkline trend={startsTrend(days(3, 7, 7, 2))} variant="compact" height={28}/>);

        expect(screen.getByTestId('trend-starts').textContent).toBe('Starts/day: down 10%');
        expect(screen.getByRole('img').getAttribute('aria-label')).toMatch(/^Server starts per day from Oct 1 to Oct 4: 19 in total/);
        expect(screen.getByRole('img').getAttribute('height')).toBe('28');
    });

    it('sizes the drawing to the height it is given', () => {
        const {container} = render(<TrendSparkline trend={startsTrend(days(0, 4))} height={20}/>);

        const svg = screen.getByRole('img');
        expect(svg.getAttribute('height')).toBe('20');
        expect(svg.getAttribute('viewBox')).toBe('0 0 300 20');
        expect(linePath(container)).toBe('M0.0,18.0 L300.0,2.0');
    });

    it('draws servers in the primary colour and starts in the secondary text colour', () => {
        const trends = usageTrends(usageWithDailyServers(), LATER);
        render(<><TrendSparkline trend={trends.servers!}/><TrendSparkline trend={trends.starts!}/></>);

        expect(screen.getByTestId('trend-servers').textContent).toContain('Up 50%');
        const [servers, starts] = screen.getAllByRole('img').map((svg) => svg.parentElement!);
        expect(servers.className).not.toBe(starts.className);
    });
});
