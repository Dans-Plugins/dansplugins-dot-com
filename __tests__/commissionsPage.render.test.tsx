/**
 * @vitest-environment jsdom
 */
// Renders /commissions against the real pages/data/commissions.json to pin that
// the availability chip follows the file's `availability`, the pricing table has
// one row per tier with its one-time, retainer and ad-hoc prices in the columns
// the header names, every "included" line is listed, and the Discord button
// opens the configured invite in a new tab.
import React from 'react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {cleanup, render, screen, within} from '@testing-library/react';

vi.mock('next/router', () => ({useRouter: () => ({pathname: '/commissions', asPath: '/commissions', query: {}, push: vi.fn()})}));

import Commissions from '../pages/commissions';
import commissionsData from '../pages/data/commissions.json';

afterEach(cleanup);

describe('/commissions page', () => {
    it('shows the availability the data file declares', () => {
        render(<Commissions/>);

        const open = commissionsData.availability === 'open';
        expect(screen.queryByText('Open for commissions') !== null).toBe(open);
        expect(screen.queryByText('Currently closed') !== null).toBe(!open);
    });

    it('lists one pricing row per tier, with each price under its column', () => {
        render(<Commissions/>);

        const table = screen.getByRole('table', {name: 'commission pricing'});
        const headers = within(table).getAllByRole('columnheader').map((cell) => cell.textContent);
        expect(headers).toEqual(['Service', 'One-time', 'Monthly retainer', 'Ad hoc']);

        // The first row is the header; the rest are the tiers, in file order.
        const rows = within(table).getAllByRole('row').slice(1);
        expect(rows).toHaveLength(commissionsData.tiers.length);
        rows.forEach((row, i) => {
            const tier = commissionsData.tiers[i];
            const cells = within(row).getAllByRole('cell').map((cell) => cell.textContent);
            expect(cells).toEqual([`${tier.name}${tier.description}`, tier.oneTime, tier.retainer, tier.adHoc]);
        });
    });

    it('lists everything the data file says is included, in order', () => {
        render(<Commissions/>);

        const heading = screen.getByRole('heading', {name: "What's included"});
        const list = heading.nextElementSibling as HTMLElement;
        const items = within(list).getAllByRole('listitem').map((item) => item.textContent);
        expect(items).toEqual(commissionsData.included);
    });

    it('opens the configured Discord invite in a new tab', () => {
        render(<Commissions/>);

        const button = screen.getByRole('link', {name: 'Join the Commissions Discord'});
        expect(button.getAttribute('href')).toBe(commissionsData.discordInvite);
        expect(button.getAttribute('target')).toBe('_blank');
        expect(button.getAttribute('rel')).toBe('noopener noreferrer');
    });
});
