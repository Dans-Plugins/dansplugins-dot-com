import {afterEach, describe, expect, it, vi} from 'vitest';
import {
    AUTH_REQUEST_TIMEOUT_MS,
    LOGIN_REFUSED_MESSAGE,
    REGISTER_REFUSED_MESSAGE,
    REGISTER_REQUEST_TIMEOUT_MS,
    REGISTER_TIMEOUT_MESSAGE,
    REGISTERED_LOGIN_NEEDED_MESSAGE,
    SERVICE_UNAVAILABLE_MESSAGE,
    TIMEOUT_MESSAGE,
    UNREACHABLE_MESSAGE,
    login,
    logout,
    register,
} from '../services/authService';

const stubFetch = (response: Partial<Response>) => {
    const fetchMock = vi.fn().mockResolvedValue(response as Response);
    vi.stubGlobal('fetch', fetchMock);
    return fetchMock;
};

const rejectFetch = (error: Error) => {
    const fetchMock = vi.fn().mockRejectedValue(error);
    vi.stubGlobal('fetch', fetchMock);
    return fetchMock;
};

const timeoutError = () => {
    const e = new Error('The operation was aborted due to timeout');
    e.name = 'TimeoutError';
    return e;
};

afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

describe('login', () => {
    it('resolves to authenticated with the token pair on a 200 response', async () => {
        stubFetch({ok: true, status: 200, json: async () => ({token: 'jwt-123', refreshToken: 'rt-123'})});
        expect(await login('dan', 'hunter22')).toEqual({status: 'authenticated', token: 'jwt-123', refreshToken: 'rt-123'});
    });

    it('carries a null refresh token when the API issues none (an older dpc-api)', async () => {
        stubFetch({ok: true, status: 200, json: async () => ({token: 'jwt-123'})});
        expect(await login('dan', 'hunter22')).toEqual({status: 'authenticated', token: 'jwt-123', refreshToken: null});
    });

    it('posts the credentials as JSON to the login endpoint with a timeout signal', async () => {
        const fetchMock = stubFetch({ok: true, status: 200, json: async () => ({token: 't'})});
        await login('dan', 'hunter22');
        const [url, init] = fetchMock.mock.calls[0];
        expect(url).toMatch(/\/api\/v1\/auth\/login$/);
        expect(init).toMatchObject({
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({username: 'dan', password: 'hunter22'}),
        });
        expect(init.signal).toBeInstanceOf(AbortSignal);
    });

    it('treats a 401 as a refusal', async () => {
        stubFetch({ok: false, status: 401});
        expect(await login('dan', 'wrong')).toEqual({status: 'refused', message: LOGIN_REFUSED_MESSAGE});
    });

    it('treats a 400 as a refusal', async () => {
        stubFetch({ok: false, status: 400});
        expect(await login('', '')).toEqual({status: 'refused', message: LOGIN_REFUSED_MESSAGE});
    });

    // dpc-api answers 503 when UserAuth is unreachable. That is "nothing is
    // known", not "wrong password" — the message must not blame the visitor.
    it('treats a 503 as unavailable, not as invalid credentials', async () => {
        stubFetch({ok: false, status: 503});
        const result = await login('dan', 'hunter22');
        expect(result).toEqual({status: 'unavailable', message: SERVICE_UNAVAILABLE_MESSAGE});
        expect(result.status).not.toBe('refused');
    });

    it('treats a 500 as unavailable', async () => {
        stubFetch({ok: false, status: 500});
        expect(await login('dan', 'hunter22')).toEqual({
            status: 'unavailable',
            message: SERVICE_UNAVAILABLE_MESSAGE,
        });
    });

    it('treats a 429 as unavailable rather than a refusal', async () => {
        stubFetch({ok: false, status: 429});
        expect(await login('dan', 'hunter22')).toEqual({
            status: 'unavailable',
            message: SERVICE_UNAVAILABLE_MESSAGE,
        });
    });

    it('treats a 2xx with no token as unavailable', async () => {
        stubFetch({ok: true, status: 200, json: async () => ({})});
        expect(await login('dan', 'hunter22')).toEqual({
            status: 'unavailable',
            message: SERVICE_UNAVAILABLE_MESSAGE,
        });
    });

    it('treats a 2xx whose body is not JSON as unavailable', async () => {
        stubFetch({ok: true, status: 200, json: async () => { throw new SyntaxError('bad json'); }});
        expect(await login('dan', 'hunter22')).toEqual({
            status: 'unavailable',
            message: SERVICE_UNAVAILABLE_MESSAGE,
        });
    });

    it('reports a network failure as unreachable', async () => {
        rejectFetch(new TypeError('Failed to fetch'));
        expect(await login('dan', 'hunter22')).toEqual({status: 'unavailable', message: UNREACHABLE_MESSAGE});
    });

    it('reports a timed-out request distinctly from a connection failure', async () => {
        rejectFetch(timeoutError());
        expect(await login('dan', 'hunter22')).toEqual({status: 'unavailable', message: TIMEOUT_MESSAGE});
    });

    it('bounds the request with AbortSignal.timeout', async () => {
        const timeoutSpy = vi.spyOn(AbortSignal, 'timeout');
        stubFetch({ok: true, status: 200, json: async () => ({token: 't'})});
        await login('dan', 'hunter22');
        expect(timeoutSpy).toHaveBeenCalledWith(AUTH_REQUEST_TIMEOUT_MS);
    });
});

