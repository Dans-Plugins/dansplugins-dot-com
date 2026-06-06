export type ColorMode = 'light' | 'dark';

// localStorage key under which the user's explicit color-mode choice is saved,
// so the selection survives navigation (full page loads) and return visits.
export const COLOR_MODE_STORAGE_KEY = 'dpc-color-mode';

const isColorMode = (value: string | null): value is ColorMode =>
    value === 'light' || value === 'dark';

// Decide the color mode to start in: honour a previously-saved explicit choice,
// otherwise fall back to the operating system's prefers-color-scheme setting.
// Kept pure (no window access) so it can be unit-tested and reused on both the
// initial client render and the toggle path.
export const resolveInitialColorMode = (
    stored: string | null,
    prefersDark: boolean
): ColorMode => {
    if (isColorMode(stored)) {
        return stored;
    }
    return prefersDark ? 'dark' : 'light';
};
