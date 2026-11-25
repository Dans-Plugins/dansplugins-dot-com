import {describe, expect, it} from 'vitest';
import {FixedWindowLimiter} from '../utils/rateLimit';

const clock = (start = 0) => {
    let now = start;
    return {now: () => now, advance: (ms: number) => { now += ms; }};
};

describe('FixedWindowLimiter', () => {
    it('allows up to the limit within a window, then refuses with the seconds left', () => {
        const time = clock();
        const limiter = new FixedWindowLimiter({limit: 2, windowMs: 60_000, now: time.now});
        expect(limiter.take('a').allowed).toBe(true);
        expect(limiter.take('a').allowed).toBe(true);
        time.advance(15_500);
        expect(limiter.take('a')).toEqual({allowed: false, retryAfterSeconds: 45});
    });

    it('keeps a separate budget per key', () => {
        const limiter = new FixedWindowLimiter({limit: 1, windowMs: 60_000});
        expect(limiter.take('a').allowed).toBe(true);
        expect(limiter.take('a').allowed).toBe(false);
        expect(limiter.take('b').allowed).toBe(true);
    });

    it('starts a fresh window once the old one has passed', () => {
        const time = clock();
        const limiter = new FixedWindowLimiter({limit: 1, windowMs: 1_000, now: time.now});
        limiter.take('a');
        expect(limiter.take('a').allowed).toBe(false);
        time.advance(1_000);
        expect(limiter.take('a').allowed).toBe(true);
    });

    it('holds at most maxKeys windows, sweeping expired ones first and then the oldest', () => {
        const time = clock();
        const limiter = new FixedWindowLimiter({limit: 1, windowMs: 1_000, maxKeys: 3, now: time.now});
        limiter.take('old');
        time.advance(1_000);
        limiter.take('a');
        limiter.take('b');
        limiter.take('c'); // 'old' has expired and is swept to make room
        expect(limiter.size).toBe(3);
        expect(limiter.take('a').allowed).toBe(false);
        limiter.take('d'); // every window is live, so the oldest, 'a', is dropped
        expect(limiter.size).toBe(3);
        expect(limiter.take('a').allowed).toBe(true);
    });
});
