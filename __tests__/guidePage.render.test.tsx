/**
 * @vitest-environment jsdom
 */
// Renders /guides/[id] to pin what a reader sees around a plugin's guide: a
// single <h1> naming it, the way back to /guides and on to the plugin's page
// (in-site, same tab), the guide body when its markdown loaded, and — when it
// did not — a fallback that sends the reader to the guide on GitHub in a new
// tab. getServerSideProps is covered by guideId.getServerSideProps.test.ts;
// this file only exercises the rendered page.
import React from 'react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {cleanup, render, screen, within} from '@testing-library/react';

// The page shell pulls in TopBar, which reads the router; give it a plain one.
vi.mock('next/router', () => ({useRouter: () => ({pathname: '/guides/[id]', asPath: '/guides/medieval-factions', query: {}, push: vi.fn()})}));

import GuidePage from '../pages/guides/[id]';

const GITHUB = 'https://github.com/Dans-Plugins/Medieval-Factions';
const GUIDE_ON_GITHUB = `${GITHUB}/blob/HEAD/USER_GUIDE.md`;

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

const renderPage = (markdown: string | null) => {
    // The like button asks the API for its count; an empty answer is enough.
    vi.stubGlobal('fetch', vi.fn(async () => ({ok: false, status: 404, json: async () => ({})} as Response)));
    return render(<GuidePage id="medieval-factions" title="Medieval Factions" githubLink={GITHUB} markdown={markdown}/>);
};

describe('/guides/[id] page', () => {
    it('has exactly one <h1>, naming the guide, inside the main landmark', () => {
        // A guide that opens with its own `# ` title, as most USER_GUIDE.md
        // files do: GuideMarkdown demotes it to an <h2>, so the page keeps one <h1>.
        renderPage('# Medieval Factions User Guide\n\n## Usage\n\nRun /mf help.');

        const headings = screen.getAllByRole('heading', {level: 1});
        expect(headings.map((h) => h.textContent)).toEqual(['Medieval Factions Guide']);
        expect(within(screen.getByRole('main')).getByRole('heading', {level: 1})).toBe(headings[0]);
        expect(screen.getByRole('heading', {level: 2, name: 'Medieval Factions User Guide'})).toBeTruthy();
        expect(screen.getByRole('heading', {level: 3, name: 'Usage'})).toBeTruthy();
    });

    it('links back to /guides and on to the plugin page within the site, in the same tab', () => {
        renderPage('Run /mf help.');

        const main = screen.getByRole('main');
        const back = within(main).getByRole('link', {name: 'All guides'});
        expect(back.getAttribute('href')).toBe('/guides');
        expect(back.getAttribute('target')).toBeNull();

        // Linked both above the guide and again at its end.
        const pluginLinks = within(main).getAllByRole('link', {name: 'Medieval Factions plugin page'});
        expect(pluginLinks).toHaveLength(2);
        for (const link of pluginLinks) {
            expect(link.getAttribute('href')).toBe('/resources/medieval-factions');
            expect(link.getAttribute('target')).toBeNull();
        }
        expect(screen.getByTestId('guide-plugin-link')).toBe(pluginLinks[0]);
    });

    it('renders the loaded guide markdown and no load-failure notice', () => {
        renderPage('Run the sentinel-command-xyz to begin.');

        expect(screen.getByRole('main').textContent).toContain('Run the sentinel-command-xyz to begin.');
        expect(screen.queryByRole('alert')).toBeNull();
        expect(screen.queryByText(/couldn.t be loaded/)).toBeNull();
    });

    it('falls back to a notice linking the guide on GitHub, in a new tab, when the markdown did not load', () => {
        renderPage(null);

        const alert = screen.getByRole('alert');
        expect(alert.textContent).toContain('This guide couldn\'t be loaded right now');
        const view = within(alert).getByRole('link', {name: 'View on GitHub'});
        expect(view.getAttribute('href')).toBe(GUIDE_ON_GITHUB);
        expect(view.getAttribute('target')).toBe('_blank');
        expect(view.getAttribute('rel')).toBe('noopener noreferrer');
    });

    it('ends with a back-to-top anchor and a new-tab link to the guide on GitHub', () => {
        renderPage('Run /mf help.');

        const main = screen.getByRole('main');
        expect(within(main).getByRole('link', {name: 'Back to top'}).getAttribute('href')).toBe('#main');
        expect(main.id).toBe('main');

        const github = within(main).getByRole('link', {name: 'View this guide on GitHub'});
        expect(github.getAttribute('href')).toBe(GUIDE_ON_GITHUB);
        expect(github.getAttribute('target')).toBe('_blank');
        expect(github.getAttribute('rel')).toBe('noopener noreferrer');
    });
});
