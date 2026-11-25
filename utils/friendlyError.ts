// Plain-language wording for a failed dpc-api request, shared by every page
// and service that used to show a bare "Request failed (HTTP 500)". A visitor
// can act on "sign in again" or "try again in a minute"; a status code alone
// tells them nothing (Nielsen #9: say what went wrong and what to do next).
// The code stays at the end in brackets so a bug report can still quote it.

/** What a visitor should read when dpc-api answered `status` to an action. */
export const friendlyHttpError = (status: number, action = 'That'): string => {
    const code = ` (HTTP ${status})`;
    if (status === 401) {
        return `Your session has expired. Please sign in again.${code}`;
    }
    if (status === 403) {
        return `Your account isn’t allowed to do that.${code}`;
    }
    if (status === 404) {
        return `That could not be found. It may have been removed.${code}`;
    }
    if (status === 429) {
        return `Too many attempts. Please wait a minute and try again.${code}`;
    }
    if (status >= 500) {
        return `The server had a problem, so ${lowerFirst(action)} didn’t work. Please try again in a moment.${code}`;
    }
    return `${action} didn’t work. Please try again.${code}`;
};

/** The message for a request that never reached dpc-api (offline, DNS, CORS). */
export const NETWORK_ERROR_MESSAGE = 'We couldn’t reach the server. Please check your connection and try again.';

const lowerFirst = (text: string): string =>
    text === 'That' ? 'that' : text.charAt(0).toLowerCase() + text.slice(1);
