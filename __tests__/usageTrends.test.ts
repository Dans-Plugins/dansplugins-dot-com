// Pins how trace's per-day series become the servers and starts trends, and
// what their words may claim.
import {describe, expect, it} from 'vitest';
import {
    changeLabel,
    changeShort,
    dayStarts,
    trendChange,
    usageTrends,
    windowStarts,
    type TrendPoint
} from '../utils/usageTrends';
import type {ProgramUsage} from '../utils/traceUsage';
import {thirtyDays, usageWithDailyServers, usageWithInstalls, usageWithoutInstalls} from './fixtures/traceUsage';

// The fixtures' 30 days run Sep 4 – Oct 3, 2026; this clock is on Oct 3, so
// Oct 3 is today and still under way.
const TODAY = Date.parse('2026-10-03T16:00:00Z');
const LATER = Date.parse('2026-10-10T00:00:00Z');

const series = (...values: number[]): TrendPoint[] =>
    values.map((value, i) => ({day: `2026-09-${String(i + 1).padStart(2, '0')}`, value}));

describe('dayStarts and windowStarts', () => {
    it('count coalesced starts when trace sends uses, and fall back to raw starts when it does not', () => {
        expect(dayStarts({day: '2026-10-01', startups: 3, startupUses: 9})).toBe(9);
        expect(dayStarts({day: '2026-10-01', startups: 3})).toBe(3);
        expect(windowStarts({...usageWithInstalls(), startupUses30d: 500})).toBe(500);
        expect(windowStarts(usageWithInstalls())).toBe(412);
    });
});

describe('trendChange', () => {
    it('compares the later half of the complete days with the earlier half', () => {
        expect(trendChange(series(10, 10, 12, 12), LATER)).toEqual({direction: 'up', percent: 20, spanDays: 2});
        expect(trendChange(series(10, 10, 5, 5), LATER)).toEqual({direction: 'down', percent: 50, spanDays: 2});
    });

    it('calls a change under 10% either way steady', () => {
        expect(trendChange(series(100, 100, 109, 109), LATER)?.direction).toBe('steady');
        expect(trendChange(series(100, 100, 91, 91), LATER)?.direction).toBe('steady');
        expect(trendChange(series(0, 0, 0, 0), LATER)?.direction).toBe('steady');
    });

    it('says up from none and down to none rather than an infinite or -100% change', () => {
        expect(trendChange(series(0, 0, 3, 1), LATER)).toEqual({direction: 'new', percent: null, spanDays: 2});
        expect(trendChange(series(4, 2, 0, 0), LATER)).toEqual({direction: 'gone', percent: null, spanDays: 2});
    });

    it('drops the oldest day of an odd count so both sides span the same, adjacent days', () => {
        // (99) | 10, 10 | 20, 20
        expect(trendChange(series(99, 10, 10, 20, 20), LATER)).toEqual({direction: 'up', percent: 100, spanDays: 2});
    });

    it('leaves today, still under way, out of the comparison', () => {
        const points = series(10, 10, 10, 10, 1);
        const today = Date.parse(`${points[4].day}T09:00:00Z`);
        expect(trendChange(points, today)).toEqual({direction: 'steady', percent: null, spanDays: 2});
        // The same series read a day later counts the last day in full.
        expect(trendChange(points, LATER)?.direction).toBe('down');
    });

    it('claims nothing with fewer than four complete days', () => {
        expect(trendChange(series(1, 2, 3), LATER)).toBeNull();
        expect(trendChange([], LATER)).toBeNull();
        const points = series(1, 2, 3, 4);
        expect(trendChange(points, Date.parse(`${points[3].day}T12:00:00Z`))).toBeNull();
    });
});

describe('changeLabel and changeShort', () => {
    it('put each direction in words, with the span compared', () => {
        expect(changeLabel({direction: 'up', percent: 24, spanDays: 14})).toBe('Up 24%: last 14 days vs the 14 before');
        expect(changeLabel({direction: 'down', percent: 5, spanDays: 14})).toBe('Down 5%: last 14 days vs the 14 before');
        expect(changeLabel({direction: 'steady', percent: null, spanDays: 2})).toBe('Steady: last 2 days vs the 2 before');
        expect(changeLabel({direction: 'new', percent: null, spanDays: 2})).toBe('Up from none: last 2 days vs the 2 before');
        expect(changeLabel({direction: 'gone', percent: null, spanDays: 2})).toBe('Down to none: last 2 days vs the 2 before');
        expect(changeLabel(null)).toBeNull();
        expect(changeShort({direction: 'up', percent: 24, spanDays: 14})).toBe('up 24%');
        expect(changeShort({direction: 'steady', percent: null, spanDays: 14})).toBe('steady');
        expect(changeShort(null)).toBeNull();
    });
});

describe('usageTrends', () => {
    it('draws only starts for trace as it is today, which serves no per-day server count', () => {
        const trends = usageTrends(usageWithInstalls(), TODAY);
        expect(trends.servers).toBeNull();
        expect(trends.starts?.kind).toBe('starts');
        expect(trends.starts?.points).toHaveLength(30);
        expect(trends.starts?.points[0]).toEqual({day: '2026-09-04', value: 1});
    });

    it('draws starts from each day\'s uses where trace sends them', () => {
        const trends = usageTrends(usageWithDailyServers(), LATER);
        expect(trends.starts?.points[29].value).toBe(usageWithDailyServers().days[29].startups + 18);
    });

    it('draws servers, first and without a total, once trace sends a per-day server count', () => {
        const trends = usageTrends(usageWithDailyServers(), TODAY);
        expect(trends.servers?.points).toHaveLength(30);
        expect(trends.servers?.heading).toBe('Active servers per day');
        // 29 complete days: days 15–28 (30 servers) against days 1–14 (20 servers).
        expect(trends.servers?.change).toEqual({direction: 'up', percent: 50, spanDays: 14});
        expect(trends.servers?.summary).toBe(
            'Active servers per day from Sep 4 to Oct 3: peaking at 30 on Sep 19. Up 50%: last 14 days vs the 14 before.');
    });

    it('never draws servers for a plugin trace counts no servers for, whatever the days say', () => {
        const usage: ProgramUsage = {...usageWithDailyServers(), activeInstalls30d: null};
        expect(usageTrends(usage, TODAY).servers).toBeNull();
    });

    it('needs two days with a server count to draw a servers line', () => {
        const days = thirtyDays().map((d, i) => ({...d, installs: i === 0 ? 4 : null}));
        expect(usageTrends({...usageWithInstalls(), days}, TODAY).servers).toBeNull();
    });

    it('draws no starts line when nothing started in the window', () => {
        const quiet: ProgramUsage = {...usageWithoutInstalls(), startups30d: 0, days: thirtyDays(() => 0)};
        expect(usageTrends(quiet, TODAY).starts).toBeNull();
        expect(usageTrends({...usageWithoutInstalls(), days: []}, TODAY).starts).toBeNull();
    });

    it('describes the starts line in words: range, total, peak and change', () => {
        const usage: ProgramUsage = {...usageWithoutInstalls(), days: thirtyDays((i) => (i < 15 ? 10 : 20))};
        expect(usageTrends(usage, TODAY).starts?.summary).toBe(
            'Server starts per day from Sep 4 to Oct 3: 450 in total, peaking at 20 on Sep 19. '
            + 'Up 100%: last 14 days vs the 14 before.');
    });
});
