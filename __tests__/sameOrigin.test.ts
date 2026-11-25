import {describe, expect, it} from 'vitest';
import {isSameOriginRequest} from '../utils/sameOrigin';

describe('isSameOriginRequest', () => {
    it('accepts an Origin naming the requested host', () => {
        expect(isSameOriginRequest({host: 'dansplugins.com', origin: 'https://dansplugins.com'})).toBe(true);
        expect(isSameOriginRequest({host: 'localhost:3000', origin: 'http://localhost:3000'})).toBe(true);
    });

    it('refuses an Origin naming another host, another port, or an opaque origin', () => {
        expect(isSameOriginRequest({host: 'dansplugins.com', origin: 'https://evil.example'})).toBe(false);
        expect(isSameOriginRequest({host: 'dansplugins.com', origin: 'https://dansplugins.com.evil.example'})).toBe(false);
        expect(isSameOriginRequest({host: 'localhost:3000', origin: 'http://localhost:4000'})).toBe(false);
        expect(isSameOriginRequest({host: 'dansplugins.com', origin: 'null'})).toBe(false);
    });

    it('does not fall back to Referer when a mismatched Origin is present', () => {
        expect(isSameOriginRequest({host: 'dansplugins.com', origin: 'https://evil.example', referer: 'https://dansplugins.com/'})).toBe(false);
    });

    it('accepts a same-host Referer when Origin is absent', () => {
        expect(isSameOriginRequest({host: 'dansplugins.com', referer: 'https://dansplugins.com/plugins/fiefs'})).toBe(true);
        expect(isSameOriginRequest({host: 'dansplugins.com', referer: 'https://evil.example/dansplugins.com'})).toBe(false);
    });

    it('fails closed with neither header, no Host, or a non-web scheme', () => {
        expect(isSameOriginRequest({host: 'dansplugins.com'})).toBe(false);
        expect(isSameOriginRequest({origin: 'https://dansplugins.com'})).toBe(false);
        expect(isSameOriginRequest({host: 'dansplugins.com', referer: 'ftp://dansplugins.com/'})).toBe(false);
    });

    it('compares hosts case-insensitively', () => {
        expect(isSameOriginRequest({host: 'DansPlugins.com', origin: 'https://dansplugins.com'})).toBe(true);
    });
});
