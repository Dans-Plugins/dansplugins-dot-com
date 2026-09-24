// The one trace client for this site, built from the server's environment.
// One event is reported: `page-view`, from middleware.ts, once per HTML page
// served, tagged with the path and the site version and nothing else. What a
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

/** The trace program this site reports as; the key in USAGE_REPORTING_KEY is issued for it. */
export const PROGRAM_NAME = 'dansplugins-dot-com';

/** Where reports go unless USAGE_REPORTING_ENDPOINT says otherwise. */
export const DEFAULT_ENDPOINT = 'https://trace.danielstephenson.dev';

/** What is and is not sent, and every way to turn it off. */
export const DETAILS_URL = 'https://github.com/Stephenson-Software/trace#usage-reporting';

/** The build the events are tagged with: `version` from package.json. */
export const VERSION: string = pkg.version;

/** The environment variables read. Each is looked up by its literal name so Next.js exposes it to middleware. */
export interface UsageReportingEnv {
    USAGE_REPORTING_ENABLED?: string;
    USAGE_REPORTING_ENDPOINT?: string;
    USAGE_REPORTING_KEY?: string;
    TRACE_USAGE_REPORTING?: string;
    DO_NOT_TRACK?: string;
}

/** Why nothing is sent; null when reporting is on. First match wins, in this order. */
export type DisabledReason = 'environment' | 'USAGE_REPORTING_ENABLED' | 'no key';

const TRACE_OFF = new Set(['off', 'false', '0', 'no']);
const DO_NOT_TRACK_ON = new Set(['1', 'true', 'yes']);
const ENABLED_OFF = new Set(['false', '0', 'no', 'off']);

function normalised(value: string | undefined): string {
    return (value ?? '').trim().toLowerCase();
}

/**
 * Why reporting is off for `env`, or null when it is on. The fleet-wide
 * opt-outs (`TRACE_USAGE_REPORTING=off`, `DO_NOT_TRACK=1`) win over the site's
 * own `USAGE_REPORTING_ENABLED=false`, which wins over a missing key.
 */
export function disabledReason(env: UsageReportingEnv): DisabledReason | null {
    if (TRACE_OFF.has(normalised(env.TRACE_USAGE_REPORTING)) || DO_NOT_TRACK_ON.has(normalised(env.DO_NOT_TRACK))) {
        return 'environment';
    }
    if (ENABLED_OFF.has(normalised(env.USAGE_REPORTING_ENABLED))) return 'USAGE_REPORTING_ENABLED';
    if (!(env.USAGE_REPORTING_KEY ?? '').trim()) return 'no key';
    return null;
}

/** The one line logged when the client is built. None when there is no key, so an unconfigured site stays quiet. */
export function startupLine(env: UsageReportingEnv): string | null {
    const reason = disabledReason(env);
    if (reason === 'no key') return null;
    if (reason) return `Usage reporting is off (${reason}).`;
    return `Usage reporting is on: ${PROGRAM_NAME} sends one page-view event per page served (the path and the`
        + ` site version, nothing about the visitor) to ${endpointOf(env)}. Turn it off with`
        + ` USAGE_REPORTING_ENABLED=false or TRACE_USAGE_REPORTING=off. Details: ${DETAILS_URL}`;
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
        key: env.USAGE_REPORTING_KEY,
        fetch: options.fetch,
        debug: options.debug,
    });
}

/** The tags a page view carries: the normalised path and the version, nothing else. */
export function pageViewTags(page: string): Record<string, string> {
    return { page, version: VERSION };
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
            },
            { log: (line) => console.log(line) },
        );
    }
    return shared;
}
