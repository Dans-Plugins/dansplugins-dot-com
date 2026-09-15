// @vitest-environment jsdom
//
// Renders a catalogue card (the rest of the suite runs in `node`; see
// vitest.config.ts) to pin the Download button's presence and target.
import React from 'react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {cleanup, render, screen} from '@testing-library/react';

// LikeButton reaches the likes API on interaction; the card renders it, so
// replace it with an inert stand-in rather than mount that machinery here.
vi.mock('../components/LikeButton', () => ({default: () => null}));

import PluginCard from '../components/PluginCard';

afterEach(cleanup);

const JAR = 'https://github.com/Dans-Plugins/Fiefs/releases/download/v1.2.0/Fiefs-1.2.0.jar';

const renderCard = (overrides: Partial<React.ComponentProps<typeof PluginCard>> = {}) =>
    render(
        <PluginCard
            id="fiefs"
            title="Fiefs"
            description="Adds a land ownership and fiefs system."
            githubLink="https://github.com/Dans-Plugins/Fiefs"
            likeCount={0}
            liked={false}
            token={null}
            {...overrides}
        />,
    );

describe('PluginCard download button', () => {
    it('links straight to the latest release jar when the mirror offers one', () => {
        renderCard({latestVersion: 'v1.2.0', latestDownloadUrl: JAR});

        const button = screen.getByRole('link', {name: 'Download Fiefs v1.2.0'});
        expect(button.getAttribute('href')).toBe(JAR);
        // A file link, not a page: it must not open a tab that has nothing to show.
        expect(button.getAttribute('target')).toBeNull();
    });

    it('is absent when the plugin has no jar to offer', () => {
        renderCard({latestVersion: 'v1.2.0', latestDownloadUrl: null});
        expect(screen.queryByRole('link', {name: /^Download/})).toBeNull();
    });

    it('is absent when the prop is not given at all', () => {
        // Every other caller of the card, and any page that has not been taught
        // about the mirror, gets the card it had before.
        renderCard();
        expect(screen.queryByRole('link', {name: /^Download/})).toBeNull();
    });

    it('keeps the GitHub link pointing at the repository, not the jar', () => {
        renderCard({latestDownloadUrl: JAR});
        expect(screen.getByRole('link', {name: 'GitHub'}).getAttribute('href'))
            .toBe('https://github.com/Dans-Plugins/Fiefs');
    });
});

describe('PluginCard download count', () => {
    it('shows the plugin\'s downloads through the site as a chip', () => {
        renderCard({downloadCount: 1234});
        expect(screen.getByTestId('download-count').textContent).toBe('1,234 downloads');
    });

    it('says "1 download", not "1 downloads"', () => {
        renderCard({downloadCount: 1});
        expect(screen.getByTestId('download-count').textContent).toBe('1 download');
    });

    it('is absent at zero, so a plugin nobody has downloaded yet is not labelled with a 0', () => {
        renderCard({downloadCount: 0});
        expect(screen.queryByTestId('download-count')).toBeNull();
    });

    it('is absent when the prop is not given at all', () => {
        renderCard();
        expect(screen.queryByTestId('download-count')).toBeNull();
    });

    it('marks the download link nofollow, since following it is what counts a download', () => {
        renderCard({latestVersion: 'v1.2.0', latestDownloadUrl: JAR});
        expect(screen.getByRole('link', {name: 'Download Fiefs v1.2.0'}).getAttribute('rel')).toBe('nofollow');
    });
});