describe('register', () => {
    it('resolves to authenticated with the token on a 201 response', async () => {
        stubFetch({ok: true, status: 201, json: async () => ({token: 'jwt-new', refreshToken: 'rt-new'})});
        expect(await register('dan', 'hunter22')).toEqual({status: 'authenticated', token: 'jwt-new', refreshToken: 'rt-new'});
    });

    it('posts the credentials to the register endpoint', async () => {
        const fetchMock = stubFetch({ok: true, status: 201, json: async () => ({token: 't'})});
        await register('dan', 'hunter22');
        const [url, init] = fetchMock.mock.calls[0];
        expect(url).toMatch(/\/api\/v1\/auth\/register$/);
        expect(init).toMatchObject({
            method: 'POST',
            body: JSON.stringify({username: 'dan', password: 'hunter22'}),
        });
    });

    // AuthController.register answers 201 with `registered: true` and no token
    // when the account was created but the follow-up login failed.
    it('resolves to registered when the account was created without a token', async () => {
        stubFetch({
            ok: true,
            status: 201,
            json: async () => ({registered: true, tokenIssued: false, message: 'Account created, but automatic login failed. Please log in.'}),
        });
        expect(await register('dan', 'hunter22')).toEqual({
            status: 'registered',
            message: REGISTERED_LOGIN_NEEDED_MESSAGE,
        });
    });

    it('treats a 409 (name taken) as a refusal', async () => {
        stubFetch({ok: false, status: 409});
        expect(await register('dan', 'hunter22')).toEqual({
            status: 'refused',
            message: REGISTER_REFUSED_MESSAGE,
        });
    });

    it('treats a 400 (weak password) as a refusal', async () => {
        stubFetch({ok: false, status: 400});
        expect(await register('dan', 'short')).toEqual({
            status: 'refused',
            message: REGISTER_REFUSED_MESSAGE,
        });
    });

    it('treats a 503 as unavailable, not as a bad username or password', async () => {
        stubFetch({ok: false, status: 503});
        const result = await register('dan', 'hunter22');
        expect(result).toEqual({status: 'unavailable', message: SERVICE_UNAVAILABLE_MESSAGE});
        expect(result.status).not.toBe('refused');
    });

    it('treats a 429 as unavailable', async () => {
        stubFetch({ok: false, status: 429});
        expect(await register('dan', 'hunter22')).toEqual({
            status: 'unavailable',
            message: SERVICE_UNAVAILABLE_MESSAGE,
        });
    });

    it('reports a network failure as unreachable', async () => {
        rejectFetch(new TypeError('Failed to fetch'));
        expect(await register('dan', 'hunter22')).toEqual({
            status: 'unavailable',
            message: UNREACHABLE_MESSAGE,
        });
    });

    // The account may already exist server-side when the client gives up, so
    // the message steers the visitor to log in rather than re-register.
    it('reports a timed-out request with the register-specific message', async () => {
        rejectFetch(timeoutError());
        expect(await register('dan', 'hunter22')).toEqual({
            status: 'unavailable',
            message: REGISTER_TIMEOUT_MESSAGE,
        });
    });

    // dpc-api makes two sequential UserAuth calls for a registration, each
    // with its own 5 s connect + 10 s read budget, so the bound is longer
    // than login's.
    it('bounds the request with the longer registration timeout', async () => {
        const timeoutSpy = vi.spyOn(AbortSignal, 'timeout');
        stubFetch({ok: true, status: 201, json: async () => ({token: 't'})});
        await register('dan', 'hunter22');
        expect(timeoutSpy).toHaveBeenCalledWith(REGISTER_REQUEST_TIMEOUT_MS);
        expect(REGISTER_REQUEST_TIMEOUT_MS).toBeGreaterThan(AUTH_REQUEST_TIMEOUT_MS);
    });
});

describe('logout', () => {
    it('posts the bearer token to the logout endpoint', async () => {
        const timeoutSpy = vi.spyOn(AbortSignal, 'timeout');
        const fetchMock = stubFetch({ok: true, status: 200});
        await logout('my-token');
        const [url, init] = fetchMock.mock.calls[0];
        expect(url).toMatch(/\/api\/v1\/auth\/logout$/);
        expect(init).toMatchObject({method: 'POST', headers: {Authorization: 'Bearer my-token'}});
        expect(init.signal).toBeInstanceOf(AbortSignal);
        expect(timeoutSpy).toHaveBeenCalledWith(AUTH_REQUEST_TIMEOUT_MS);
    });

    it('resolves without throwing on a non-ok response', async () => {
        stubFetch({ok: false, status: 401});
        await expect(logout('stale')).resolves.toBeUndefined();
    });

    it('resolves without throwing when fetch rejects', async () => {
        rejectFetch(new TypeError('Failed to fetch'));
        await expect(logout('token')).resolves.toBeUndefined();
    });
});
