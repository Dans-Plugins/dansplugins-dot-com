/**
 * Plugin usage as trace (https://github.com/Stephenson-Software/trace) reports
 * it, read from trace's public, unauthenticated endpoints:
 *
 *   GET /api/public/programs/{name}  one program's last 30 days, with a
 *                                    per-day series (utils/usageTrends.ts)
 *   GET /api/public/summary          every program's name, last-seen time and,
 *                                    once trace counts them, distinct servers
 *
 * The per-program figures exclude CI, test-server, service and page-view
 * events, so they describe real servers. They are still *starts*, not
 * servers, until a plugin ships a trace client that sends a per-server ID:
 * until then `activeInstalls30d` and each version's `installs` are null, and
 * the display logic in utils/usageDisplay.ts must not present starts as
 * servers.
 *
 * Same contract as utils/bstats.ts: server side only, every render bounded
 * by a time budget, results cached per process, and every failure — including
 * a 404 from a trace that has not deployed the endpoint yet — resolves to
 * undefined so the page degrades instead of failing.
 *
 * Unlike bStats, a render never waits for trace beyond TRACE_TIMEOUT_MS, yet a
 * slow trace still gets through: the request itself runs in the background
 * with the much longer TRACE_REFRESH_TIMEOUT_MS, at most one per endpoint at a
 * time, and stores its answer for the next render (stale-while-revalidate).
 */

/** The trace server. Overridable for local testing against a stub (CONFIG.md). */
export const traceBaseUrl = (): string =>
    (process.env.TRACE_PUBLIC_URL || 'https://trace.danielstephenson.dev').replace(/\/+$/, '');

/** How long a render waits for trace before it carries on with what is cached (as for bStats). */
export const TRACE_TIMEOUT_MS = 3_000;

/**
 * How long one trace request may take before it is abandoned. It runs in the
 * background, so it can be far longer than a render's budget: trace's summary
 * has been seen taking 17–20 s.
 */
export const TRACE_REFRESH_TIMEOUT_MS = 30_000;

/** How long an answer from trace (including a 404) is served before trace is asked again. */
export const TRACE_CACHE_TTL_MS = 10 * 60 * 1_000;

/** How long after a failed request (error, timeout, bad body) trace is asked again. */
export const TRACE_RETRY_MS = 60 * 1_000;

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
    // The same starts with a coalesced event counted as the starts it stands
    // for (trace-client 0.7.0+); equal to `startups` until a plugin ships it.
    // Absent from a trace that does not serve it — read it through
    // utils/usageTrends.ts, which falls back to `startups`.
    startupUses?: number;
    // Distinct servers that reported that day. trace does not serve a per-day
    // server count yet; kept if it ever does, so the servers trend can draw.
    // Absent (not null) when not sent; null when sent as "not counted".
    installs?: number | null;
}

export interface ProgramUsage {
    application: string;
    lastSeen: string | null;
    window: string;
    startups30d: number;
    // startups30d with coalesced events expanded; absent from an older trace.
    startupUses30d?: number;
    activeInstalls30d: number | null;
    versions: VersionUsage[];
    days: DailyStarts[];
}

export interface SummaryRow {
    application: string;
    lastSeen: string | null;
    // Distinct servers trace has seen over roughly the last year, counted only
    // from trace clients new enough to send a per-server ID (`install` tag).
    // Null when trace does not send it (before it deployed the field) or when
    // the value is not a count.
    installs: number | null;
}

// `answered` is false when the last request failed (as opposed to trace
// answering, 404 included), so it is retried after TRACE_RETRY_MS rather than
// TRACE_CACHE_TTL_MS. `value` is the last good answer either way.
type Entry = {value: unknown; fetchedAt: number; answered: boolean};

// One per server process. `next build` bundles each page separately, each with
// its own copy of this module, so the cache and the in-flight requests are
// kept on globalThis: /usage and the plugin pages share one memory of trace.
// Usage changes slowly and is informational, so ten minutes is fine. A miss
// is cached too: before trace deploys the endpoint every program 404s, and
// while trace is down each render would otherwise start another request. A
// last good answer still beats a later failure ("stale beats blank").
interface TraceUsageState {
    cache: Map<string, Entry>;
    inFlight: Map<string, Promise<unknown>>;
    // Bumped by clearTraceUsageCache, so a request started before a clear
    // does not write into the cleared cache when it finishes.
    generation: number;
}

const STATE_KEY = Symbol.for('dansplugins.traceUsage');
const globalStore = globalThis as typeof globalThis & {[STATE_KEY]?: TraceUsageState};
const state: TraceUsageState = globalStore[STATE_KEY] ??= {cache: new Map(), inFlight: new Map(), generation: 0};

