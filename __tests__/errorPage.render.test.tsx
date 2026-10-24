// @vitest-environment jsdom
//
// Renders the 404 and 500 pages through the shared ErrorPage layout to pin what
// a visitor on a broken route sees — the status code, a heading and message,
// the main landmark the skip link targets, and a way back home — and that the
// page claims no canonical URL, since it stands in for a URL that is not a real
// page.
//
// next/head only writes to <head> inside a running Next.js app, so it is
// replaced with a pass-through and the tags are read from the render container.
import {afterEach, describe, expect, it, vi} from 'vitest';
import {cleanup, render, screen} from '@testing-library/react';
import type {ReactNode} from 'react';

vi.mock('next/router', () => ({useRouter: () => ({pathname: '/missing', asPath: '/missing', query: {}, push: vi.fn()})}));
vi.mock('next/head', () => ({default: ({children}: {children: ReactNode}) => <>{children}</>}));

import NotFoundPage from '../pages/404';
import ServerErrorPage from '../pages/500';

afterEach(() => {
    cleanup();
});

describe('404 page', () => {
    it('shows the status code, a heading and an explanation', () => {
        render(<NotFoundPage/>);

        expect(screen.getByRole('heading', {level: 1, name: '404'})).toBeTruthy();
        expect(screen.getByRole('heading', {level: 4, name: 'Page not found'})).toBeTruthy();
        expect(screen.getByText("The page you're looking for doesn't exist or may have moved.")).toBeTruthy();
    });

    it('links back to the home page', () => {
        render(<NotFoundPage/>);

        expect(screen.getByRole('link', {name: 'Back to home'}).getAttribute('href')).toBe('/');
    });

    it('puts the message in the main landmark the skip link targets', () => {
        render(<NotFoundPage/>);

        const main = screen.getByRole('main');
        expect(main.id).toBe('main');
        expect(main.textContent).toContain('Page not found');
    });

    it('titles the document with the code and title, and claims no canonical URL', () => {
        const {container} = render(<NotFoundPage/>);

        expect(container.querySelector('title')?.textContent).toBe("404 — Page not found — Dan's Plugins Community");
        expect(container.querySelector('link[rel="canonical"]')).toBeNull();
        expect(container.querySelector('meta[property="og:url"]')).toBeNull();
    });

    it('uses the message as the page description', () => {
        const {container} = render(<NotFoundPage/>);

        expect(container.querySelector('meta[name="description"]')?.getAttribute('content'))
            .toBe("The page you're looking for doesn't exist or may have moved.");
    });
});

describe('500 page', () => {
    it('shows its own status code, heading and explanation through the same layout', () => {
        const {container} = render(<ServerErrorPage/>);

        expect(screen.getByRole('heading', {level: 1, name: '500'})).toBeTruthy();
        expect(screen.getByRole('heading', {level: 4, name: 'Something went wrong'})).toBeTruthy();
        expect(screen.getByText('An unexpected error occurred on our end. Please try again in a moment.')).toBeTruthy();
        expect(screen.getByRole('link', {name: 'Back to home'}).getAttribute('href')).toBe('/');
        expect(container.querySelector('title')?.textContent).toBe("500 — Something went wrong — Dan's Plugins Community");
        expect(container.querySelector('link[rel="canonical"]')).toBeNull();
    });
});
