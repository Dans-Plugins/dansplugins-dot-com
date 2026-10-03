/**
 * Plugin usage as trace (https://github.com/Stephenson-Software/trace) reports
 * it, read from trace's public, unauthenticated endpoints:
 *
 *   GET /api/public/programs/{name}  one program's last 30 days
 *   GET /api/public/summary          every program's name and last-seen time
 *
 * The per-program figures exclude CI, test-server, service and page-view
 * events, so they describe real servers. They are still *starts*, not
 * servers, until a plugin ships a trace client that sends a per-server ID:
 * until then `activeInstalls30d` and each version's `installs` are null, and
 * the display logic in utils/usageDisplay.ts must not present starts as
 * servers.
 *
 * Same contract as utils/bstats.ts: server side only, every request bounded
 * by a timeout, results cached per process, and every failure — including a
 * 404 from a trace that has not deployed the endpoint yet — resolves to
 * undefined so the page degrades instead of failing.
 */

/** The trace server. Overridable for local testing against a stub (CONFIG.md). */
export const traceBaseUrl = (): string =>
    (process.env.TRACE_PUBLIC_URL || 'https://trace.danielstephenson.dev').replace(/\/+$/, '');

/** How long one trace request may take before it is abandoned (as for bStats). */
export const TRACE_TIMEOUT_MS = 3_000;

/** How long a fetched answer — or a failure — is served before trace is asked again. */
export const TRACE_CACHE_TTL_MS = 10 * 60 * 1_000;

export interface VersionUsage {
    // null for starts that did not say which version they were.
    version: string | null;
    // Distinct servers on this version; null until the plugin sends server IDs.
    installs: number | null;
    startups: number;
}

export interface DailyStarts {
    day: string;
    startups: number;
}

export interface ProgramUsage {
    application: string;
    lastSeen: string | null;
    window: string;
    startups30d: number;
    activeInstalls30d: number | null;
    versions: VersionUsage[];
    days: DailyStarts[];
}

export interface SummaryRow {
    application: string;
    lastSeen: string | null;
}

type Entry<T> = { value: T | undefined; fetchedAt: number };

// Module-level, one per server process. Usage changes slowly and is
// informational, so ten minutes is fine. Unlike bStats, a miss is cached too:
// before trace deploys the endpoint every program 404s, and while trace is
// down each request would otherwise cost the full timeout on every render.
// A last good answer still beats a later failure ("stale beats blank").
const programCache = new Map<string, Entry<ProgramUsage>>();
let summaryCache: Entry<SummaryRow[]> | null = null;

/** Test hook: forget everything fetched. */
export function clearTraceUsageCache(): void {
    programCache.clear();
    summaryCache = null;
}

const isCount = (value: unknown): value is number =>
    typeof value === 'number' && Number.isFinite(value) && value >= 0;

const isCountOrNull = (value: unknown): value is number | null => value === null || isCount(value);

const isDateOrNull = (value: unknown): value is string | null =>
    value === null || (typeof value === 'string' && !Number.isNaN(new Date(value).getTime()));

/** Validates a per-program payload; undefined for anything that is not the documented shape. */
export function parseProgramUsage(body: unknown): ProgramUsage | undefined {
    if (!body || typeof body !== 'object') {
        return undefined;
    }
    const b = body as Record<string, unknown>;
    if (typeof b.application !== 'string' || !isDateOrNull(b.lastSeen ?? null) || !isCount(b.startups30d)
        || !isCountOrNull(b.activeInstalls30d ?? null) || !Array.isArray(b.versions) || !Array.isArray(b.days)) {
        return undefined;
    }
    const versions: VersionUsage[] = [];
    for (const row of b.versions) {
        if (!row || typeof row !== 'object') {
            return undefined;
        }
        const r = row as Record<string, unknown>;
        const version = r.version ?? null;
        if ((version !== null && typeof version !== 'string') || !isCountOrNull(r.installs ?? null) || !isCount(r.startups)) {
            return undefined;
        }
        versions.push({version, installs: (r.installs ?? null) as number | null, startups: r.startups});
    }
    const days: DailyStarts[] = [];
    for (const row of b.days) {
        if (!row || typeof row !== 'object') {
            return undefined;
        }
        const r = row as Record<string, unknown>;
        if (typeof r.day !== 'string' || !isCount(r.startups)) {
            return undefined;
        }
        days.push({day: r.day, startups: r.startups});
    }
    return {
        application: b.application,
        lastSeen: (b.lastSeen ?? null) as string | null,
        window: typeof b.window === 'string' ? b.window : 'P30D',
        startups30d: b.startups30d,
        activeInstalls30d: (b.activeInstalls30d ?? null) as number | null,
        versions,
        days,
    };
}

/** Validates the summary payload, keeping only the name and last-seen time (never the raw count). */
export function parseSummary(body: unknown): SummaryRow[] | undefined {
    if (!Array.isArray(body)) {
        return undefined;
    }
    return body
        .filter((row): row is Record<string, unknown> =>
            !!row && typeof row === 'object' && typeof (row as Record<string, unknown>).application === 'string')
        .map((row) => ({
            application: row.application as string,
            lastSeen: isDateOrNull(row.lastSeen ?? null) ? (row.lastSeen ?? null) as string | null : null,
        }));
}

async function fetchJson<T>(path: string, parse: (body: unknown) => T | undefined): Promise<T | undefined> {
    const url = traceBaseUrl() + path;
    try {
        const response = await fetch(url, {signal: AbortSignal.timeout(TRACE_TIMEOUT_MS)});
        if (!response.ok) {
            // A 404 is expected until trace deploys the endpoint, and for a
            // program that has never reported; neither is worth a log line.
            if (response.status !== 404) {
                console.error(`Error fetching ${url}: HTTP ${response.status} ${response.statusText}`);
            }
            return undefined;
        }
        const parsed = parse(await response.json());
        if (parsed === undefined) {
            console.error(`Error fetching ${url}: unexpected response shape`);
        }
        return parsed;
    } catch (error) {
        console.error(`Error fetching ${url}:`, error);
        return undefined;
    }
}

async function cached<T>(
    current: Entry<T> | null | undefined,
    store: (entry: Entry<T>) => void,
    fetcher: () => Promise<T | undefined>
): Promise<T | undefined> {
    if (current && Date.now() - current.fetchedAt < TRACE_CACHE_TTL_MS) {
        return current.value;
    }
    const fresh = await fetcher();
    // Stale beats blank: a failure keeps the last good answer (re-stamped so
    // the next render does not pay the timeout again).
    const value = fresh !== undefined ? fresh : current?.value;
    store({value, fetchedAt: Date.now()});
    return value;
}

/** One program's last 30 days, or undefined when trace has nothing to say (yet). */
export function getProgramUsage(traceName: string): Promise<ProgramUsage | undefined> {
    return cached(
        programCache.get(traceName),
        (entry) => programCache.set(traceName, entry),
        () => fetchJson('/api/public/programs/' + encodeURIComponent(traceName), parseProgramUsage)
    );
}

/** Every program trace knows, with its last-seen time; undefined when unreachable. */
export function getUsageSummary(): Promise<SummaryRow[] | undefined> {
    return cached(
        summaryCache,
        (entry) => { summaryCache = entry; },
        () => fetchJson('/api/public/summary', parseSummary)
    );
}