/** Test hook: forget everything fetched, and any request still running. */
export function clearTraceUsageCache(): void {
    state.cache.clear();
    state.inFlight.clear();
    state.generation += 1;
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
        // The optional fields are only copied when they are counts, and are
        // left out (never set to undefined, which Next cannot serialize) when not.
        const day: DailyStarts = {day: r.day, startups: r.startups};
        if (isCount(r.startupUses)) {
            day.startupUses = r.startupUses;
        }
        if (r.installs !== undefined && isCountOrNull(r.installs)) {
            day.installs = r.installs;
        }
        days.push(day);
    }
    return {
        application: b.application,
        lastSeen: (b.lastSeen ?? null) as string | null,
        window: typeof b.window === 'string' ? b.window : 'P30D',
        startups30d: b.startups30d,
        ...(isCount(b.startupUses30d) ? {startupUses30d: b.startupUses30d} : {}),
        activeInstalls30d: (b.activeInstalls30d ?? null) as number | null,
        versions,
        days,
    };
}

/**
 * Validates the summary payload, keeping the name, last-seen time and server
 * count. The raw event counts (`count`, `uninstalled`) are dropped: they
 * include restarts and, before trace filtered it, one server's command spam.
 */
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
            installs: isCount(row.installs) ? row.installs : null,
        }));
}

// What one request learned: `answered` when trace gave a definite answer (a
// good body, or a 404 meaning "nothing here"), with the parsed value if any.
type Outcome<T> = {answered: boolean; value: T | undefined};

async function fetchJson<T>(path: string, parse: (body: unknown) => T | undefined): Promise<Outcome<T>> {
    const url = traceBaseUrl() + path;
    try {
        const response = await fetch(url, {signal: AbortSignal.timeout(TRACE_REFRESH_TIMEOUT_MS)});
        if (!response.ok) {
            // A 404 is expected until trace deploys the endpoint, and for a
            // program that has never reported; neither is worth a log line.
            if (response.status === 404) {
                return {answered: true, value: undefined};
            }
            console.error(`Error fetching ${url}: HTTP ${response.status} ${response.statusText}`);
            return {answered: false, value: undefined};
        }
        const parsed = parse(await response.json());
        if (parsed === undefined) {
            console.error(`Error fetching ${url}: unexpected response shape`);
        }
        return {answered: parsed !== undefined, value: parsed};
    } catch (error) {
        console.error(`Error fetching ${url}:`, error);
        return {answered: false, value: undefined};
    }
}

/** Starts the one background request for `key`, or joins the one already running. */
function refresh<T>(key: string, fetcher: () => Promise<Outcome<T>>): Promise<T | undefined> {
    const running = state.inFlight.get(key) as Promise<T | undefined> | undefined;
    if (running) {
        return running;
    }
    const generation = state.generation;
    const request = fetcher().then(({answered, value}) => {
        const previous = state.cache.get(key)?.value as T | undefined;
        // Stale beats blank: a failure keeps the last good answer.
        const kept = value !== undefined ? value : previous;
        if (generation === state.generation) {
            state.cache.set(key, {value: kept, fetchedAt: Date.now(), answered});
            state.inFlight.delete(key);
        }
        return kept;
    });
    state.inFlight.set(key, request);
    return request;
}

const TIMED_OUT = Symbol('timed out');

async function cached<T>(key: string, fetcher: () => Promise<Outcome<T>>): Promise<T | undefined> {
    const current = state.cache.get(key);
    if (current && Date.now() - current.fetchedAt < (current.answered ? TRACE_CACHE_TTL_MS : TRACE_RETRY_MS)) {
        return current.value as T | undefined;
    }
    // Stale or empty: ask trace in the background and wait for it only as
    // long as a render may. If it answers in time this render uses it;
    // otherwise this render gets what is cached, and a later one the answer.
    const request = refresh(key, fetcher);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const budget = new Promise<typeof TIMED_OUT>((resolve) => {
        timer = setTimeout(() => resolve(TIMED_OUT), TRACE_TIMEOUT_MS);
    });
    try {
        const result = await Promise.race([request, budget]);
        return result === TIMED_OUT ? current?.value as T | undefined : result;
    } finally {
        clearTimeout(timer);
    }
}

/** One program's last 30 days, or undefined when trace has nothing to say (yet). */
export function getProgramUsage(traceName: string): Promise<ProgramUsage | undefined> {
    return cached('program:' + traceName,
        () => fetchJson('/api/public/programs/' + encodeURIComponent(traceName), parseProgramUsage));
}

/** Every program trace knows, with its last-seen time and server count; undefined when unreachable. */
export function getUsageSummary(): Promise<SummaryRow[] | undefined> {
    return cached('summary', () => fetchJson('/api/public/summary', parseSummary));
}
