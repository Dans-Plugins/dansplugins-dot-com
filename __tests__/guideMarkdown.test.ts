import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe, expect, it} from 'vitest';
import GuideMarkdown from '../components/GuideMarkdown';
import {renderGuideMarkdown} from '../utils/markdownHtml';

// The resolver in utils/guides.ts is unit-tested next door; what is checked here
// is that the guide renderer actually applies it, which is the half that broke.
// The markdown is rendered the way the page renders it — to HTML on the server
// by renderGuideMarkdown, then injected by GuideMarkdown — rather than mounted
// in a DOM, so no browser environment is needed.
// JSX is avoided so the file stays a .ts and is picked up by the existing
// `__tests__/**/*.test.ts` include in vitest.config.ts.

const FIEFS = 'https://github.com/Dans-Plugins/Fiefs';

const render = (markdown: string, githubLink = FIEFS): string =>
    renderToStaticMarkup(createElement(GuideMarkdown, {html: renderGuideMarkdown(markdown, githubLink)}));

describe('GuideMarkdown', () => {
    it('rewrites a repository-relative link so it does not 404 on the site', () => {
        const html = render('See [Commands](COMMANDS.md).');
        expect(html).toContain('href="https://github.com/Dans-Plugins/Fiefs/blob/HEAD/COMMANDS.md"');
        expect(html).not.toContain('href="COMMANDS.md"');
    });

    it('resolves against the repository it was given, not a fixed one', () => {
        const html = render('[Config](CONFIG.md)', 'https://github.com/Dans-Plugins/Wild-Pets');
        expect(html).toContain('href="https://github.com/Dans-Plugins/Wild-Pets/blob/HEAD/CONFIG.md"');
    });

    it('opens a link that leaves the site in a new tab, with rel="noopener noreferrer"', () => {
        const html = render('[SpigotMC](https://www.spigotmc.org/resources/fiefs-early-access.98559/)');
        expect(html).toContain('target="_blank"');
        expect(html).toContain('rel="noopener noreferrer"');
    });

    it('keeps an in-page anchor in the page', () => {
        const html = render('[Commands](#commands)');
        expect(html).toContain('href="#commands"');
        expect(html).not.toContain('target="_blank"');
    });

    it('does not parse raw HTML in a fetched guide', () => {
        const html = render('Text <b>bold</b> more');
        expect(html).not.toContain('<b>bold</b>');
        expect(html).toContain('&lt;b&gt;bold&lt;/b&gt;');
    });

    it('still renders ordinary markdown', () => {
        const html = render('# Heading\n\nA paragraph.');
        expect(html).toContain('<h2');
        expect(html).toContain('A paragraph.');
    });

    it('renders each heading one level down, under the page title', () => {
        // The guide page supplies the only <h1>; a guide's own `# Title`
        // must not add a second one, and its sections keep their order.
        const html = render('# Title\n\n## Section\n\n### Sub');
        expect(html).not.toContain('<h1');
        expect(html).toMatch(/<h2[^>]*>Title<\/h2>/);
        expect(html).toMatch(/<h3[^>]*>Section<\/h3>/);
        expect(html).toMatch(/<h4[^>]*>Sub<\/h4>/);
    });
});
