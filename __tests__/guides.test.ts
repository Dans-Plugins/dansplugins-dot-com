import { describe, expect, it } from 'vitest';
import { userGuideUrl, userGuideRawUrl, resolveRepoLink } from '../utils/guides';

const FIEFS = 'https://github.com/Dans-Plugins/Fiefs';

describe('userGuideUrl', () => {
    it('points at USER_GUIDE.md on the default branch of the repo', () => {
        expect(userGuideUrl('https://github.com/Dans-Plugins/Fiefs'))
            .toBe('https://github.com/Dans-Plugins/Fiefs/blob/HEAD/USER_GUIDE.md');
    });

    it('does not double up the slash when the link has a trailing slash', () => {
        expect(userGuideUrl('https://github.com/Dans-Plugins/Medieval-Factions/'))
            .toBe('https://github.com/Dans-Plugins/Medieval-Factions/blob/HEAD/USER_GUIDE.md');
    });
});

describe('userGuideRawUrl', () => {
    it('points at the raw USER_GUIDE.md on the default branch', () => {
        expect(userGuideRawUrl('https://github.com/Dans-Plugins/Fiefs'))
            .toBe('https://raw.githubusercontent.com/Dans-Plugins/Fiefs/HEAD/USER_GUIDE.md');
    });

    it('does not double up the slash when the link has a trailing slash', () => {
        expect(userGuideRawUrl('https://github.com/Dans-Plugins/Medieval-Factions/'))
            .toBe('https://raw.githubusercontent.com/Dans-Plugins/Medieval-Factions/HEAD/USER_GUIDE.md');
    });
});

describe('resolveRepoLink', () => {
    // The eight guides that carry one of these are the whole reason the resolver
    // exists: rendered as written, `COMMANDS.md` resolves to /guides/COMMANDS.md
    // and the site answers 404.
    it('points a sibling markdown file back at the repository', () => {
        expect(resolveRepoLink(FIEFS, 'COMMANDS.md'))
            .toBe('https://github.com/Dans-Plugins/Fiefs/blob/HEAD/COMMANDS.md');
    });

    it('carries a fragment along with the rewritten path', () => {
        expect(resolveRepoLink(FIEFS, 'CONFIG.md#files-in-the-data-folder'))
            .toBe('https://github.com/Dans-Plugins/Fiefs/blob/HEAD/CONFIG.md#files-in-the-data-folder');
    });

    it('strips an explicit ./ prefix rather than doubling the slash', () => {
        expect(resolveRepoLink(FIEFS, './CONFIG.md'))
            .toBe('https://github.com/Dans-Plugins/Fiefs/blob/HEAD/CONFIG.md');
    });

    it('treats a root-relative path as repository-relative', () => {
        expect(resolveRepoLink(FIEFS, '/docs/FAQ.md'))
            .toBe('https://github.com/Dans-Plugins/Fiefs/blob/HEAD/docs/FAQ.md');
    });

    it('does not double up the slash when the repo link has a trailing slash', () => {
        expect(resolveRepoLink('https://github.com/Dans-Plugins/Fiefs/', 'FAQ.md'))
            .toBe('https://github.com/Dans-Plugins/Fiefs/blob/HEAD/FAQ.md');
    });

    it('leaves an absolute http(s) URL alone', () => {
        expect(resolveRepoLink(FIEFS, 'https://www.spigotmc.org/resources/fiefs-early-access.98559/'))
            .toBe('https://www.spigotmc.org/resources/fiefs-early-access.98559/');
    });

    it('leaves a non-http scheme alone', () => {
        expect(resolveRepoLink(FIEFS, 'mailto:dan@example.com')).toBe('mailto:dan@example.com');
    });

    it('leaves a protocol-relative URL alone', () => {
        expect(resolveRepoLink(FIEFS, '//example.com/x')).toBe('//example.com/x');
    });

    it('leaves an in-page anchor in the page', () => {
        expect(resolveRepoLink(FIEFS, '#commands')).toBe('#commands');
    });

    it('leaves an empty target alone rather than linking to the repository root', () => {
        expect(resolveRepoLink(FIEFS, '')).toBe('');
    });
});
