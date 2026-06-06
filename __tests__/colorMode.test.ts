import { describe, expect, it } from 'vitest';
import { resolveInitialColorMode } from '../utils/colorMode';

describe('resolveInitialColorMode', () => {
    it('honours a saved "light" choice regardless of OS preference', () => {
        expect(resolveInitialColorMode('light', true)).toBe('light');
        expect(resolveInitialColorMode('light', false)).toBe('light');
    });

    it('honours a saved "dark" choice regardless of OS preference', () => {
        expect(resolveInitialColorMode('dark', true)).toBe('dark');
        expect(resolveInitialColorMode('dark', false)).toBe('dark');
    });

    it('falls back to the OS preference when nothing is saved', () => {
        expect(resolveInitialColorMode(null, true)).toBe('dark');
        expect(resolveInitialColorMode(null, false)).toBe('light');
    });

    it('ignores an unrecognised stored value and uses the OS preference', () => {
        expect(resolveInitialColorMode('purple', false)).toBe('light');
        expect(resolveInitialColorMode('', true)).toBe('dark');
    });
});
