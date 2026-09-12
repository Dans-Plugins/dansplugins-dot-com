// Client-side calls to the dpc-api auth endpoints (register, login, logout),
// which dpc-api proxies to the shared UserAuth identity service. The base URL
// is the same public API the account page's profile calls use.
//
// Every outcome is one of three kinds, and the distinction is the point:
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
 * Upper bound on a single auth request. A wedged dpc-api otherwise leaves the
 * form's submit button spinning until the browser gives up on its own.
 */
export const AUTH_REQUEST_TIMEOUT_MS = 8000;

export type AuthResult =
    | {status: 'authenticated'; token: string}
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
export const UNREACHABLE_MESSAGE =
    'We couldn’t reach the server. Please check your connection and try again.';

// AbortSignal.timeout is missing from a few older browsers; a request there is
// simply unbounded, as every request was before, rather than failing outright.
const timeoutSignal = (): AbortSignal | undefined =>
    typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function'
        ? AbortSignal.timeout(AUTH_REQUEST_TIMEOUT_MS)
        : undefined;

const isTimeout = (e: unknown): boolean =>
    e instanceof Error && (e.name === 'TimeoutError' || e.name === 'AbortError');

/**
 * A 5xx is "we do not know", not "no": treating it as a refusal would tell a
 * visitor their password is wrong during an outage. 429 is the same — the
 * service declined to look at the credentials at all.
 */
const isUnavailableStatus = (status: number): boolean => status >= 500 || status === 429;

const readToken = async (res: Response): Promise<string | null> => {
    try {
        const data: unknown = await res.json();
        if (typeof data === 'object' && data !== null && 'token' in data) {
            const token = (data as {token: unknown}).token;
            return typeof token === 'string' && token.length > 0 ? token : null;
        }
        return null;
    } catch {
        return null;
    }
};

const post = async (
    path: string,
    init: Omit<RequestInit, 'signal'>,
    refusedMessage: string,
    onOkWithoutToken: AuthResult
): Promise<AuthResult> => {
    let res: Response;
    try {
        res = await fetch(`${API_BASE}${path}`, {...init, signal: timeoutSignal()});
    } catch (e) {
        return {status: 'unavailable', message: isTimeout(e) ? TIMEOUT_MESSAGE : UNREACHABLE_MESSAGE};
    }
    if (res.ok) {
        const token = await readToken(res);
        return token ? {status: 'authenticated', token} : onOkWithoutToken;
    }
    if (isUnavailableStatus(res.status)) {
        return {status: 'unavailable', message: SERVICE_UNAVAILABLE_MESSAGE};
    }
    return {status: 'refused', message: refusedMessage};
};

const credentialsInit = (username: string, password: string): Omit<RequestInit, 'signal'> => ({
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({username, password}),
});

/** Create an account. Resolves to `authenticated` when dpc-api also logged it in. */
export const register = (username: string, password: string): Promise<AuthResult> =>
    post('/api/v1/auth/register', credentialsInit(username, password), REGISTER_REFUSED_MESSAGE, {
        status: 'registered',
        message: REGISTERED_LOGIN_NEEDED_MESSAGE,
    });

/** Log in with a username and password. */
export const login = (username: string, password: string): Promise<AuthResult> =>
    // A 2xx login with no token is not an answer either; nothing was issued.
    post('/api/v1/auth/login', credentialsInit(username, password), LOGIN_REFUSED_MESSAGE, {
        status: 'unavailable',
        message: SERVICE_UNAVAILABLE_MESSAGE,
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
            signal: timeoutSignal(),
        });
    } catch {
        // ignore: the caller clears the local token regardless
    }
};
