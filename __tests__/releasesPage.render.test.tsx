/**
 * @vitest-environment jsdom
 */
// Renders /releases to pin that it is a single-<h1> document describing the four
// release gates, each in its own card with a stable anchor id (so a link to
// /releases#boot keeps landing on the right card), its name as an <h3>, and when
// it runs; that both channels are explained alongside the /dpm commands that
// reach them; and that the release-gates repository and the release-channels
// conventions document are linked in a new tab. The page is static, so nothing
// beyond the router needs mocking.
import React from 'react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {cleanup, render, screen, within} from '@testing-library/react';

vi.mock('next/router', () => ({useRouter: () => ({pathname: '/releases', asPath: '/releases', query: {}, push: vi.fn()})}));

import Releases from '../pages/releases';

afterEach(cleanup);

// The gates in the order the page lists them: anchor id, card heading, and the
// start of the "when it runs" line.
const GATES = [
    {id: 'api-compatibility', name: 'API-compatibility check', when: 'Every build of every plugin'},
    {id: 'boot', name: 'Boot gate', when: 'Every release, once per supported Minecraft version.'},
    {id: 'save-compatibility', name: 'Save-compatibility gate', when: 'Every release of a plugin that keeps data'},
    {id: 'dependents', name: 'Dependents gate', when: 'Every release of a plugin that other plugins build on'},
] as const;

describe('/releases page', () => {
    it('has exactly one <h1>, naming the page, inside the main landmark', () => {
        render(<Releases/>);

        const headings = screen.getAllByRole('heading', {level: 1});
        expect(headings.map((h) => h.textContent)).toEqual(['How releases work']);
        expect(within(screen.getByRole('main')).getByRole('heading', {level: 1})).toBe(headings[0]);
    });

    it('renders the section headings in order', () => {
        render(<Releases/>);

        expect(screen.getAllByRole('heading', {level: 2}).map((h) => h.textContent)).toEqual([
            'Two channels',
            'The gates',
            'Supported Minecraft versions',
            'When something goes wrong',
            'See for yourself',
        ]);
    });

    it('renders one card per gate, in order, each with its anchor id, name and when it runs', () => {
        const {container} = render(<Releases/>);

        expect(screen.getAllByRole('heading', {level: 3}).map((h) => h.textContent)).toEqual(GATES.map((g) => g.name));

        for (const gate of GATES) {
            const card = container.querySelector(`#${gate.id}`) as HTMLElement;
            expect(card).not.toBeNull();
            expect(card.classList.contains('MuiPaper-root')).toBe(true);
            expect(within(card).getByRole('heading', {level: 3}).textContent).toBe(gate.name);
            expect(card.textContent).toContain(gate.when);
        }
    });

    it('explains both channels with the /dpm command for each', () => {
        render(<Releases/>);

        const stable = screen.getByText('Stable').parentElement as HTMLElement;
        expect(stable.textContent).toContain('/dpm get');
        expect(stable.textContent).toContain('only through the gates');

        const dev = screen.getByText('Dev').parentElement as HTMLElement;
        expect(dev.textContent).toContain('/dpm get --experimental');
        expect(dev.textContent).toContain('has not been through the release gates');
    });

    it('links to the release gates and the release-channels rules in a new tab', () => {
        render(<Releases/>);

        const expected: [string, string][] = [
            ['release gates on GitHub', 'https://github.com/Dans-Plugins/release-gates'],
            ['Release channels', 'https://github.com/Dans-Plugins/dpc-conventions/blob/main/docs/RELEASE_CHANNELS.md'],
        ];
        for (const [name, href] of expected) {
            const link = screen.getByRole('link', {name});
            expect(link.getAttribute('href')).toBe(href);
            expect(link.getAttribute('target')).toBe('_blank');
            expect(link.getAttribute('rel')).toBe('noopener noreferrer');
        }
    });
});
