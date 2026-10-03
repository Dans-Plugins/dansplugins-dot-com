/**
 * @vitest-environment jsdom
 */
import React from 'react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {cleanup, render, screen, within} from '@testing-library/react';

// The page shell pulls in TopBar, which reads the router; give it a plain one.
vi.mock('next/router', () => ({useRouter: () => ({pathname: '/resources/[slug]', asPath: '/resources/x', query: {}, push: vi.fn()})}));

import ResourcePage from '../pages/resources/[slug]';

const plugin = (slug: string, title: string) => ({slug, title, description: `${title} does a thing.`, icon: null});

// The props getServerSideProps would hand the page, with every live figure absent.
const props = (overrides: Record<string, unknown>) => ({
    slug: 'medieval-factions', title: 'Medieval Factions', description: 'Feudal groups.',
    githubLink: 'https://github.com/Dans-Plugins/Medieval-Factions', spigotmcLink: null, icon: null,
    serverCount: null, latestVersion: null, testedVersions: null, spigotRating: null, spigotDownloads: null,
    versions: [], downloads: null, firstReleasedAt: null, lastUpdatedAt: null, tags: ['factions'],
    requires: [], expansions: [], related: [],
    ...overrides,
});

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

const renderPage = (overrides: Record<string, unknown>) => {
    // The like button asks the API for its count; an empty answer is enough.
    vi.stubGlobal('fetch', vi.fn(async () => ({ok: false, status: 404, json: async () => ({})} as Response)));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return render(<ResourcePage {...(props(overrides) as any)}/>);
};

describe('resource page expansions and requirements', () => {
    it('lists the expansions above the related plugins, each linking to its page', () => {
        renderPage({
            expansions: [plugin('currencies', 'Currencies'), plugin('fiefs', 'Fiefs')],
            related: [plugin('medieval-cookery', 'Medieval Cookery')],
        });

        const expansions = screen.getByTestId('expansions');
        expect(within(expansions).getByRole('heading', {name: 'Expansions'})).toBeTruthy();
        expect(expansions.textContent).toContain('Plugins that build on Medieval Factions and need it installed.');
        const links = within(expansions).getAllByRole('link');
        expect(links.map((a) => a.getAttribute('href'))).toEqual(['/resources/currencies', '/resources/fiefs']);
        expect(links[0].textContent).toContain('Currencies does a thing.');

        const related = screen.getByTestId('related-plugins');
        // Expansions come first in document order.
        expect(expansions.compareDocumentPosition(related) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        expect(within(related).getAllByRole('link').map((a) => a.getAttribute('href'))).toEqual(['/resources/medieval-cookery']);
    });

    it('shows no Expansions block or Requires line for a plugin with neither', () => {
        renderPage({});
        expect(screen.queryByTestId('expansions')).toBeNull();
        expect(screen.queryByTestId('requires')).toBeNull();
    });

    it('says what an add-on requires, linking back', () => {
        renderPage({slug: 'fiefs', title: 'Fiefs', requires: [plugin('medieval-factions', 'Medieval Factions')]});
        const line = screen.getByTestId('requires');
        expect(line.textContent).toBe('Requires Medieval Factions');
        expect(within(line).getByRole('link', {name: 'Medieval Factions'}).getAttribute('href')).toBe('/resources/medieval-factions');
    });

    it('joins several requirements into one sentence', () => {
        renderPage({requires: [plugin('a', 'Alpha'), plugin('b', 'Beta'), plugin('c', 'Gamma')]});
        expect(screen.getByTestId('requires').textContent).toBe('Requires Alpha, Beta and Gamma');
    });
});
