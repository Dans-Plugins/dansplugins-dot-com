import {getApiBaseUrl} from './apiBase';

/**
 * The browser's session with dpc-api: an access token (a UserAuth JWT, good
 * for an hour) and the refresh token that renews it (good for thirty days,
 * rotated on every use). Until this module existed the site kept only the
 * access token, so every visitor was signed out an hour after signing in.
 *
 * Every page that needs a token asks {@link getSessionToken}, which hands
 * back the stored access token while it has a few minutes left and otherwise
 * exchanges the refresh token for a new pair first — one exchange at a time,
 * however many callers ask at once. A refresh the API refuses (the refresh
 * token expired, was revoked by a logout elsewhere, or was consumed by a
 * password reset) ends the session cleanly rather than leaving a token that
 * every request would fail with.
 *
 * Storage is best-effort, as it always was: with site data blocked the
 * session lasts until the tab is closed.
 */

export const TOKEN_KEY = 'dpc-token';
export const REFRESH_TOKEN_KEY = 'dpc-refresh-token';

/** A token with less than this left is renewed before it is handed out. */
export const RENEW_WITHIN_MS = 5 * 60 * 1000;

export interface Session {
    token: string;
    refreshToken: string | null;
}

const read = (key: string): string | null => {
    try {
        return typeof window === 'undefined' ? null : window.localStorage.getItem(key);
    } catch {
        return null;
    }
};

const write = (key: string, value: string | null): void => {
    try {
        if (typeof window === 'undefined') return;
        if (value === null) {
            window.localStorage.removeItem(key);
        } else {
            window.localStorage.setItem(key, value);
        }
    } catch {
        // ignore: storage blocked; the in-memory copy the caller holds still works this visit
    }
};

/** Remembers a freshly issued pair (from login, register or refresh). */
export const saveSession = ({token, refreshToken}: Session): void => {
    write(TOKEN_KEY, token);
    write(REFRESH_TOKEN_KEY, refreshToken);
};

/** Forgets the session locally. Revoking it server-side is authService.logout's job. */
export const clearSession = (): void => {
    write(TOKEN_KEY, null);
    write(REFRESH_TOKEN_KEY, null);
};

/** The stored access token as it is, for display (e.g. the username in the top bar). */
export const getStoredToken = (): string | null => read(TOKEN_KEY);

/** The JWT `exp` claim as a millisecond timestamp, or null when unreadable. Unverified. */
export const tokenExpiryMs = (token: string | null | undefined): number | null => {
    if (!token) return null;
    try {
        const payload = token.split('.')[1];
        if (!payload) return null;
        const data = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))) as Record<string, unknown>;
        return typeof data.exp === 'number' ? data.exp * 1000 : null;
    } catch {
        return null;
    }
};

const needsRenewal = (token: string, now: number): boolean => {
    const exp = tokenExpiryMs(token);
    // A token whose expiry cannot be read is used as it is: the API will say.
    return exp !== null && exp - now < RENEW_WITHIN_MS;
};

let inFlight: Promise<string | null> | null = null;

const exchange = async (refreshToken: string): Promise<string | null> => {
    try {
        const res = await fetch(`${getApiBaseUrl()}/api/v1/auth/refresh`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({refreshToken}),
        });
        if (res.status === 401) {
            // The refresh token is dead: expired, revoked, or already used.
            clearSession();
            return null;
        }
        if (!res.ok) {
            // The API is unwell; keep what we have and let the caller's request decide.
            return read(TOKEN_KEY);
        }
        const body = (await res.json()) as {token?: unknown; refreshToken?: unknown};
        if (typeof body.token !== 'string' || !body.token) {
            return read(TOKEN_KEY);
        }
        saveSession({token: body.token, refreshToken: typeof body.refreshToken === 'string' ? body.refreshToken : null});
        return body.token;
    } catch {
        return read(TOKEN_KEY);
    }
};

/**
 * An access token to send, renewed first if it is about to expire; null when
 * there is no session. Concurrent callers share one renewal.
 */
export const getSessionToken = async (now: number = Date.now()): Promise<string | null> => {
    const token = read(TOKEN_KEY);
    if (!token) return null;
    if (!needsRenewal(token, now)) return token;
    const refreshToken = read(REFRESH_TOKEN_KEY);
    if (!refreshToken) {
        // Nothing to renew with. An already-expired token is dropped so the page
        // shows "sign in" instead of a request that will be refused.
        const exp = tokenExpiryMs(token);
        if (exp !== null && exp <= now) {
            clearSession();
            return null;
        }
        return token;
    }
    if (!inFlight) {
        inFlight = exchange(refreshToken).finally(() => {
            inFlight = null;
        });
    }
    return inFlight;
};
