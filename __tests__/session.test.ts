/**
 * @vitest-environment jsdom
 */
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {
    REFRESH_TOKEN_KEY,
    RENEW_WITHIN_MS,
    TOKEN_KEY,
    clearSession,
    getSessionToken,
    getStoredToken,
    saveSession,
    tokenExpiryMs,
} from '../utils/session';

// A JWT whose payload carries `exp` (seconds); the signature is irrelevant here.
const jwtExpiring = (atMs: number): string => {
    const payload = btoa(JSON.stringify({sub: 'dan', exp: Math.floor(atMs / 1000)}))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    return `eyJhbGciOiJIUzI1NiJ9.${payload}.sig`;
};

const NOW = 1_800_000_000_000;

beforeEach(() => {
    window.localStorage.clear();
});

afterEach(() => {
    vi.unstubAllGlobals();
    window.localStorage.clear();
});

describe('session storage', () => {
    it('saves and clears the pair', () => {
        saveSession({token: 'jwt', refreshToken: 'rt'});
        expect(window.localStorage.getItem(TOKEN_KEY)).toBe('jwt');
        expect(window.localStorage.getItem(REFRESH_TOKEN_KEY)).toBe('rt');
        expect(getStoredToken()).toBe('jwt');
        clearSession();
        expect(window.localStorage.getItem(TOKEN_KEY)).toBeNull();
        expect(window.localStorage.getItem(REFRESH_TOKEN_KEY)).toBeNull();
    });

    it('reads exp off a token and null off garbage', () => {
        expect(tokenExpiryMs(jwtExpiring(NOW))).toBe(Math.floor(NOW / 1000) * 1000);
        expect(tokenExpiryMs('not-a-jwt')).toBeNull();
        expect(tokenExpiryMs(null)).toBeNull();
    });
});

describe('getSessionToken', () => {
    it('is null with no session', async () => {
        expect(await getSessionToken(NOW)).toBeNull();
    });

    it('hands back a token with plenty of life left without touching the API', async () => {
        const fetchMock = vi.fn();
        vi.stubGlobal('fetch', fetchMock);
        saveSession({token: jwtExpiring(NOW + 30 * 60_000), refreshToken: 'rt'});
        expect(await getSessionToken(NOW)).toBe(jwtExpiring(NOW + 30 * 60_000));
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('renews a token about to expire, stores the rotated pair, and shares one exchange between concurrent callers', async () => {
        const fresh = jwtExpiring(NOW + 60 * 60_000);
        const fetchMock = vi.fn().mockResolvedValue({ok: true, status: 200, json: async () => ({token: fresh, refreshToken: 'rt-2'})});
        vi.stubGlobal('fetch', fetchMock);
        saveSession({token: jwtExpiring(NOW + RENEW_WITHIN_MS - 1), refreshToken: 'rt-1'});

        const [a, b] = await Promise.all([getSessionToken(NOW), getSessionToken(NOW)]);

        expect(a).toBe(fresh);
        expect(b).toBe(fresh);
        expect(fetchMock).toHaveBeenCalledTimes(1);
        const [url, init] = fetchMock.mock.calls[0];
        expect(url).toMatch(/\/api\/v1\/auth\/refresh$/);
        expect(JSON.parse(init.body)).toEqual({refreshToken: 'rt-1'});
        expect(window.localStorage.getItem(REFRESH_TOKEN_KEY)).toBe('rt-2');
    });

    it('ends the session when the API refuses the refresh token', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ok: false, status: 401, json: async () => ({})}));
        saveSession({token: jwtExpiring(NOW - 1), refreshToken: 'rt-dead'});
        expect(await getSessionToken(NOW)).toBeNull();
        expect(window.localStorage.getItem(TOKEN_KEY)).toBeNull();
        expect(window.localStorage.getItem(REFRESH_TOKEN_KEY)).toBeNull();
    });

    it('keeps the current token when the API is merely unwell', async () => {
        const current = jwtExpiring(NOW + 60_000);
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('down')));
        saveSession({token: current, refreshToken: 'rt-1'});
        expect(await getSessionToken(NOW)).toBe(current);
        expect(window.localStorage.getItem(REFRESH_TOKEN_KEY)).toBe('rt-1');
    });

    it('without a refresh token, keeps a near-expiry token but drops an expired one', async () => {
        const fetchMock = vi.fn();
        vi.stubGlobal('fetch', fetchMock);
        saveSession({token: jwtExpiring(NOW + 60_000), refreshToken: null});
        expect(await getSessionToken(NOW)).toBe(jwtExpiring(NOW + 60_000));
        saveSession({token: jwtExpiring(NOW - 1), refreshToken: null});
        expect(await getSessionToken(NOW)).toBeNull();
        expect(fetchMock).not.toHaveBeenCalled();
    });
});
