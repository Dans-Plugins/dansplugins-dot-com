// Per-day trends for a plugin's usage, shaped from the `days` series of
// trace's /api/public/programs/{name}. Pure functions, so what each chart and
// its words claim is pinned by unit tests (__tests__/usageTrends.test.ts).
//
// Two series, servers first (the same rule as utils/usageDisplay.ts):
//  - servers: distinct servers per day. trace does not serve a per-day server
//    count yet, so this is null today; it draws only when at least two days
//    carry one, and only for a plugin trace counts servers for at all.
//  - starts: server starts per day, counting a coalesced event as the starts
//    it stands for (`startupUses`), falling back to the raw `startups` for a
//    day without it. Null when there were no starts in the window, as before.
//
// The change in words compares the most recent complete days with as many
// days before them. Today's partial day (trace's window runs to now) is left
// out of that comparison, so a chart read at breakfast does not say "down".

import type {DailyStarts, ProgramUsage} from './traceUsage';

export interface TrendPoint {
    day: string;
    value: number;
}

export type TrendDirection = 'up' | 'down' | 'steady' | 'new' | 'gone';

export interface TrendChange {
    direction: TrendDirection;
    // Whole percent, for 'up' and 'down' only.
    percent: number | null;
    // How many days each side of the comparison spans.
    spanDays: number;
}

export interface Trend {
    kind: 'servers' | 'starts';
    // Visible heading and the start of the accessible name: "Server starts per day".
    heading: string;
    // Short name for the compact /usage row: "Starts".
    shortName: string;
    points: TrendPoint[];
    peak: TrendPoint;
    // Null when the window is too short to compare.
    change: TrendChange | null;
    // "Up 24%: last 14 days vs the 14 before"; null with no change.
    changeLabel: string | null;
    // Everything the chart shows, in words, for its accessible name.
    summary: string;
}

export interface UsageTrends {
    servers: Trend | null;
    starts: Trend | null;
}

/** Below this relative change either way, the trend reads "Steady". */
export const STEADY_THRESHOLD = 0.1;

/** Fewer complete days than this (two on each side) and no change is claimed. */
export const MIN_DAYS_TO_COMPARE = 4;

const num = (n: number): string => n.toLocaleString('en-US');

// Month and day, pinned to en-US and UTC like utils/relativeTime.ts so the
// server-rendered text matches hydration. trace's days are UTC calendar days.
export const shortDay = (day: string): string => {
    const date = new Date(`${day}T00:00:00Z`);
    return Number.isNaN(date.getTime())
        ? day
        : date.toLocaleDateString('en-US', {month: 'short', day: 'numeric', timeZone: 'UTC'});
};

const utcDay = (now: number): string => new Date(now).toISOString().slice(0, 10);

const mean = (points: TrendPoint[]): number => points.reduce((sum, p) => sum + p.value, 0) / points.length;

/**
 * How the most recent complete days compare with as many days before them.
 * Null when there are too few complete days to say.
 */
export function trendChange(points: TrendPoint[], now: number): TrendChange | null {
    const today = utcDay(now);
    const complete = points.length > 0 && points[points.length - 1].day === today ? points.slice(0, -1) : points;
    if (complete.length < MIN_DAYS_TO_COMPARE) {
        return null;
    }
    const spanDays = Math.floor(complete.length / 2);
    const before = mean(complete.slice(complete.length - 2 * spanDays, complete.length - spanDays));
    const recent = mean(complete.slice(complete.length - spanDays));
    if (before === 0) {
        return {direction: recent === 0 ? 'steady' : 'new', percent: null, spanDays};
    }
    if (recent === 0) {
        return {direction: 'gone', percent: null, spanDays};
    }
    const ratio = (recent - before) / before;
    if (Math.abs(ratio) < STEADY_THRESHOLD) {
        return {direction: 'steady', percent: null, spanDays};
    }
    return {direction: ratio > 0 ? 'up' : 'down', percent: Math.round(Math.abs(ratio) * 100), spanDays};
}

export function changeLabel(change: TrendChange | null): string | null {
    if (!change) {
        return null;
    }
    const span = `last ${change.spanDays} days vs the ${change.spanDays} before`;
    switch (change.direction) {
        case 'up':
            return `Up ${change.percent}%: ${span}`;
        case 'down':
            return `Down ${change.percent}%: ${span}`;
        case 'new':
            return `Up from none: ${span}`;
        case 'gone':
            return `Down to none: ${span}`;
        default:
            return `Steady: ${span}`;
    }
}

const peakOf = (points: TrendPoint[]): TrendPoint =>
    points.reduce((best, p) => (p.value > best.value ? p : best), points[0]);

function buildTrend(kind: Trend['kind'], points: TrendPoint[], now: number): Trend {
    const heading = kind === 'servers' ? 'Active servers per day' : 'Server starts per day';
    const peak = peakOf(points);
    const change = trendChange(points, now);
    const label = changeLabel(change);
    const range = `${heading} from ${shortDay(points[0].day)} to ${shortDay(points[points.length - 1].day)}`;
    // A day's distinct servers do not add up across days, so servers get no total.
    const total = kind === 'starts' ? `: ${num(points.reduce((sum, p) => sum + p.value, 0))} in total` : '';
    const peakText = peak.value > 0 ? `${total ? ', ' : ': '}peaking at ${num(peak.value)} on ${shortDay(peak.day)}` : '';
    const summary = `${range}${total}${peakText}.` + (label ? ` ${label}.` : '');
    return {
        kind,
        heading,
        shortName: kind === 'servers' ? 'Servers' : 'Starts',
        points,
        peak,
        change,
        changeLabel: label,
        summary,
    };
}

/** A day's starts, coalesced events expanded where trace says how many. */
export const dayStarts = (day: DailyStarts): number =>
    typeof day.startupUses === 'number' ? day.startupUses : day.startups;

/** Starts in the window, coalesced events expanded where trace says how many. */
export const windowStarts = (usage: ProgramUsage): number =>
    typeof usage.startupUses30d === 'number' ? usage.startupUses30d : usage.startups30d;

/** The servers and starts trends for one plugin; either is null when there is nothing honest to draw. */
export function usageTrends(usage: ProgramUsage, now: number): UsageTrends {
    const days = usage.days;
    const serverPoints: TrendPoint[] = typeof usage.activeInstalls30d === 'number'
        ? days.flatMap((d) => (typeof d.installs === 'number' ? [{day: d.day, value: d.installs}] : []))
        : [];
    const startPoints: TrendPoint[] = days.map((d) => ({day: d.day, value: dayStarts(d)}));
    const anyStarts = windowStarts(usage) > 0 || startPoints.some((p) => p.value > 0);
    return {
        servers: serverPoints.length >= 2 ? buildTrend('servers', serverPoints, now) : null,
        starts: anyStarts && startPoints.length > 0 ? buildTrend('starts', startPoints, now) : null,
    };
}

/** The change in a few words, for the compact /usage row: "up 24%", "steady". */
export function changeShort(change: TrendChange | null): string | null {
    if (!change) {
        return null;
    }
    switch (change.direction) {
        case 'up':
            return `up ${change.percent}%`;
        case 'down':
            return `down ${change.percent}%`;
        case 'new':
            return 'up from none';
        case 'gone':
            return 'down to none';
        default:
            return 'steady';
    }
}
