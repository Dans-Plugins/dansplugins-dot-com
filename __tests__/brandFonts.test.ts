// The brand fonts are self-hosted by next/font (#615): the document must not
// link the Google Fonts stylesheet or preconnect to its hosts, and the font
// stacks the theme and components use must refer to the variables
// pages/_app.tsx sets from next/font's generated family names.
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, it} from 'vitest';
import {BODY_FONT_VAR, bodyFontFamily, HEADING_FONT_VAR, headingFontFamily} from '../styles/fontFamilies';

const source = (...parts: string[]) => readFileSync(join(__dirname, '..', ...parts), 'utf8');

describe('brand fonts', () => {
    it('loads no fonts from Google at page load', () => {
        const document = source('pages', '_document.tsx');
        expect(document).not.toMatch(/fonts\.googleapis\.com|fonts\.gstatic\.com/);
    });

    it('self-hosts Inter and Space Grotesk at the weights the theme uses', () => {
        const fonts = source('styles', 'fonts.ts');
        expect(fonts).toMatch(/from 'next\/font\/google'/);
        expect(fonts).toMatch(/Inter\(\{[^}]*weight: \['400', '500', '600', '700'\]/);
        expect(fonts).toMatch(/Space_Grotesk\(\{[^}]*weight: \['500', '600', '700'\]/);
    });

    it('sets the font variables on :root from next/font', () => {
        const app = source('pages', '_app.tsx');
        expect(app).toMatch(/\[BODY_FONT_VAR\]: inter\.style\.fontFamily/);
        expect(app).toMatch(/\[HEADING_FONT_VAR\]: spaceGrotesk\.style\.fontFamily/);
    });

    it('puts the self-hosted font first in each stack', () => {
        expect(bodyFontFamily.startsWith(`var(${BODY_FONT_VAR}),`)).toBe(true);
        expect(headingFontFamily.startsWith(`var(${HEADING_FONT_VAR}),`)).toBe(true);
    });
});
