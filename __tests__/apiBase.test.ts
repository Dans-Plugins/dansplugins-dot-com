import {afterEach, describe, expect, it, vi} from 'vitest';
import {DEFAULT_API_BASE_URL, getApiBaseUrl} from '../utils/apiBase';

describe('getApiBaseUrl', () => {
    afterEach(() => {
        vi.unstubAllEnvs();
        vi.unstubAllGlobals();
    });

    // The suite's default environment is node, so `window` is already absent
    // here — the same condition the Next.js server renders under.
    describe('while rendering on the server', () => {
        it('uses NEXT_PUBLIC_API_URL when it is set', () => {
            vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://api.dansplugins.com');
            vi.stubEnv('DPC_API_INTERNAL_URL', '');
            expect(getApiBaseUrl()).toBe('https://api.dansplugins.com');
        });

        it('falls back to the local dev-portal default when it is unset or empty', () => {
            vi.stubEnv('NEXT_PUBLIC_API_URL', '');
            vi.stubEnv('DPC_API_INTERNAL_URL', '');
            expect(getApiBaseUrl()).toBe(DEFAULT_API_BASE_URL);
        });

        it('prefers DPC_API_INTERNAL_URL over the public URL', () => {
            vi.stubEnv('NEXT_PUBLIC_API_URL', 'http://localhost:45345');
            vi.stubEnv('DPC_API_INTERNAL_URL', 'http://dpc-api:8080');
            expect(getApiBaseUrl()).toBe('http://dpc-api:8080');
        });
    });

    describe('in the browser', () => {
        it('ignores DPC_API_INTERNAL_URL, which names an origin only the server can reach', () => {
            vi.stubGlobal('window', {});
            vi.stubEnv('NEXT_PUBLIC_API_URL', 'http://localhost:45345');
            vi.stubEnv('DPC_API_INTERNAL_URL', 'http://dpc-api:8080');
            expect(getApiBaseUrl()).toBe('http://localhost:45345');
        });

        it('still falls back to the local dev-portal default', () => {
            vi.stubGlobal('window', {});
            vi.stubEnv('NEXT_PUBLIC_API_URL', '');
            vi.stubEnv('DPC_API_INTERNAL_URL', 'http://dpc-api:8080');
            expect(getApiBaseUrl()).toBe(DEFAULT_API_BASE_URL);
        });
    });
});
