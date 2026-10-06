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

    // Release notes are written against the repository, where `COMMANDS.md`
    // means the file next to the README. Rendered at /resources/<slug> the
    // browser would resolve it to /resources/COMMANDS.md — the 404 a crawl of
    // /resources/dans-plugin-manager found.
    const withNotes = (tag: string, changelog: string, repo = 'Dans-Plugins/Dans-Plugin-Manager'): PluginVersion => ({
        ...version(tag, false, '2026-09-01T00:00:00Z'),
        changelog,
        htmlUrl: `https://github.com/${repo}/releases/tag/${tag}`,
    });

    it('points a relative link in a release note at the plugin repository', () => {
        render(<PluginVersionList versions={[
            withNotes('v0.7.0', 'See [COMMANDS.md](COMMANDS.md) and [the guide](./USER_GUIDE.md#setup).'),
        ]}/>);
        expect(screen.getByRole('link', {name: 'COMMANDS.md'}).getAttribute('href'))
            .toBe('https://github.com/Dans-Plugins/Dans-Plugin-Manager/blob/HEAD/COMMANDS.md');
        expect(screen.getByRole('link', {name: 'the guide'}).getAttribute('href'))
            .toBe('https://github.com/Dans-Plugins/Dans-Plugin-Manager/blob/HEAD/USER_GUIDE.md#setup');
    });

    it('resolves each release against its own repository, older versions included', () => {
        // The older release sits in a collapsed accordion; its notes are still
        // in the server-rendered markup, so query the DOM rather than by role.
        const {container} = render(<PluginVersionList versions={[
            withNotes('v2.0.0', 'Nothing linked.', 'Dans-Plugins/Fiefs'),
            withNotes('v1.0.0', '[Config](CONFIG.md)', 'Dans-Plugins/Fiefs'),
        ]}/>);
        const hrefs = Array.from(container.querySelectorAll('a')).map((a) => a.getAttribute('href'));
        expect(hrefs).toContain('https://github.com/Dans-Plugins/Fiefs/blob/HEAD/CONFIG.md');
        expect(hrefs).not.toContain('CONFIG.md');
    });

    it('leaves absolute links and in-page anchors in a release note alone', () => {
        render(<PluginVersionList versions={[
            withNotes('v0.7.0', '[PR](https://github.com/Dans-Plugins/Dans-Plugin-Manager/pull/121) [Top](#top)'),
        ]}/>);
        const pr = screen.getByRole('link', {name: 'PR'});
        expect(pr.getAttribute('href')).toBe('https://github.com/Dans-Plugins/Dans-Plugin-Manager/pull/121');
        expect(pr.getAttribute('target')).toBe('_blank');
        expect(screen.getByRole('link', {name: 'Top'}).getAttribute('href')).toBe('#top');
    });

    it('leaves a relative link as written when the release URL names no repository', () => {
        render(<PluginVersionList versions={[
            {...withNotes('v0.7.0', '[Commands](COMMANDS.md)'), htmlUrl: ''},
        ]}/>);
        expect(screen.getByRole('link', {name: 'Commands'}).getAttribute('href')).toBe('COMMANDS.md');
    });
});
