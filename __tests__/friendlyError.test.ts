import {describe, expect, it} from 'vitest';
import {friendlyHttpError} from '../utils/friendlyError';

// The plain-language wording shown when dpc-api refuses an action, in place of
// a bare "Request failed (HTTP 500)". Each keeps the code for bug reports.
describe('friendlyHttpError', () => {
    it('asks for a fresh sign-in on a 401', () => {
        expect(friendlyHttpError(401, 'Saving your profile')).toBe('Your session has expired. Please sign in again. (HTTP 401)');
    });

    it('says the account may not do it on a 403', () => {
        expect(friendlyHttpError(403)).toBe('Your account isn’t allowed to do that. (HTTP 403)');
    });

    it('says to wait on a 429', () => {
        expect(friendlyHttpError(429)).toContain('wait a minute');
    });

    it('names the action and blames the server on a 5xx', () => {
        expect(friendlyHttpError(503, 'Saving your profile'))
            .toBe('The server had a problem, so saving your profile didn’t work. Please try again in a moment. (HTTP 503)');
        expect(friendlyHttpError(500)).toContain('so that didn’t work');
    });

    it('falls back to the action and the code for anything else', () => {
        expect(friendlyHttpError(400, 'Creating the API key')).toBe('Creating the API key didn’t work. Please try again. (HTTP 400)');
    });
});
