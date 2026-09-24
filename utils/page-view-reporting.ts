// Applies the page-view policy to one request and hands the report to the
// runtime. Kept apart from middleware.ts so it can be tested with a stub
// client and a stub event, without a Next.js server.
import { pageOf, shouldReportPageView } from './page-view-policy';
import type { TraceClient } from './trace-client';
import { pageViewTags } from './usage-reporting';

/** The parts of a NextRequest this reads. */
export interface PageViewRequest {
    method: string;
    nextUrl: { pathname: string };
    headers: { get(name: string): string | null };
}

/** The part of a NextFetchEvent this uses. */
export interface PageViewEvent {
    waitUntil(promise: Promise<unknown>): void;
}

/**
 * Reports `request` as one `page-view` if the policy says it is one. Returns
 * at once: `report()` has already started the send and never rejects, and
 * `waitUntil` only keeps the runtime alive until it settles, so the page is
 * never held up by trace. Returns whether a report was started.
 */
export function reportPageView(request: PageViewRequest, event: PageViewEvent, client: TraceClient): boolean {
    // Nothing about the request is even looked at when reporting is off.
    if (!client.enabled) return false;
    const { pathname } = request.nextUrl;
    if (!shouldReportPageView({ method: request.method, pathname, headers: request.headers })) return false;
    event.waitUntil(client.report('page-view', { tags: pageViewTags(pageOf(pathname)) }));
    return true;
}
