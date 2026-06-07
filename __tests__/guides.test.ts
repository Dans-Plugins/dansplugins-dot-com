import { describe, expect, it } from 'vitest';
import { wikiGuideUrl } from '../utils/guides';

describe('wikiGuideUrl', () => {
    it('appends /wiki/Guide to a repository link', () => {
        expect(wikiGuideUrl('https://github.com/Dans-Plugins/Fiefs'))
            .toBe('https://github.com/Dans-Plugins/Fiefs/wiki/Guide');
    });

    it('does not double up the slash when the link has a trailing slash', () => {
        expect(wikiGuideUrl('https://github.com/Dans-Plugins/Medieval-Factions/'))
            .toBe('https://github.com/Dans-Plugins/Medieval-Factions/wiki/Guide');
    });
});
