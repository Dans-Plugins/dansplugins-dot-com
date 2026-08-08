// The fallback avatar shown for a plugin that has no icon file, and the tinted
// backdrop behind the ones that do. Lives here rather than inside a component so
// the plugin card and the resource page give the same plugin the same colour —
// two definitions would drift the first time one of them was edited.

// A small, fixed palette of muted brand-ish colours.
export const AVATAR_COLORS = ['#4263eb', '#7048e8', '#1098ad', '#f59f00', '#e8590c', '#0ca678'];

/**
 * Pick a stable colour for a plugin from its title, so a plugin looks the same
 * on every page and across renders rather than being randomly assigned.
 */
export const colorForTitle = (title: string): string => {
    let hash = 0;
    for (let i = 0; i < title.length; i++) {
        hash = (hash * 31 + title.charCodeAt(i)) >>> 0;
    }
    return AVATAR_COLORS[hash % AVATAR_COLORS.length];
};
