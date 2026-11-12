/**
 * @vitest-environment jsdom
 */
// Renders /roadmap against the real pages/data/roadmap.json to pin that items
// are grouped under "In Progress", "Planned" and "Completed" in that order, each
// heading carries a count of its items, and every item in the file appears
// exactly once. The page filters by status, so an item whose status is not one
// of the three would silently vanish; the "every item appears" check catches a
// typo in the data file as well as a regression in the page.
import React from 'react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {cleanup, render, screen, within} from '@testing-library/react';

vi.mock('next/router', () => ({useRouter: () => ({pathname: '/roadmap', asPath: '/roadmap', query: {}, push: vi.fn()})}));

import Roadmap from '../pages/roadmap';
import roadmapData from '../pages/data/roadmap.json';

afterEach(cleanup);

const ORDER = ['In Progress', 'Planned', 'Completed'] as const;

const itemsWithStatus = (status: string) => roadmapData.items.filter((item) => item.status === status);

describe('/roadmap page', () => {
    it('gives every item in roadmap.json one of the three statuses the page renders', () => {
        const unknown = roadmapData.items.filter((item) => !(ORDER as readonly string[]).includes(item.status));
        expect(unknown).toEqual([]);
    });

    it('renders a section per non-empty status, in order, each with its item count', () => {
        render(<Roadmap/>);

        const expected = ORDER.filter((status) => itemsWithStatus(status).length > 0);
        const headings = screen.getAllByRole('heading', {level: 5});
        expect(headings.map((h) => h.textContent)).toEqual(expected);

        for (const heading of headings) {
            const status = heading.textContent!;
            // The outlined count chip sits beside the heading in the same row.
            expect(heading.parentElement!.textContent).toBe(`${status}${itemsWithStatus(status).length}`);
        }
    });

    it('renders every item exactly once, with its description and status chip', () => {
        render(<Roadmap/>);

        const titles = screen.getAllByRole('heading', {level: 6});
        expect(titles).toHaveLength(roadmapData.items.length);

        for (const item of roadmapData.items) {
            const title = screen.getByRole('heading', {level: 6, name: item.title});
            const card = title.closest('.MuiPaper-root') as HTMLElement;
            expect(within(card).getByText(item.description)).toBeTruthy();
            expect(within(card).getByText(item.status, {selector: '.MuiChip-label'})).toBeTruthy();
        }
    });

    it('places each item under its own status section', () => {
        render(<Roadmap/>);

        const headings = screen.getAllByRole('heading', {level: 5});
        for (const heading of headings) {
            const section = heading.parentElement!.parentElement as HTMLElement;
            const titles = within(section).getAllByRole('heading', {level: 6}).map((h) => h.textContent);
            expect(titles).toEqual(itemsWithStatus(heading.textContent!).map((item) => item.title));
        }
    });

    it('links to the GitHub issue tracker in a new tab', () => {
        render(<Roadmap/>);

        const link = screen.getByRole('link', {name: 'issue tracker on GitHub'});
        expect(link.getAttribute('href')).toBe('https://github.com/Dans-Plugins/dansplugins-dot-com/issues');
        expect(link.getAttribute('target')).toBe('_blank');
        expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    });
});
