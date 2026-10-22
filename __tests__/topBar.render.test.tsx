// @vitest-environment jsdom
//
// Renders the site's navigation bar to pin what it tells a visitor: which page
// they are on, whether they are signed in (and as whom), where the off-site
// community links go, and that the mobile drawer and dark-mode switch work.
//
// The inline nav is `display: none` below the `md` breakpoint and jsdom applies
// no media queries, so queries against it pass `hidden: true`.
import {afterEach, describe, expect, it, vi} from 'vitest';
import {cleanup, fireEvent, render, screen, within} from '@testing-library/react';

const router = vi.hoisted(() => ({pathname: '/'}));
vi.mock('next/router', () => ({useRouter: () => ({pathname: router.pathname, asPath: router.pathname, query: {}, push: vi.fn()})}));

import TopBar from '../components/TopBar';
import {ColorModeContext} from '../utils/ColorModeContext';
import {TOKEN_KEY} from '../utils/session';

// A UserAuth-shaped token whose payload carries the given claims. Only the
// payload is read for display, so the header and signature are placeholders.
const tokenWith = (claims: Record<string, unknown>): string =>
    `header.${btoa(JSON.stringify(claims)).replace(/=+$/, '')}.signature`;

const navLink = (name: string | RegExp) => screen.getByRole('link', {name, hidden: true});

afterEach(() => {
    cleanup();
    window.localStorage.clear();
    router.pathname = '/';
});

describe('TopBar current-page indication', () => {
    it('marks only the link for the current page with aria-current="page"', () => {
        router.pathname = '/news';
        render(<TopBar/>);

        expect(navLink('News').getAttribute('aria-current')).toBe('page');
        expect(navLink('Home').getAttribute('aria-current')).toBeNull();
        expect(navLink('Guides').getAttribute('aria-current')).toBeNull();
    });

    it('marks no link on a page that is not in the nav', () => {
        router.pathname = '/resources/[slug]';
        render(<TopBar/>);

        const current = screen.getAllByRole('link', {hidden: true}).filter((a) => a.getAttribute('aria-current') === 'page');
        expect(current).toEqual([]);
    });

    it('links each in-site destination in the same tab, in order', () => {
        render(<TopBar/>);

        const labels = ['Home', 'News', 'Guides', 'Leaderboard', 'About', 'Road Map', 'Commissions', 'Dev Portal'];
        const hrefs = ['/', '/news', '/guides', '/leaderboard', '/about', '/roadmap', '/commissions', '/dev'];
        labels.forEach((label, i) => {
            const link = navLink(label);
            expect(link.getAttribute('href')).toBe(hrefs[i]);
            expect(link.getAttribute('target')).toBeNull();
        });
    });

    it('links the wordmark home', () => {
        render(<TopBar/>);

        expect(navLink("Dan's Plugins Community").getAttribute('href')).toBe('/');
    });
});

describe('TopBar account link', () => {
    it('reads "Sign in" when no token is stored', () => {
        render(<TopBar/>);

        expect(navLink('Sign in').getAttribute('href')).toBe('/account');
    });

    it("reads the signed-in user's name, from the token's sub claim", () => {
        window.localStorage.setItem(TOKEN_KEY, tokenWith({sub: 'alice'}));
        render(<TopBar/>);

        expect(navLink('alice').getAttribute('href')).toBe('/account');
        expect(screen.queryByRole('link', {name: 'Sign in', hidden: true})).toBeNull();
    });

    it('falls back to "Account" when a stored token names no user', () => {
        window.localStorage.setItem(TOKEN_KEY, 'not-a-jwt');
        render(<TopBar/>);

        expect(navLink('Account').getAttribute('href')).toBe('/account');
    });

    it('is marked current on the account page', () => {
        router.pathname = '/account';
        render(<TopBar/>);

        expect(navLink('Sign in').getAttribute('aria-current')).toBe('page');
    });
});

describe('TopBar community menu', () => {
    it('opens a menu of off-site links, each in a new tab', () => {
        render(<TopBar/>);
        expect(screen.queryByRole('menuitem', {name: /Discord/})).toBeNull();

        fireEvent.click(screen.getByRole('button', {name: 'Community', hidden: true}));

        const expected: [RegExp, string][] = [
            [/Discord/, 'https://discord.gg/xXtuAQ2'],
            [/Patreon/, 'https://www.patreon.com/danspluginscommunity'],
            [/LinkedIn/, 'https://www.linkedin.com/company/dansplugins'],
            [/RPKit/, 'https://github.com/RP-Kit/RPKit'],
        ];
        for (const [name, href] of expected) {
            const item = screen.getByRole('menuitem', {name});
            expect(item.getAttribute('href')).toBe(href);
            expect(item.getAttribute('target')).toBe('_blank');
            expect(item.getAttribute('rel')).toBe('noopener noreferrer');
        }
    });
});

describe('TopBar mobile drawer', () => {
    it('opens from the menu button with every destination, the current page selected', () => {
        router.pathname = '/guides';
        window.localStorage.setItem(TOKEN_KEY, tokenWith({sub: 'alice'}));
        const {baseElement} = render(<TopBar/>);
        expect(baseElement.querySelector('.MuiDrawer-paper')).toBeNull();

        fireEvent.click(screen.getByRole('button', {name: 'Open navigation menu', hidden: true}));

        const drawer = baseElement.querySelector('.MuiDrawer-paper') as HTMLElement;
        expect(drawer).not.toBeNull();
        const links = within(drawer).getAllByRole('link', {hidden: true});
        expect(links.map((a) => a.textContent)).toEqual([
            'Home', 'News', 'Guides', 'Leaderboard', 'About', 'Road Map', 'Commissions', 'Dev Portal', 'alice',
            'Discord', 'Patreon', 'LinkedIn', 'RPKit',
        ]);
        const selected = links.filter((a) => a.classList.contains('Mui-selected')).map((a) => a.textContent);
        expect(selected).toEqual(['Guides']);
        const discord = links.find((a) => a.textContent === 'Discord') as HTMLElement;
        expect(discord.getAttribute('target')).toBe('_blank');
        expect(discord.getAttribute('rel')).toBe('noopener noreferrer');
    });
});

describe('TopBar dark-mode switch', () => {
    it('calls the color-mode toggle from context', () => {
        const toggleColorMode = vi.fn();
        render(
            <ColorModeContext.Provider value={{toggleColorMode}}>
                <TopBar/>
            </ColorModeContext.Provider>,
        );

        const toggle = screen.getByRole('checkbox', {name: 'Toggle dark mode', hidden: true});
        expect((toggle as HTMLInputElement).checked).toBe(false);
        fireEvent.click(toggle);
        expect(toggleColorMode).toHaveBeenCalledTimes(1);
    });
});
