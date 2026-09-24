// Reports one `page-view` event to trace per HTML page served, server-side, so
// no page component has to know about it and no script reaches the browser.
// Only the path and the site version are sent -- no query string, IP address,
// user agent, cookie, referrer or identity (trace decision 0002). The rules are
// in utils/page-view-policy.ts; the client and its switches in
// utils/usage-reporting.ts.
import { NextResponse } from 'next/server';
import type { NextFetchEvent, NextRequest } from 'next/server';
import { reportPageView } from './utils/page-view-reporting';
import { usageReporting } from './utils/usage-reporting';

export function middleware(request: NextRequest, event: NextFetchEvent) {
    reportPageView(request, event, usageReporting());
    return NextResponse.next();
}

export const config = {
    // Page requests only: no Next internals, no API routes, and nothing with a
    // file extension (favicon, robots.txt, images). The policy re-checks all of
    // this; the matcher just keeps middleware off requests it would skip anyway.
    matcher: ['/((?!_next/|api/|.*\\..*).*)'],
};
