import type {IncomingHttpHeaders} from 'http';

// Whether a state-changing request came from one of the site's own pages.
//
// Browsers send `Origin` on every POST made with fetch or a form, same-origin
// included, and send `Referer` when they leave `Origin` out. Either must name
// the host the request was sent to (the `Host` header, which the gateway's
// Traefik passes through unchanged). A request carrying neither is refused:
// the check fails closed. The host is compared rather than NEXT_PUBLIC_BASE_URL
// because that variable falls back to `http://localhost:3000` when unset
// (utils/seo.ts), and a deployment without it would otherwise refuse every
// real visitor.
//
// This stops other websites from driving visitors' browsers at the route. It
// does not stop a script that writes its own headers; the rate limit and the
// per-address de-duplication in utils/visitCounter.ts bound that.

const hostOf = (url: string): string | null => {
    try {
        const parsed = new URL(url);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.host.toLowerCase() : null;
    } catch {
        return null;
    }
};

const single = (value: string | string[] | undefined): string | undefined =>
    Array.isArray(value) ? value[0] : value;

export const isSameOriginRequest = (headers: IncomingHttpHeaders): boolean => {
    const host = single(headers.host)?.trim().toLowerCase();
    if (!host) {
        return false;
    }
    const origin = single(headers.origin);
    if (origin !== undefined) {
        // An opaque origin ("null": sandboxed frames, some redirects) is refused.
        return hostOf(origin) === host;
    }
    const referer = single(headers.referer);
    return referer !== undefined && hostOf(referer) === host;
};
