import type {IncomingHttpHeaders} from 'http';

// The visitor's address, for keying the visit counter's rate limit and
// de-duplication (utils/visitCounter.ts). Never stored or reported anywhere.
//
// In production the site sits behind the gateway's Traefik, so the socket peer
// is Traefik itself and every visitor would share one bucket. Traefik does not
// trust forwarded headers from the internet: it drops any X-Forwarded-For the
// client sent and sets its own, holding the address it saw. The address is
// therefore the RIGHTMOST X-Forwarded-For entry, the one the nearest proxy
// appended. The leftmost entry is whatever the client chose to write, and
// keying on it would hand a caller a fresh identity per request.
//
// With no X-Forwarded-For (local `next dev`, a direct connection) the socket
// peer is the client. Returns null when neither is known.

export interface AddressedRequest {
    headers: IncomingHttpHeaders;
    socket?: {remoteAddress?: string | undefined} | null;
}

// IPv4 clients on a dual-stack socket appear as `::ffff:203.0.113.7`.
const normalise = (address: string): string => address.trim().replace(/^::ffff:(?=\d+\.\d+\.\d+\.\d+$)/i, '');

export const clientAddress = (req: AddressedRequest): string | null => {
    const header = req.headers['x-forwarded-for'];
    const forwarded = (Array.isArray(header) ? header.join(',') : header ?? '')
        .split(',')
        .map((entry) => entry.trim())
        .filter((entry) => entry !== '');
    if (forwarded.length > 0) {
        return normalise(forwarded[forwarded.length - 1]);
    }
    const peer = req.socket?.remoteAddress;
    return peer ? normalise(peer) : null;
};
