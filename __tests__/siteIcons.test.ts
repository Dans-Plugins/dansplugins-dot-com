// The icons and web manifest pages/_document.tsx links to: each must exist in
// public/ and be the size it claims, so a browser or home screen never gets a
// broken or blurry icon.
import {existsSync, readFileSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, it} from 'vitest';

const PUBLIC = join(__dirname, '..', 'public');

const pngSize = (file: string): string => {
    const bytes = readFileSync(join(PUBLIC, file));
    expect(bytes.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
    return `${bytes.readUInt32BE(16)}x${bytes.readUInt32BE(20)}`;
};

describe('site icons', () => {
    it('links only to files that exist in public/', () => {
        const documentSource = readFileSync(join(__dirname, '..', 'pages', '_document.tsx'), 'utf8');
        const hrefs = Array.from(documentSource.matchAll(/rel="(?:icon|apple-touch-icon|manifest)"\s+href="([^"]+)"/g))
            .map((match) => match[1]);
        expect(hrefs).toEqual(['/favicon.ico', '/icon.svg', '/apple-touch-icon.png', '/site.webmanifest']);
        hrefs.forEach((href) => expect(existsSync(join(PUBLIC, href))).toBe(true));
    });

    it('serves a 180x180 apple-touch-icon', () => {
        expect(pngSize('apple-touch-icon.png')).toBe('180x180');
    });

    it('lists manifest icons that exist at the sizes declared', () => {
        const manifest = JSON.parse(readFileSync(join(PUBLIC, 'site.webmanifest'), 'utf8'));
        expect(manifest.name).toBe("Dan's Plugins Community");
        expect(manifest.start_url).toBe('/');
        const pngs = manifest.icons.filter((icon: {type: string}) => icon.type === 'image/png');
        expect(pngs.length).toBeGreaterThan(0);
        pngs.forEach((icon: {src: string; sizes: string}) => {
            expect(pngSize(icon.src.replace(/^\//, ''))).toBe(icon.sizes);
        });
        expect(manifest.icons.some((icon: {purpose?: string}) => icon.purpose === 'maskable')).toBe(true);
    });

    it('serves a favicon.ico carrying 16, 32 and 48 pixel images', () => {
        const ico = readFileSync(join(PUBLIC, 'favicon.ico'));
        const count = ico.readUInt16LE(4);
        const sizes = Array.from({length: count}, (_, i) => ico[6 + i * 16] || 256);
        expect(sizes).toEqual(expect.arrayContaining([16, 32, 48]));
    });
});
