// How trace's usage figures are put into words. Pure functions, so the
// labelling rules — the reason this exists — are pinned by unit tests.
//
// The rules (from a 2026-10-03 audit that found raw event counts misleading,
// and a 2026-10 flood of one third-party server's command events):
//  - Servers lead. A raw event count is never called "installs" or
//    "servers". "Active servers" appears only when trace counted distinct
//    servers (activeInstalls30d is a number); "servers seen in the past year"
//    only when trace's summary counted them (its `installs`).
//  - Every server figure is a floor: only plugin versions on a newer trace
//    client send a server ID, so each view says so (SERVERS_COUNTED_NOTE).
//  - Without a server count the plugin gets "Last reported in use <when>".
//    Starts in the last 30 days are secondary text, labelled as starts.
//  - Version adoption is a share of active servers when trace has per-version
//    server counts, and a share of starts — labelled so — when it does not.

import {relativeTimeFrom} from './relativeTime';
import type {ProgramUsage} from './traceUsage';
import {windowStarts} from './usageTrends';

/** Where the figures come from and how they are collected; every usage view links it. */
export const TRACE_HOW_IT_WORKS_URL = 'https://danielstephenson.dev/usage-reporting';

/** How many versions get a bar of their own before the rest are grouped as "Other versions". */
export const TOP_VERSIONS = 5;

const plural = (n: number, one: string, many: string): string => `${n.toLocaleString('en-US')} ${n === 1 ? one : many}`;

/** Shown wherever a server count is: why the figure can be lower than the real number. */
export const SERVERS_COUNTED_NOTE =
    'Servers are counted only from newer plugin versions, which send a per-server ID; '
    + 'servers on older versions are not counted, so the real number can be higher.';

export const startsLabel = (starts: number): string =>
    `${plural(starts, 'server start', 'server starts')} in the last 30 days`;

export interface UsageHeadline {
    // Distinct servers seen in the last 30 days, or null when trace cannot count servers yet.
    activeServers: number | null;
    // "Last reported in use 3 days ago"; null when the plugin has never reported.
    lastReported: string | null;
    // "412 server starts in the last 30 days"; null when there were none.
    starts: string | null;
}

export function usageHeadline(usage: ProgramUsage, now: number): UsageHeadline {
    const activeServers = typeof usage.activeInstalls30d === 'number' ? usage.activeInstalls30d : null;
    const when = usage.lastSeen ? relativeTimeFrom(usage.lastSeen, now) : '';
    return {
        activeServers,
        lastReported: when ? `Last reported in use ${when}` : null,
        // Coalesced starts count as the starts they stand for (startupUses30d).
        starts: windowStarts(usage) > 0 ? startsLabel(windowStarts(usage)) : null,
    };
}

export const activeServersLabel = (n: number): string => plural(n, 'active server', 'active servers');

export const serversSeenLabel = (n: number): string =>
    `${plural(n, 'server', 'servers')} seen in the past year`;

export interface VersionShareRow {
    label: string;
    count: number;
    // 0..1, of the total across every row (including "Other versions").
    share: number;
}

export interface VersionShares {
    basis: 'servers' | 'starts';
    heading: string;
    // What `count` counts, for the visible "41 servers" / "300 starts" text.
    unit: (n: number) => string;
    rows: VersionShareRow[];
}

/**
 * Version adoption, largest first, the top five and then everything else as
 * one "Other versions" row. Null when there is nothing to divide up.
 */
export function versionShares(usage: ProgramUsage): VersionShares | null {
    // Server counts per version only mean something once the plugin sends a
    // server ID, which is exactly when the headline figure exists too.
    const byServers = typeof usage.activeInstalls30d === 'number'
        && usage.versions.some((v) => typeof v.installs === 'number');
    const counted = usage.versions
        .map((v) => ({
            label: v.version ?? 'Unknown version',
            count: byServers ? (v.installs ?? 0) : v.startups,
        }))
        .filter((row) => row.count > 0)
        .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
    const total = counted.reduce((sum, row) => sum + row.count, 0);
    if (total === 0) {
        return null;
    }
    const top = counted.slice(0, TOP_VERSIONS);
    const rest = counted.slice(TOP_VERSIONS).reduce((sum, row) => sum + row.count, 0);
    const rows = rest > 0 ? [...top, {label: 'Other versions', count: rest}] : top;
    return {
        basis: byServers ? 'servers' : 'starts',
        heading: byServers ? 'Versions in use, by share of active servers' : 'Versions in use, by share of server starts',
        unit: byServers ? (n) => plural(n, 'server', 'servers') : (n) => plural(n, 'start', 'starts'),
        rows: rows.map((row) => ({...row, share: row.count / total})),
    };
}

/** "72%", or "<1%" for a sliver that would otherwise round to a misleading 0%. */
export const percentLabel = (share: number): string =>
    share > 0 && share < 0.005 ? '<1%' : `${Math.round(share * 100)}%`;

export interface RankableUsage {
    slug: string;
    title: string;
    usage: ProgramUsage | null;
    // Distinct servers over the past year, from trace's summary; null or absent when not counted.
    serversYear?: number | null;
}

/**
 * The /usage page's order: plugins with an active-server count first (most
 * first), then by servers seen in the past year, then the rest by how
 * recently they were last reported in use, then plugins trace has nothing
 * for, alphabetically. Never by raw starts.
 */
export function rankUsage<T extends RankableUsage>(rows: readonly T[]): T[] {
    const servers = (r: T) => (typeof r.usage?.activeInstalls30d === 'number' ? r.usage.activeInstalls30d : null);
    const year = (r: T) => (typeof r.serversYear === 'number' ? r.serversYear : null);
    const seen = (r: T) => {
        const t = r.usage?.lastSeen ? new Date(r.usage.lastSeen).getTime() : NaN;
        return Number.isNaN(t) ? null : t;
    };
    return [...rows].sort((a, b) => {
        const sa = servers(a);
        const sb = servers(b);
        if (sa !== null || sb !== null) {
            if (sa === null) return 1;
            if (sb === null) return -1;
            if (sa !== sb) return sb - sa;
        }
        const ya = year(a);
        const yb = year(b);
        if (ya !== null || yb !== null) {
            if (ya === null) return 1;
            if (yb === null) return -1;
            if (ya !== yb) return yb - ya;
        }
        const ta = seen(a);
        const tb = seen(b);
        if (ta !== null || tb !== null) {
            if (ta === null) return 1;
            if (tb === null) return -1;
            if (ta !== tb) return tb - ta;
        }
        return a.title.localeCompare(b.title);
    });
}
