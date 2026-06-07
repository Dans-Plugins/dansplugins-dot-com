import { describe, expect, it } from 'vitest';
import { isActiveNavLink } from '../utils/nav';

describe('isActiveNavLink', () => {
    it('marks an internal link active when it matches the current route', () => {
        expect(isActiveNavLink('/news', '/news')).toBe(true);
        expect(isActiveNavLink('/', '/')).toBe(true);
    });

    it('does not mark an internal link active on a different route', () => {
        expect(isActiveNavLink('/news', '/about')).toBe(false);
        expect(isActiveNavLink('/', '/news')).toBe(false);
    });

    it('never marks an external link active, even on a matching string', () => {
        expect(isActiveNavLink('https://discord.gg/xXtuAQ2', 'https://discord.gg/xXtuAQ2')).toBe(false);
        expect(isActiveNavLink('/', 'https://github.com/Dans-Plugins')).toBe(false);
    });
});
