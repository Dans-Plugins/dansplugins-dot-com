import {describe, expect, it} from 'vitest';
import {clientAddress} from '../utils/clientAddress';

describe('clientAddress', () => {
    it('takes the rightmost X-Forwarded-For entry, the one the nearest proxy appended', () => {
        expect(clientAddress({headers: {'x-forwarded-for': '198.51.100.1, 203.0.113.7'}})).toBe('203.0.113.7');
    });

    it('ignores the leftmost entry, which the client can write', () => {
        const spoofed = (n: number) => clientAddress({headers: {'x-forwarded-for': `10.0.0.${n}, 203.0.113.7`}});
        expect(spoofed(1)).toBe(spoofed(2));
    });

    it('prefers X-Forwarded-For over the socket peer, which is the proxy', () => {
        expect(clientAddress({headers: {'x-forwarded-for': '203.0.113.7'}, socket: {remoteAddress: '172.18.0.2'}})).toBe('203.0.113.7');
    });

    it('falls back to the socket peer without X-Forwarded-For, unwrapping IPv4-mapped addresses', () => {
        expect(clientAddress({headers: {}, socket: {remoteAddress: '::ffff:192.0.2.5'}})).toBe('192.0.2.5');
        expect(clientAddress({headers: {'x-forwarded-for': ' , '}, socket: {remoteAddress: '2001:db8::1'}})).toBe('2001:db8::1');
    });

    it('returns null when no address is known', () => {
        expect(clientAddress({headers: {}})).toBeNull();
    });
});
