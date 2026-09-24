import {describe, expect, it} from 'vitest';
import {pluginCardStyle} from '../styles/styles';

// jsdom does no layout, so pin the style itself: a fixed card height let a
// card with several tags push Details/Download past its bottom edge.
describe('pluginCardStyle', () => {
    it('grows with its content instead of clipping the actions row', () => {
        expect(pluginCardStyle).not.toHaveProperty('maxHeight');
        expect(pluginCardStyle.height).toBe('100%');
        expect(pluginCardStyle.minHeight).toBe('18rem');
    });
});
