// @vitest-environment jsdom
//
// The link renderer behind guide and release-note markdown, mounted on its own.
// guideMarkdown.test.ts covers it through GuideMarkdown with a repository
// supplied; what is pinned here is what happens when the caller could not say
// which repository the markdown came from, or the author wrote no target.
import {afterEach, describe, expect, it} from 'vitest';
import {cleanup, render} from '@testing-library/react';

import RepoLink from '../components/RepoLink';

afterEach(cleanup);

const FIEFS = 'https://github.com/Dans-Plugins/Fiefs';

const anchor = (container: HTMLElement): HTMLAnchorElement => container.querySelector('a')!;

describe('RepoLink', () => {
    it('resolves a relative target against the repository and opens it in a new tab', () => {
        const {container} = render(<RepoLink href="COMMANDS.md" githubLink={FIEFS}>Commands</RepoLink>);
        const a = anchor(container);
        expect(a.getAttribute('href')).toBe('https://github.com/Dans-Plugins/Fiefs/blob/HEAD/COMMANDS.md');
        expect(a.getAttribute('target')).toBe('_blank');
        expect(a.getAttribute('rel')).toBe('noopener noreferrer');
        expect(a.textContent).toBe('Commands');
    });

    it('leaves the target as written when no repository is known', () => {
        const {container} = render(<RepoLink href="COMMANDS.md">Commands</RepoLink>);
        const a = anchor(container);
        expect(a.getAttribute('href')).toBe('COMMANDS.md');
        // Not an in-page anchor, so it is still treated as leaving the page.
        expect(a.getAttribute('target')).toBe('_blank');
        expect(a.getAttribute('rel')).toBe('noopener noreferrer');
    });

    it('keeps an in-page anchor in the page even with no repository', () => {
        const {container} = render(<RepoLink href="#commands">Commands</RepoLink>);
        const a = anchor(container);
        expect(a.getAttribute('href')).toBe('#commands');
        expect(a.getAttribute('target')).toBeNull();
        expect(a.getAttribute('rel')).toBeNull();
    });

    it('renders a link with no target in the page rather than a new tab', () => {
        const {container} = render(<RepoLink githubLink={FIEFS}>Broken</RepoLink>);
        const a = anchor(container);
        expect(a.getAttribute('href')).toBe('');
        expect(a.getAttribute('target')).toBeNull();
        expect(a.textContent).toBe('Broken');
    });

    it('passes the author\'s title through on both kinds of link', () => {
        const {container, rerender} = render(
            <RepoLink href="https://www.spigotmc.org/" githubLink={FIEFS} title="SpigotMC">Spigot</RepoLink>);
        expect(anchor(container).getAttribute('title')).toBe('SpigotMC');

        rerender(<RepoLink href="#top" githubLink={FIEFS} title="Back to top">Top</RepoLink>);
        expect(anchor(container).getAttribute('title')).toBe('Back to top');
    });
});
