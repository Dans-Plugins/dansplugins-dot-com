import {afterEach, describe, expect, it, vi} from 'vitest';
import {DEFAULT_API_BASE_URL, getApiBaseUrl} from '../utils/apiBase';

describe('getApiBaseUrl', () => {
    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it('uses NEXT_PUBLIC_API_URL when it is set', () => {
        vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://api.dansplugins.com');
        expect(getApiBaseUrl()).toBe('https://api.dansplugins.com');
    });

    it('falls back to the local dev-portal default when it is unset or empty', () => {
        vi.stubEnv('NEXT_PUBLIC_API_URL', '');
        expect(getApiBaseUrl()).toBe(DEFAULT_API_BASE_URL);
    });
});
