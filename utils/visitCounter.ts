import {FixedWindowLimiter, type RateLimitDecision} from './rateLimit';
import {getVisitData, incrementVisitCount, type VisitData} from './visitStorage';

// The rules for counting a visit, shared by the home page (counted in-process
// from getServerSideProps) and the guarded POST /api/visits route.
//
// One address counts once per VISIT_WINDOW_MS. Repeat visits inside the window
// read the counter without writing it, so reloading the home page, or looping
// on it, neither inflates the figure nor costs a file write per request. The
// addresses live only in this process's memory (utils/rateLimit.ts) and expire
// with their window; they are never written to disk or reported.

export const VISIT_WINDOW_MS = 30 * 60 * 1000;

// A caller whose address is unknown shares one bucket, so it can count at
// most once per window rather than once per request.
const UNKNOWN_ADDRESS = 'unknown';

// POST /api/visits requests allowed per address per minute, counted or not.
export const POST_LIMIT_PER_MINUTE = 10;

// `next build` bundles the home page and the API route separately, each with
// its own copy of this module, so module-level limiters would give the page
// and the route two independent memories of who has visited. The limiters are
// kept on globalThis so the whole server process shares one of each.
interface VisitCounterState {
    recentVisitors: FixedWindowLimiter;
    postBudget: FixedWindowLimiter;
}

const STATE_KEY = Symbol.for('dansplugins.visitCounter');
const globalStore = globalThis as typeof globalThis & {[STATE_KEY]?: VisitCounterState};
const state: VisitCounterState = globalStore[STATE_KEY] ??= {
    recentVisitors: new FixedWindowLimiter({limit: 1, windowMs: VISIT_WINDOW_MS}),
    postBudget: new FixedWindowLimiter({limit: POST_LIMIT_PER_MINUTE, windowMs: 60 * 1000}),
};
const {recentVisitors, postBudget} = state;

export const takePostBudget = (address: string | null): RateLimitDecision =>
    postBudget.take(address ?? UNKNOWN_ADDRESS);

export const recordVisit = (address: string | null): VisitData =>
    recentVisitors.take(address ?? UNKNOWN_ADDRESS).allowed ? incrementVisitCount() : getVisitData();

// For tests: forget every recent visitor and every POST budget.
export const resetVisitCounterState = (): void => {
    recentVisitors.clear();
    postBudget.clear();
};
