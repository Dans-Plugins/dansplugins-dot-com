import { describe, expect, it } from 'vitest';
import { userGuideUrl, userGuideRawUrl } from '../utils/guides';

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
