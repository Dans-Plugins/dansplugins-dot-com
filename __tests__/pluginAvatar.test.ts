import {describe, expect, it} from 'vitest';
import pluginData from '../pages/data/plugins.json';
import {AVATAR_COLORS, colorForTitle} from '../utils/pluginAvatar';

describe('colorForTitle', () => {
    it('always picks a colour from the palette', () => {
        const offPalette = pluginData.plugins
            .map((plugin) => colorForTitle(plugin.title))
            .filter((color) => !AVATAR_COLORS.includes(color));

        expect(offPalette).toEqual([]);
    });

    it('gives the same title the same colour every time', () => {
        // The point of hashing the title rather than picking at random: a plugin
        // must look the same on its card and on its resource page.
        expect(colorForTitle('Medieval Factions')).toBe(colorForTitle('Medieval Factions'));
    });

    it('handles an empty title without falling off the palette', () => {
        expect(AVATAR_COLORS).toContain(colorForTitle(''));
    });
});
