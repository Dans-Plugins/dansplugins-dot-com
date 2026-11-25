// @vitest-environment jsdom
//
// Accessibility promises made across the shared chrome and components, each
// one invisible to a mouse user and easy to undo without noticing: the page's
// landmarks (one banner, a named site nav, a footer), the Community menu
// telling assistive technology whether it is open, every Like button naming
// what it likes, the phone drawer being a named dialog, the colour-mode
// toggle being a switch, the first-visit dialog having a name, and a single <h1> per
// page with no skipped heading levels on the pages whose cards used to jump
// straight from <h1> to <h5>/<h6>.
import React from 'react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {cleanup, fireEvent, render, screen, within} from '@testing-library/react';

vi.mock('next/router', () => ({useRouter: () => ({pathname: '/', asPath: '/', query: {}, push: vi.fn()})}));

import TopBar from '../components/TopBar';
import BottomBar from '../components/BottomBar';
import LikeButton from '../components/LikeButton';
import ExperienceSplash from '../components/ExperienceSplash';
import Blurb from '../components/Blurb';
import Commissions from '../pages/commissions';

afterEach(cleanup);

// The heading levels in document order, for checking the outline never skips
// a level on the way down (an h2 may follow an h4, but an h1 may not be
// followed directly by an h4).
const headingLevels = (root: HTMLElement = document.body): number[] =>
    Array.from(root.querySelectorAll('h1, h2, h3, h4, h5, h6')).map((h) => Number(h.tagName[1]));

const skippedLevels = (levels: number[]): string[] =>
    levels.flatMap((level, i) => (i > 0 && level > levels[i - 1] + 1 ? [`h${levels[i - 1]} -> h${level}`] : []));

describe('landmarks', () => {
    it('renders the top bar as the only banner, with a named site navigation', () => {
        render(<><TopBar/><BottomBar version="1.0.0"/></>);

        expect(screen.getAllByRole('banner')).toHaveLength(1);
        // The inline nav is display:none below `md`; jsdom applies no media
        // queries, but the landmark is queried with hidden: true for parity
        // with the other TopBar tests.
        const nav = screen.getByRole('navigation', {name: 'Site', hidden: true});
        expect(within(nav).getByRole('link', {name: 'News', hidden: true}).getAttribute('href')).toBe('/news');
    });

    it('renders the bottom bar as a footer (contentinfo), not a second header', () => {
        render(<BottomBar version="1.0.0"/>);

        const footer = screen.getByRole('contentinfo');
        expect(footer.tagName).toBe('FOOTER');
        expect(screen.queryByRole('banner')).toBeNull();
    });
});

describe('TopBar Community menu', () => {
    it('says it opens a menu, and whether that menu is open', () => {
        render(<TopBar/>);

        const button = screen.getByRole('button', {name: 'Community', hidden: true});
        expect(button.getAttribute('aria-haspopup')).toBe('true');
        expect(button.getAttribute('aria-expanded')).toBeNull();

        fireEvent.click(button);

        expect(button.getAttribute('aria-expanded')).toBe('true');
        const menu = screen.getByRole('menu');
        expect(button.getAttribute('aria-controls')).toBe('community-menu');
        expect(document.getElementById('community-menu')!.contains(menu)).toBe(true);
        expect(menu.getAttribute('aria-labelledby')).toBe('community-menu-button');
    });

    it('says whether the mobile navigation drawer is open', () => {
        render(<TopBar/>);

        const button = screen.getByRole('button', {name: 'Open navigation menu'});
        expect(button.getAttribute('aria-expanded')).toBe('false');
        fireEvent.click(button);
        expect(button.getAttribute('aria-expanded')).toBe('true');
    });

    it('announces the menu button as opening, and while open controlling, a named dialog', () => {
        render(<TopBar/>);

        const button = screen.getByRole('button', {name: 'Open navigation menu'});
        expect(button.getAttribute('aria-haspopup')).toBe('dialog');
        // The drawer is not mounted while closed, so nothing to point at yet.
        expect(button.getAttribute('aria-controls')).toBeNull();

        fireEvent.click(button);

        const dialog = screen.getByRole('dialog', {name: 'Navigation menu'});
        expect(dialog.id).toBe('nav-drawer');
        expect(button.getAttribute('aria-controls')).toBe(dialog.id);
    });
});

describe('colour-mode toggle', () => {
    it('is announced as a switch, not a checkbox, in the top bar', () => {
        render(<TopBar/>);

        expect(screen.getByRole('switch', {name: 'Toggle dark mode', hidden: true})).toBeTruthy();
        expect(screen.queryByRole('checkbox', {name: 'Toggle dark mode', hidden: true})).toBeNull();
    });

    it('is announced as a switch, not a checkbox, in the footer', () => {
        render(<BottomBar version="1.0.0"/>);

        expect(screen.getByRole('switch', {name: 'Toggle dark mode'})).toBeTruthy();
        expect(screen.queryByRole('checkbox', {name: 'Toggle dark mode'})).toBeNull();
    });
});

describe('LikeButton accessible name', () => {
    it('names what it likes when given a label', () => {
        render(<LikeButton targetType="plugin" targetId="fiefs" count={2} liked={false} token="jwt" label="Fiefs"/>);

        const heart = screen.getByRole('button', {name: 'Like Fiefs'});
        expect(heart.getAttribute('aria-pressed')).toBe('false');
    });

    it('names the undo action when already liked', () => {
        render(<LikeButton targetType="plugin" targetId="fiefs" count={2} liked={true} token="jwt" label="Fiefs"/>);

        expect(screen.getByRole('button', {name: 'Unlike Fiefs'})).toBeTruthy();
    });

    it('announces the count politely when it changes', () => {
        render(<LikeButton targetType="plugin" targetId="fiefs" count={2} liked={false} token="jwt" label="Fiefs"/>);

        const count = screen.getByText('2');
        expect(count.getAttribute('aria-live')).toBe('polite');
    });
});

describe('ExperienceSplash dialog', () => {
    it('is named by its heading and described by its question', () => {
        render(<ExperienceSplash open onChoosePlayer={() => undefined} onChooseDeveloper={() => undefined}/>);

        const dialog = screen.getByRole('dialog', {name: "Welcome to Dan's Plugins Community"});
        expect(dialog.getAttribute('aria-describedby')).toBe('experience-splash-description');
        expect(document.getElementById('experience-splash-description')!.textContent).toBe('What brings you here?');
    });
});

describe('heading outline', () => {
    it('gives the Blurb an h2 with h3 card titles under it, and no stray h6', () => {
        render(<main><h1>Page</h1><Blurb/></main>);

        expect(skippedLevels(headingLevels())).toEqual([]);
        expect(screen.getAllByRole('heading', {level: 3}).map((h) => h.textContent)).toEqual(['Contribute', 'Download', 'Try it Out']);
        expect(screen.queryAllByRole('heading', {level: 6})).toHaveLength(0);
    });

    it('keeps /commissions to one h1 and an unbroken outline, with each tier as a row header', () => {
        render(<Commissions/>);

        expect(screen.getAllByRole('heading', {level: 1})).toHaveLength(1);
        expect(skippedLevels(headingLevels())).toEqual([]);

        const table = screen.getByRole('table', {name: 'commission pricing'});
        const rowHeaders = within(table).getAllByRole('rowheader');
        expect(rowHeaders.length).toBeGreaterThan(0);
        for (const header of rowHeaders) {
            expect(header.getAttribute('scope')).toBe('row');
        }
    });
});
