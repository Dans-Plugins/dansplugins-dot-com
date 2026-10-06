// The one trace client for this site, built from the server's environment.
// One event is reported: `page-view`, from middleware.ts, once per HTML page
// served, tagged with the path, the site version and this server's random
// installation ID (`install`), and nothing else. What a
// page view records, and why it is reported server-side, is trace decision 0002:
// https://github.com/Stephenson-Software/trace/blob/main/docs/decisions/0002-website-page-views.md
//
// The key is read from USAGE_REPORTING_KEY and nowhere else: it is never
// committed and never reaches the browser (this module is only imported by
// middleware.ts). No key means reporting is silently off.
//
// Runs in the Edge runtime, so it uses nothing beyond what trace-client.ts does.
import pkg from '../package.json';
import { TraceClient } from './trace-client';
import type { Environment } from './trace-client';

/** The trace program this site reports as; the key in USAGE_REPORTING_KEY is issued for it. */
export const PROGRAM_NAME = 'dansplugins-dot-com';

/** Where reports go unless USAGE_REPORTING_ENDPOINT says otherwise. */
export const DEFAULT_ENDPOINT = 'https://trace.danielstephenson.dev';

/** What is and is not sent, and every way to turn it off. */
export const DETAILS_URL = 'https://danielstephenson.dev/usage-reporting';

/**
 * The build the events are tagged with: `version` from package.json, passed to
 * the client, which tags every event with it. Never blank, so building the
 * client inside middleware can never throw over it.
 */
export const VERSION: string = (typeof pkg.version === 'string' && pkg.version.trim()) || 'unknown';

/** The environment variables read. Each is looked up by its literal name so Next.js exposes it to middleware. */
export interface UsageReportingEnv {
    USAGE_REPORTING_ENABLED?: string;
    USAGE_REPORTING_ENDPOINT?: string;
    USAGE_REPORTING_KEY?: string;
    TRACE_USAGE_REPORTING?: string;
    DO_NOT_TRACK?: string;
    /** Pins the installation ID (the tag `install`); otherwise it comes from {@link installIdFile}. */
    TRACE_INSTALL_ID?: string;
    /** Where {@link installIdFile} goes: `$XDG_DATA_HOME`, else `$HOME/.local/share`. */
    XDG_DATA_HOME?: string;
    HOME?: string;
}

/** Why nothing is sent; null when reporting is on. First match wins, in this order. */
export type DisabledReason = 'environment' | 'USAGE_REPORTING_ENABLED' | 'no key';

const ENABLED_OFF = new Set(['false', '0', 'no', 'off']);

function normalised(value: string | undefined): string {
    return (value ?? '').trim().toLowerCase();
}

/**
 * The two fleet-wide opt-outs from `env`, in the shape trace-client.ts reads
 * them. Passed to the client explicitly so it never falls back to process.env:
 * `env` stays the one source, as it is in tests.
 */
function traceEnvironment(env: UsageReportingEnv): Environment {
    return { TRACE_USAGE_REPORTING: env.TRACE_USAGE_REPORTING, DO_NOT_TRACK: env.DO_NOT_TRACK };
}

/**
 * Why reporting is off for `env`, or null when it is on. The fleet-wide
 * opt-outs (`TRACE_USAGE_REPORTING=off`, `DO_NOT_TRACK=1`) win over the site's
 * own `USAGE_REPORTING_ENABLED=false`, which wins over a missing key. The
 * fleet-wide check is trace-client.ts's own (`TraceClient.environmentOptsOut`).
 */
export function disabledReason(env: UsageReportingEnv): DisabledReason | null {
    if (TraceClient.environmentOptsOut(traceEnvironment(env))) return 'environment';
    if (ENABLED_OFF.has(normalised(env.USAGE_REPORTING_ENABLED))) return 'USAGE_REPORTING_ENABLED';
    if (!(env.USAGE_REPORTING_KEY ?? '').trim()) return 'no key';
    return null;
}

/** The one line logged when the client is built. None when there is no key, so an unconfigured site stays quiet. */
export function startupLine(env: UsageReportingEnv): string | null {
    const reason = disabledReason(env);
    if (reason === 'no key') return null;
    if (reason) return `Usage reporting is off (${reason}).`;
    return `Usage reporting is on: ${PROGRAM_NAME} sends one page-view event per page served (the path, the`
        + ` site version and a random ID for this server, nothing about the visitor) to ${endpointOf(env)}. Turn it off with`
        + ` USAGE_REPORTING_ENABLED=false or TRACE_USAGE_REPORTING=off. Details: ${DETAILS_URL}`;
}

/**
 * Where the client keeps this server's installation ID:
 * `<user data dir>/<program>/trace-install-id`, the user data dir being
 * `$XDG_DATA_HOME` or `$HOME/.local/share` (the server runs on Linux). Only a
 * path: the client reads or creates the file, and only when reporting is on.
 * Null when neither variable is set.
 *
 * The report is made from Next.js middleware, which runs in the Edge runtime:
 * it has no `node:fs` (`process.getBuiltinModule`), so there the client keeps
 * the ID in memory for the life of the server process instead. Set
 * TRACE_INSTALL_ID to keep one ID across restarts.
 */
export function installIdFile(env: UsageReportingEnv): string | null {
    const base = (env.XDG_DATA_HOME ?? '').trim()
        || ((env.HOME ?? '').trim() ? `${(env.HOME ?? '').trim().replace(/\/+$/, '')}/.local/share` : '');
    if (!base) return null;
    return `${base.replace(/\/+$/, '')}/${PROGRAM_NAME.toLowerCase()}/trace-install-id`;
}

function endpointOf(env: UsageReportingEnv): string {
    return (env.USAGE_REPORTING_ENDPOINT ?? '').trim() || DEFAULT_ENDPOINT;
}

/** Builds a client from an environment; exported so the wiring is testable without touching process.env. */
export function createUsageReporting(
    env: UsageReportingEnv,
    options: { fetch?: typeof fetch; log?: (line: string) => void; debug?: (message: string) => void } = {},
): TraceClient {
    const line = startupLine(env);
    if (line && options.log) options.log(line);
    if (disabledReason(env)) return TraceClient.disabled();
    return new TraceClient(endpointOf(env), PROGRAM_NAME, {
        version: VERSION,
        key: env.USAGE_REPORTING_KEY,
        env: traceEnvironment(env),
        installId: env.TRACE_INSTALL_ID,
        installIdFile: installIdFile(env),
        fetch: options.fetch,
        debug: options.debug,
    });
}

/** The tags a page view is reported with: the normalised path, nothing else (the client adds `version`). */
export function pageViewTags(page: string): Record<string, string> {
    return { page };
}

let shared: TraceClient | undefined;

/** The shared client, built from the server's environment on first use. */
export function usageReporting(): TraceClient {
    if (!shared) {
        shared = createUsageReporting(
            {
                USAGE_REPORTING_ENABLED: process.env.USAGE_REPORTING_ENABLED,
                USAGE_REPORTING_ENDPOINT: process.env.USAGE_REPORTING_ENDPOINT,
                USAGE_REPORTING_KEY: process.env.USAGE_REPORTING_KEY,
                TRACE_USAGE_REPORTING: process.env.TRACE_USAGE_REPORTING,
                DO_NOT_TRACK: process.env.DO_NOT_TRACK,
                TRACE_INSTALL_ID: process.env.TRACE_INSTALL_ID,
                XDG_DATA_HOME: process.env.XDG_DATA_HOME,
                HOME: process.env.HOME,
            },
            { log: (line) => console.log(line) },
        );
    }
    return shared;
}
