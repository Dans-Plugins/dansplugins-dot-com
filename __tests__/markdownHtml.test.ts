import {readdirSync, readFileSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, it} from 'vitest';
import {withChangelogHtml} from '../utils/markdownHtml';
import type {PluginVersion} from '../services/pluginVersionService';

const release = (tag: string, changelog: string | null, htmlUrl: string): PluginVersion => ({
    tag,
    name: null,
    changelog,
    htmlUrl,
    prerelease: false,
    publishedAt: '2026-09-01T00:00:00Z',
    downloadCount: 0,
    siteDownloadCount: 0,
    assets: [],
});

describe('withChangelogHtml', () => {
    it('renders each release body, resolving links against that release\'s repository', () => {
        const [rendered] = withChangelogHtml([
            release('v1.0.0', '### Fixed\n- See [Config](CONFIG.md)', 'https://github.com/Dans-Plugins/Fiefs/releases/tag/v1.0.0'),
        ]);
        expect(rendered.changelogHtml).toContain('<h3');
        expect(rendered.changelogHtml).toContain('href="https://github.com/Dans-Plugins/Fiefs/blob/HEAD/CONFIG.md"');
        // The markdown itself is kept: the release-gates panel reads it.
        expect(rendered.changelog).toBe('### Fixed\n- See [Config](CONFIG.md)');
    });

    it('gives a release with no notes null rather than an empty body', () => {
        const [rendered] = withChangelogHtml([release('v1.0.0', null, 'https://github.com/Dans-Plugins/Fiefs/releases/tag/v1.0.0')]);
        expect(rendered.changelogHtml).toBeNull();
    });

    it('does not parse raw HTML in a release body', () => {
        const [rendered] = withChangelogHtml([release('v1.0.0', 'Text <script>alert(1)</script>', '')]);
        expect(rendered.changelogHtml).not.toContain('<script>');
    });
});

// The point of rendering markdown on the server is that markdown-to-jsx stays
// out of the browser bundle. Components are bundled for the browser, so none
// may import the library or the server renderer (a type-only import is erased
// and is fine).
describe('markdown stays out of client components', () => {
    const dir = join(__dirname, '..', 'components');
    for (const file of readdirSync(dir).filter((name) => name.endsWith('.tsx'))) {
        it(`${file} does not import markdown-to-jsx or the server renderer`, () => {
            const source = readFileSync(join(dir, file), 'utf8');
            expect(source).not.toMatch(/from\s+'markdown-to-jsx'/);
            expect(source).not.toMatch(/^import\s+\{[^}]*\}\s+from\s+'\.\.\/utils\/markdownHtml'/m);
        });
    }
});
