import {getApiBaseUrl} from '../utils/apiBase';

/**
 * Redeems an operator-issued password reset token (`POST /api/v1/auth/password/reset`,
 * proxied by dpc-api to UserAuth). Runs in the browser, needs no session — the
 * whole point is that the caller cannot sign in — and never throws.
 */
export type ResetResult = {ok: true} | {ok: false; message: string};

/** UserAuth's password policy, mirrored so the form can say so before a round trip. */
export const PASSWORD_POLICY_MESSAGE =
    '8–128 characters with a lowercase letter, an uppercase letter, a digit, and a special character';

export const meetsPasswordPolicy = (password: string): boolean =>
    password.length >= 8 && password.length <= 128 &&
    /[a-z]/.test(password) && /[A-Z]/.test(password) && /\d/.test(password) && /[^a-zA-Z0-9]/.test(password);

export const resetPassword = async (token: string, newPassword: string): Promise<ResetResult> => {
    let res: Response;
    try {
        res = await fetch(`${getApiBaseUrl()}/api/v1/auth/password/reset`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({token, newPassword}),
        });
    } catch {
        return {ok: false, message: "We couldn't reach the server. Please check your connection and try again."};
    }
    if (res.ok) {
        return {ok: true};
    }
    if (res.status === 401) {
        return {ok: false, message: 'That reset token is not valid: it may have expired, been used already, or been replaced by a newer one. Ask an admin for a fresh one.'};
    }
    if (res.status === 400) {
        return {ok: false, message: `The new password was refused: ${PASSWORD_POLICY_MESSAGE}.`};
    }
    if (res.status === 429) {
        return {ok: false, message: 'Too many attempts. Please wait a minute and try again.'};
    }
    return {ok: false, message: 'The password could not be reset right now. Please try again shortly.'};
};
