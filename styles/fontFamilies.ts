// The font-family stacks the theme and components use for the brand fonts.
//
// The fonts themselves are self-hosted by next/font (styles/fonts.ts), which
// gives each family a generated name such as "__Inter_d65c78" plus a
// size-adjusted fallback face. pages/_app.tsx publishes those names as the
// CSS variables below, so every stack here refers to the variable rather than
// to the family's plain name. This module holds strings only, so components
// and their tests can import it without pulling in next/font.
export const BODY_FONT_VAR = '--font-body';
export const HEADING_FONT_VAR = '--font-heading';

/** Inter, for body text and the theme's default. */
export const bodyFontFamily = `var(${BODY_FONT_VAR}), system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;

/** Space Grotesk, for headings and display text. */
export const headingFontFamily = `var(${HEADING_FONT_VAR}), system-ui, sans-serif`;
