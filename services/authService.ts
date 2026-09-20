// Client-side calls to the dpc-api auth endpoints (register, login, logout),
// which dpc-api proxies to the shared UserAuth identity service. The base URL
// is the same public API the account page's profile calls use.
//
// Every outcome is one of three kinds (registration adds a fourth, below), and
// the distinction is the point:
//
//   * authenticated — the service did the thing and issued a token.
//   * refused       — the service answered, and the answer is no (wrong
//                     password, name taken, password too weak). The visitor
//                     did something; tell them.
//   * unavailable   — the service could not be reached, timed out, or answered
//                     with something that is not an answer (5xx, 429). Nobody
//                     did anything wrong and nothing is known about the
//                     credentials, so the message must not blame the visitor.
//
// dpc-api draws the same line: an unreachable UserAuth becomes a 503 (see
// UserAuthClient.unavailable), and a 4xx from UserAuth is passed through as-is.
import {getApiBaseUrl} from '../utils/apiBase';

const API_BASE = getApiBaseUrl();

/**
 * Upper bound on a login or logout request. A wedged dpc-api otherwise leaves
 * the form's submit button spinning until the browser gives up on its own.
 */
export const AUTH_REQUEST_TIMEOUT_MS = 8000;

/**
 * Registration gets a longer bound because it is not idempotent and dpc-api
 * makes two sequential UserAuth calls for it (register, then login), each
 * allowed 5 s to connect and 10 s to answer. Cutting it off earlier would
 * invite a retry that 409s on the account the first attempt already created.
 */
export const REGISTER_REQUEST_TIMEOUT_MS = 30000;

export type AuthResult =
    | {status: 'authenticated'; token: string; refreshToken: string | null}
    /**
     * Registration created the account but dpc-api could not log it in
     * (a transient UserAuth error): the response is 201 with no token and
     * `registered: true`, and the right next step is a plain login.
     */
    | {status: 'registered'; message: string}
    | {status: 'refused'; message: string}
    | {status: 'unavailable'; message: string};

export const REGISTER_REFUSED_MESSAGE =
    'Registration failed. Make sure your username is available and your password meets the requirements (8–128 characters).';
export const LOGIN_REFUSED_MESSAGE = 'Invalid credentials.';
export const REGISTERED_LOGIN_NEEDED_MESSAGE =
    'Account created, but automatic login failed. Please log in.';
export const SERVICE_UNAVAILABLE_MESSAGE =
    'Sign-in is temporarily unavailable. Please try again in a few minutes.';
export const TIMEOUT_MESSAGE =
    'The server took too long to respond. Please try again in a moment.';
// A registration that timed out may still have gone through server-side, so
// the next step is a login, not another registration.
export const REGISTER_TIMEOUT_MESSAGE =
    'The server took too long to respond. Your account may still have been created — try logging in before registering again.';
export const UNREACHABLE_MESSAGE =
    'We couldn’t reach the server. Please check your connection and try again.';

// AbortSignal.timeout is missing from a few older browsers; a request there is
// simply unbounded, as every request was before, rather than failing outright.
const timeoutSignal = (ms: number): AbortSignal | undefined =>
    typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function'
        ? AbortSignal.timeout(ms)
        : undefined;

const isTimeout = (e: unknown): boolean =>
    e instanceof Error && (e.name === 'TimeoutError' || e.name === 'AbortError');

/**
 * A 5xx is "we do not know", not "no": treating it as a refusal would tell a
 * visitor their password is wrong during an outage. 429 is the same — the
 * service declined to look at the credentials at all.
 */
const isUnavailableStatus = (status: number): boolean => status >= 500 || status === 429;

// The issued pair. dpc-api passes UserAuth's login body through, so the refresh
// token rides alongside the access token; an API older than that has none, and
// the session then lasts as long as the access token, as it always did.
const readTokens = async (res: Response): Promise<{token: string; refreshToken: string | null} | null> => {
    try {
        const data: unknown = await res.json();
        if (typeof data === 'object' && data !== null && 'token' in data) {
            const {token, refreshToken} = data as {token: unknown; refreshToken?: unknown};
            if (typeof token === 'string' && token.length > 0) {
                return {token, refreshToken: typeof refreshToken === 'string' && refreshToken ? refreshToken : null};
            }
        }
        return null;
    } catch {
        return null;
    }
};

interface PostOptions {
    path: string;
    timeoutMs: number;
    timeoutMessage: string;
    refusedMessage: string;
    /** The result for a 2xx whose body carries no token. */
    onOkWithoutToken: AuthResult;
}

const post = async (
    username: string,
    password: string,
    {path, timeoutMs, timeoutMessage, refusedMessage, onOkWithoutToken}: PostOptions
): Promise<AuthResult> => {
    let res: Response;
    try {
        res = await fetch(`${API_BASE}${path}`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({username, password}),
            signal: timeoutSignal(timeoutMs),
        });
    } catch (e) {
        return {status: 'unavailable', message: isTimeout(e) ? timeoutMessage : UNREACHABLE_MESSAGE};
    }
    if (res.ok) {
        const tokens = await readTokens(res);
        return tokens ? {status: 'authenticated', ...tokens} : onOkWithoutToken;
    }
    if (isUnavailableStatus(res.status)) {
        return {status: 'unavailable', message: SERVICE_UNAVAILABLE_MESSAGE};
    }
    return {status: 'refused', message: refusedMessage};
};

/** Create an account. Resolves to `authenticated` when dpc-api also logged it in. */
export const register = (username: string, password: string): Promise<AuthResult> =>
    post(username, password, {
        path: '/api/v1/auth/register',
        timeoutMs: REGISTER_REQUEST_TIMEOUT_MS,
        timeoutMessage: REGISTER_TIMEOUT_MESSAGE,
        refusedMessage: REGISTER_REFUSED_MESSAGE,
        onOkWithoutToken: {status: 'registered', message: REGISTERED_LOGIN_NEEDED_MESSAGE},
    });

/** Log in with a username and password. */
export const login = (username: string, password: string): Promise<AuthResult> =>
    post(username, password, {
        path: '/api/v1/auth/login',
        timeoutMs: AUTH_REQUEST_TIMEOUT_MS,
        timeoutMessage: TIMEOUT_MESSAGE,
        refusedMessage: LOGIN_REFUSED_MESSAGE,
        // A 2xx login with no token is not an answer either; nothing was issued.
        onOkWithoutToken: {status: 'unavailable', message: SERVICE_UNAVAILABLE_MESSAGE},
    });

/**
 * Revoke a token server-side. Best-effort and never throws: clearing the token
 * locally is the meaningful part of logging out, and the caller does that
 * regardless of whether this request lands.
 */
export const logout = async (token: string): Promise<void> => {
    try {
        await fetch(`${API_BASE}/api/v1/auth/logout`, {
            method: 'POST',
            headers: {Authorization: `Bearer ${token}`},
            signal: timeoutSignal(AUTH_REQUEST_TIMEOUT_MS),
        });
    } catch {
        // ignore: the caller clears the local token regardless
    }
};
