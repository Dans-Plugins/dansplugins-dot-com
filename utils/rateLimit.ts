// A fixed-window rate limiter kept in module memory, for the site's one
// server-side write: the visit counter (pages/api/visits.ts, utils/visitCounter.ts).
//
// Counters are per process. The site runs as one Next.js process (compose.yml,
// and the gateway's single dpc-website container), so the budget is the budget;
// behind several replicas it would multiply by the replica count. A restart
// empties every window, which for a cosmetic counter is acceptable.
//
// The map of keys is bounded: once it holds `maxKeys` entries, expired windows
// are swept, and if every window is still live the oldest key is dropped. A
// flood of distinct keys therefore costs bounded memory, at worst forgetting an
// older visitor early.

export interface RateLimitDecision {
    allowed: boolean;
    // Whole seconds until this key's window resets (0 when allowed).
    retryAfterSeconds: number;
}

export interface FixedWindowLimiterOptions {
    limit: number;
    windowMs: number;
    maxKeys?: number;
    now?: () => number;
}

interface Window {
    count: number;
    resetAt: number;
}

export class FixedWindowLimiter {
    private readonly limit: number;
    private readonly windowMs: number;
    private readonly maxKeys: number;
    private readonly now: () => number;
    private readonly windows = new Map<string, Window>();

    constructor({limit, windowMs, maxKeys = 10_000, now = Date.now}: FixedWindowLimiterOptions) {
        this.limit = limit;
        this.windowMs = windowMs;
        this.maxKeys = maxKeys;
        this.now = now;
    }

    // Count one request against `key` and say whether it is within the limit.
    take(key: string): RateLimitDecision {
        const now = this.now();
        const current = this.windows.get(key);
        if (current && current.resetAt > now) {
            if (current.count >= this.limit) {
                return {allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000))};
            }
            current.count += 1;
            return {allowed: true, retryAfterSeconds: 0};
        }
        if (current) {
            this.windows.delete(key);
        }
        this.makeRoom(now);
        this.windows.set(key, {count: 1, resetAt: now + this.windowMs});
        return {allowed: true, retryAfterSeconds: 0};
    }

    get size(): number {
        return this.windows.size;
    }

    clear(): void {
        this.windows.clear();
    }

    private makeRoom(now: number): void {
        if (this.windows.size < this.maxKeys) {
            return;
        }
        this.windows.forEach((window, key) => {
            if (window.resetAt <= now) {
                this.windows.delete(key);
            }
        });
        // Map iterates in insertion order, so the first key is the oldest window.
        while (this.windows.size >= this.maxKeys) {
            const oldest = this.windows.keys().next().value as string;
            this.windows.delete(oldest);
        }
    }
}
