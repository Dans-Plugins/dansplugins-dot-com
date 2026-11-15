/**
 * @vitest-environment jsdom
 */
// Renders /about to pin that it is a single-<h1> document, that its "how
// releases work" link is an in-site link to /releases (not an external one, so
// it stays in the same tab), and that the GitHub, Discord and Patreon buttons
// point at the community's own accounts and open in a new tab with
// noopener noreferrer. The page is static, so nothing beyond the router needs
// mocking.
import React from 'react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {cleanup, render, screen, within} from '@testing-library/react';

vi.mock('next/router', () => ({useRouter: () => ({pathname: '/about', asPath: '/about', query: {}, push: vi.fn()})}));

import About from '../pages/about';

afterEach(cleanup);

describe('/about page', () => {
    it('has exactly one <h1>, naming the page, inside the main landmark', () => {
        render(<About/>);

        const headings = screen.getAllByRole('heading', {level: 1});
        expect(headings.map((h) => h.textContent)).toEqual(['About Us']);
        expect(within(screen.getByRole('main')).getByRole('heading', {level: 1})).toBe(headings[0]);
    });

    it('links to /releases within the site, in the same tab', () => {
        render(<About/>);

        const link = screen.getByRole('link', {name: 'how releases work'});
        expect(link.getAttribute('href')).toBe('/releases');
        expect(link.getAttribute('target')).toBeNull();
    });

    it('renders the GitHub, Discord and Patreon buttons, in that order, opening in a new tab', () => {
        render(<About/>);

        const main = screen.getByRole('main');
        const expected: [string, string][] = [
            ['GitHub', 'https://github.com/Dans-Plugins'],
            ['Discord', 'https://discord.gg/xXtuAQ2'],
            ['Patreon', 'https://www.patreon.com/danspluginscommunity'],
        ];
        const buttons = within(main).getAllByRole('link').filter((link) => link.classList.contains('MuiButton-root'));
        expect(buttons.map((b) => b.textContent)).toEqual(expected.map(([name]) => name));

        for (const [name, href] of expected) {
            const button = within(main).getByRole('link', {name});
            expect(button.getAttribute('href')).toBe(href);
            expect(button.getAttribute('target')).toBe('_blank');
            expect(button.getAttribute('rel')).toBe('noopener noreferrer');
        }
    });
});
