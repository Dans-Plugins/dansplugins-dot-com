import {describe, expect, it} from 'vitest';
import {originVerdictFor, RateLimiter, requestAddress} from '@kingdom-community/web-guards';

// The visit route's guards used to be local (utils/rateLimit.ts,
// utils/sameOrigin.ts, utils/clientAddress.ts) and are now
// @kingdom-community/web-guards (#610). These are the old unit tests, kept
// case for case against the package so the swap is shown to keep the
// behaviour the site relies on. Where the package deliberately differs, the
// case says so.

describe('RateLimiter (was FixedWindowLimiter)', () => {
    it('allows up to the limit within a window, then refuses with the seconds left', () => {
        const limiter = new RateLimiter({limit: 2, windowMs: 60_000});
        expect(limiter.consume('a', 0).allowed).toBe(true);
        expect(limiter.consume('a', 0).allowed).toBe(true);
        expect(limiter.consume('a', 15_500)).toEqual({allowed: false, retryAfterSeconds: 45});
    });

    it('keeps a separate budget per key', () => {
        const limiter = new RateLimiter({limit: 1, windowMs: 60_000});
        expect(limiter.consume('a').allowed).toBe(true);
        expect(limiter.consume('a').allowed).toBe(false);
        expect(limiter.consume('b').allowed).toBe(true);
    });

    it('starts a fresh window once the old one has passed', () => {
        const limiter = new RateLimiter({limit: 1, windowMs: 1_000});
        limiter.consume('a', 0);
        expect(limiter.consume('a', 0).allowed).toBe(false);
        expect(limiter.consume('a', 1_000).allowed).toBe(true);
    });

    it('holds at most maxKeys windows, sweeping expired ones first', () => {
        const limiter = new RateLimiter({limit: 1, windowMs: 1_000, maxKeys: 3});
        limiter.consume('old', 0);
        limiter.consume('a', 1_000);
        limiter.consume('b', 1_000);
        limiter.consume('c', 1_000); // 'old' has expired and is swept to make room
        expect(limiter.size()).toBe(3);
        expect(limiter.consume('a', 1_000).allowed).toBe(false);
    });

    it('DIFFERS: with every window live, forgets all keys rather than only the oldest', () => {
        const limiter = new RateLimiter({limit: 1, windowMs: 1_000, maxKeys: 3});
        limiter.consume('a', 0);
        limiter.consume('b', 0);
        limiter.consume('c', 0);
        limiter.consume('d', 0);
        expect(limiter.size()).toBe(0);
        expect(limiter.consume('a', 0).allowed).toBe(true);
    });
});

const SITE = 'https://dansplugins.com';
const sameOrigin = (headers: Record<string, string>, baseUrl: string | undefined = SITE): boolean =>
    originVerdictFor({headers}, baseUrl).ok;

describe('originVerdictFor (was isSameOriginRequest)', () => {
    it('accepts an Origin naming the site', () => {
        expect(sameOrigin({origin: 'https://dansplugins.com'})).toBe(true);
        expect(sameOrigin({origin: 'http://localhost:3000'}, 'http://localhost:3000')).toBe(true);
    });

    it('refuses an Origin naming another host, another port, or an opaque origin', () => {
        expect(sameOrigin({origin: 'https://evil.example'})).toBe(false);
        expect(sameOrigin({origin: 'https://dansplugins.com.evil.example'})).toBe(false);
        expect(sameOrigin({origin: 'http://localhost:4000'}, 'http://localhost:3000')).toBe(false);
        expect(sameOrigin({origin: 'null'})).toBe(false);
    });

    it('does not fall back to Referer when a mismatched Origin is present', () => {
        expect(sameOrigin({origin: 'https://evil.example', referer: 'https://dansplugins.com/'})).toBe(false);
    });

    it('accepts a same-site Referer when Origin is absent', () => {
        expect(sameOrigin({referer: 'https://dansplugins.com/plugins/fiefs'})).toBe(true);
        expect(sameOrigin({referer: 'https://evil.example/dansplugins.com'})).toBe(false);
    });

    it('fails closed with neither header or a non-web scheme', () => {
        expect(sameOrigin({})).toBe(false);
        expect(sameOrigin({referer: 'ftp://dansplugins.com/'})).toBe(false);
    });

    it('compares hosts case-insensitively', () => {
        expect(sameOrigin({origin: 'https://DansPlugins.com'})).toBe(true);
    });

    it('DIFFERS: compares against the configured base URL, scheme included, not the Host header', () => {
        expect(sameOrigin({host: 'evil.example', origin: 'https://dansplugins.com'})).toBe(true);
        expect(sameOrigin({host: 'dansplugins.com', origin: 'http://dansplugins.com'})).toBe(false);
    });

    it('DIFFERS: refuses everything as not-configured when no base URL is set', () => {
        expect(originVerdictFor({headers: {origin: SITE}}, undefined)).toEqual({ok: false, reason: 'not-configured'});
        expect(originVerdictFor({headers: {origin: SITE}}, '')).toEqual({ok: false, reason: 'not-configured'});
    });
});

describe('requestAddress (was clientAddress)', () => {
    it('takes the rightmost X-Forwarded-For entry, the one the nearest proxy appended', () => {
        expect(requestAddress({headers: {'x-forwarded-for': '198.51.100.1, 203.0.113.7'}})).toBe('203.0.113.7');
    });

    it('ignores the leftmost entry, which the client can write', () => {
        const spoofed = (n: number) => requestAddress({headers: {'x-forwarded-for': `10.0.0.${n}, 203.0.113.7`}});
        expect(spoofed(1)).toBe(spoofed(2));
    });

    it('prefers X-Forwarded-For over the socket peer, which is the proxy', () => {
        expect(requestAddress({headers: {'x-forwarded-for': '203.0.113.7'}, socket: {remoteAddress: '172.18.0.2'}})).toBe('203.0.113.7');
    });

    it('falls back to the socket peer without X-Forwarded-For', () => {
        expect(requestAddress({headers: {'x-forwarded-for': ' , '}, socket: {remoteAddress: '2001:db8::1'}})).toBe('2001:db8::1');
    });

    it('DIFFERS: keeps an IPv4-mapped socket peer as written (only reached without a proxy)', () => {
        expect(requestAddress({headers: {}, socket: {remoteAddress: '::ffff:192.0.2.5'}})).toBe('::ffff:192.0.2.5');
    });

    it("returns 'unknown' when no address is known, the bucket visitCounter used for null", () => {
        expect(requestAddress({headers: {}})).toBe('unknown');
    });

    it('DIFFERS: prefers X-Real-Ip, which Traefik overwrites with the address it saw', () => {
        expect(requestAddress({headers: {'x-real-ip': '203.0.113.9', 'x-forwarded-for': '203.0.113.7'}})).toBe('203.0.113.9');
    });
});
