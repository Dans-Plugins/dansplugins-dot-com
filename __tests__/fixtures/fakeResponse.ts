import type {ServerResponse} from 'http';

/**
 * Just enough of Node's ServerResponse for getServerSideProps to set a status
 * and headers on, with the headers readable back (lower-cased, as Node keeps
 * them).
 */
export const fakeResponse = (): ServerResponse & {headers: Record<string, string>} => {
    const headers: Record<string, string> = {};
    return {
        statusCode: 200,
        headers,
        setHeader(name: string, value: string) {
            headers[name.toLowerCase()] = value;
            return this;
        },
    } as unknown as ServerResponse & {headers: Record<string, string>};
};
