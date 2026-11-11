/**
 * @vitest-environment jsdom
 */
// Renders /guides to pin that each catalogue plugin gets a "<title> Guide" link
// to its on-site guide, in the order getServerSideProps handed them, and that an
// empty list (the catalogue could not be read) says so instead of rendering blank.
import React from 'react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {cleanup, render, screen} from '@testing-library/react';

vi.mock('next/router', () => ({useRouter: () => ({pathname: '/guides', asPath: '/guides', query: {}, push: vi.fn()})}));

import Guides from '../pages/guides';

afterEach(cleanup);

const UNAVAILABLE = /The plugin catalogue could not be loaded right now/;

describe('/guides page', () => {
    it('links each plugin to its on-site guide, in the order given', () => {
        render(<Guides guides={[
            {id: 'activity-tracker', title: 'Activity Tracker'},
            {id: 'medieval-factions', title: 'Medieval Factions'},
        ]}/>);

        const tracker = screen.getByRole('link', {name: 'Activity Tracker Guide'});
        const factions = screen.getByRole('link', {name: 'Medieval Factions Guide'});
        expect(tracker.getAttribute('href')).toBe('/guides/activity-tracker');
        expect(factions.getAttribute('href')).toBe('/guides/medieval-factions');
        expect(tracker.compareDocumentPosition(factions) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        expect(screen.queryByText(UNAVAILABLE)).toBeNull();
    });

    it('says the catalogue is unavailable, and lists no guides, when given none', () => {
        render(<Guides guides={[]}/>);

        expect(screen.getByText(UNAVAILABLE)).toBeTruthy();
        expect(screen.queryAllByRole('link', {name: / Guide$/})).toEqual([]);
    });
});
