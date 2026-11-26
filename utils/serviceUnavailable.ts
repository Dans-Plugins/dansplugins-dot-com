import type {ServerResponse} from 'http';

/**
 * How long a client or crawler is asked to wait before retrying a page that
 * answered 503. The catalogue cache retries dpc-api on the next render anyway,
 * so this is a hint, not a lockout.
 */
export const RETRY_AFTER_SECONDS = 60;

/** The props a page renders when its upstream could not be read at all. */
export interface UnavailableProps {
    unavailable: true;
}

export const isUnavailable = (props: object): props is UnavailableProps =>
    (props as Partial<UnavailableProps>).unavailable === true;

/**
 * getServerSideProps' answer when dpc-api is down and the page has nothing to
 * render from: HTTP 503 with Retry-After, and noindex on the response too, so
 * a crawler keeps the real page rather than replacing it with the outage
 * notice. (Issue #612: this used to be a 404, which told visitors and search
 * engines the plugin was gone.) A plugin the catalogue genuinely lacks is
 * still a 404; this is only for "could not ask".
 */
export const serviceUnavailable = (res: ServerResponse): {props: UnavailableProps} => {
    res.statusCode = 503;
    res.setHeader('Retry-After', String(RETRY_AFTER_SECONDS));
    res.setHeader('X-Robots-Tag', 'noindex');
    return {props: {unavailable: true}};
};
