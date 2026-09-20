import {afterEach, describe, expect, it, vi} from 'vitest';
import {PASSWORD_POLICY_MESSAGE, meetsPasswordPolicy, resetPassword} from '../services/passwordResetService';

afterEach(() => vi.unstubAllGlobals());

describe('meetsPasswordPolicy', () => {
    it("mirrors UserAuth's policy: length and all four character classes", () => {
        expect(meetsPasswordPolicy('NewPassword1!')).toBe(true);
        expect(meetsPasswordPolicy('short1!A')).toBe(true);
        expect(meetsPasswordPolicy('Short1!')).toBe(false);
        expect(meetsPasswordPolicy('nouppercase1!')).toBe(false);
        expect(meetsPasswordPolicy('NOLOWERCASE1!')).toBe(false);
        expect(meetsPasswordPolicy('NoDigits!!')).toBe(false);
        expect(meetsPasswordPolicy('NoSpecial11')).toBe(false);
        expect(meetsPasswordPolicy('A1!' + 'a'.repeat(126))).toBe(false);
    });
});

describe('resetPassword', () => {
    it('POSTs the token and password with no session, and is ok on 204', async () => {
        const fetchMock = vi.fn().mockResolvedValue({ok: true, status: 204} as Response);
        vi.stubGlobal('fetch', fetchMock);
        expect(await resetPassword('reset-1', 'NewPassword1!')).toEqual({ok: true});
        const [url, init] = fetchMock.mock.calls[0];
        expect(url).toMatch(/\/api\/v1\/auth\/password\/reset$/);
        expect(init.method).toBe('POST');
        expect(init.headers.Authorization).toBeUndefined();
        expect(JSON.parse(init.body)).toEqual({token: 'reset-1', newPassword: 'NewPassword1!'});
    });

    it('explains a refused token, a refused password, a rate limit, and an outage', async () => {
        for (const [status, fragment] of [[401, 'not valid'], [400, PASSWORD_POLICY_MESSAGE], [429, 'Too many'], [503, 'could not be reset']] as const) {
            vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ok: false, status} as Response));
            const result = await resetPassword('t', 'NewPassword1!');
            expect(result.ok).toBe(false);
            expect(!result.ok && result.message).toContain(fragment);
        }
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('down')));
        expect(await resetPassword('t', 'NewPassword1!')).toMatchObject({ok: false, message: expect.stringContaining("couldn't reach")});
    });
});
