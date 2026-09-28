// @vitest-environment jsdom
//
// Renders a plugin's version list (the rest of the suite runs in `node`; see
// vitest.config.ts) to pin which release carries the "Latest" chip.
import React from 'react';
import {afterEach, describe, expect, it} from 'vitest';
import {cleanup, render, screen} from '@testing-library/react';

import PluginVersionList from '../components/PluginVersionList';
import type {PluginVersion} from '../services/pluginVersionService';

afterEach(cleanup);

const version = (tag: string, prerelease: boolean, publishedAt: string): PluginVersion => ({
    tag,
    name: null,
    changelog: null,
    htmlUrl: `https://github.com/Dans-Plugins/Fiefs/releases/tag/${tag}`,
    prerelease,
    publishedAt,
    downloadCount: 0,
    siteDownloadCount: 0,
    assets: [],
});

const latestChipOwner = (): string | null => {
    const chips = screen.getAllByTestId('latest-version-chip');
    expect(chips).toHaveLength(1);
    return chips[0].parentElement?.textContent ?? null;
};

describe('PluginVersionList', () => {
    it('marks the newest release Latest when it is stable', () => {
        render(<PluginVersionList versions={[
            version('v2.0.0', false, '2026-09-01T00:00:00Z'),
            version('v1.0.0', false, '2026-01-01T00:00:00Z'),
        ]}/>);
        expect(latestChipOwner()).toContain('v2.0.0');
    });

    it('does not call a development build Latest when a stable release exists', () => {
        render(<PluginVersionList versions={[
            version('dev-build', true, '2026-09-28T00:00:00Z'),
            version('v6.0.0', false, '2026-09-24T00:00:00Z'),
        ]}/>);
        const owner = latestChipOwner();
        expect(owner).toContain('v6.0.0');
        expect(owner).not.toContain('dev-build');
    });

    it('falls back to the newest pre-release when there is nothing stable', () => {
        render(<PluginVersionList versions={[
            version('v0.2.0-beta', true, '2026-09-28T00:00:00Z'),
            version('v0.1.0-beta', true, '2026-09-01T00:00:00Z'),
        ]}/>);
        expect(latestChipOwner()).toContain('v0.2.0-beta');
    });
});
