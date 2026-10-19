// @vitest-environment jsdom
//
// Renders the resource page's "Verified before release" panel (the rest of
// the suite runs in `node`; see vitest.config.ts) to pin which release it
// speaks for and that it never claims a check the notes do not record.
import React from 'react';
import {afterEach, describe, expect, it} from 'vitest';
import {cleanup, render, screen} from '@testing-library/react';

import ReleaseVerification from '../components/ReleaseVerification';
import type {PluginVersion} from '../services/pluginVersionService';

afterEach(cleanup);

const RUNS = 'https://github.com/Dans-Plugins/release-gates/actions/runs';

const version = (tag: string, prerelease: boolean, changelog: string | null): PluginVersion => ({
    tag,
    name: null,
    changelog,
    htmlUrl: `https://github.com/Dans-Plugins/Medieval-Factions/releases/tag/${tag}`,
    prerelease,
    publishedAt: '2026-09-24T00:00:00Z',
    downloadCount: 0,
    siteDownloadCount: 0,
    assets: [],
});

// The per-run list shape, one line per gate run.
const listNotes = (...minecraftVersions: string[]): string => [
    '## Notes',
    '',
    '### Verification',
    '',
    ...minecraftVersions.map((mc, i) =>
        `- [boot gate run](${RUNS}/${i + 1}): booted twice on a fresh Spigot server running Minecraft ${mc} (11 assertions passed).`),
    `- [save-compatibility gate run](${RUNS}/90) on the \`json\` backend: data written by \`v6.0.0\` was loaded by this release (36 assertions passed).`,
    '',
].join('\n');

// The earlier sentence shape: one boot run, no Minecraft version stated.
const SENTENCE_NOTES = `### Verification

Booted twice on a real Spigot server before publication — [boot gate run](${RUNS}/7) (10 assertions passed).
`;

const sentence = (): string => screen.getByTestId('release-verification').querySelector('p')?.textContent ?? '';

describe('ReleaseVerification', () => {
    it('renders nothing when the stable release records no gate run', () => {
        const {container} = render(<ReleaseVerification versions={[
            version('v1.0.0', false, '## 1.0.0\n\nFirst release.\n'),
        ]}/>);
        expect(container.innerHTML).toBe('');
    });

    it('renders nothing when there is no stable release, even if a pre-release records runs', () => {
        const {container} = render(<ReleaseVerification versions={[
            version('dev-build', true, listNotes('1.21.11')),
        ]}/>);
        expect(container.innerHTML).toBe('');
    });

    it('speaks for the first stable release, skipping a newer pre-release', () => {
        render(<ReleaseVerification versions={[
            version('dev-build', true, listNotes('9.9.9')),
            version('v6.1.0', false, listNotes('1.19.4')),
        ]}/>);
        expect(sentence()).toContain('Version 6.1.0 was started on real servers running Minecraft 1.19.4 before it was published.');
        expect(sentence()).not.toContain('9.9.9');
    });

    it('does not fall back to an older stable release when the current one records no runs', () => {
        const {container} = render(<ReleaseVerification versions={[
            version('v2.0.0', false, null),
            version('v1.0.0', false, listNotes('1.19.4')),
        ]}/>);
        expect(container.innerHTML).toBe('');
    });

    it('lists two Minecraft versions with "and" and three with commas', () => {
        const {unmount} = render(<ReleaseVerification versions={[version('v1.0.0', false, listNotes('1.19.4', '26.2'))]}/>);
        expect(sentence()).toContain('running Minecraft 1.19.4 and 26.2 before');
        unmount();

        render(<ReleaseVerification versions={[version('v1.0.0', false, listNotes('1.19.4', '1.21.11', '26.2'))]}/>);
        expect(sentence()).toContain('running Minecraft 1.19.4, 1.21.11 and 26.2 before');
    });

    it('names no Minecraft version when the notes state none', () => {
        render(<ReleaseVerification versions={[version('1.9.0', false, SENTENCE_NOTES)]}/>);
        expect(sentence()).toContain('Version 1.9.0 was started on a real server before it was published.');
        expect(sentence()).not.toMatch(/Minecraft/);
    });

    it('links each gate run in a new tab and links how releases work', () => {
        render(<ReleaseVerification versions={[version('v6.1.0', false, listNotes('1.19.4'))]}/>);

        const boot = screen.getByRole('link', {name: 'Boot gate on Minecraft 1.19.4'});
        expect(boot.getAttribute('href')).toBe(`${RUNS}/1`);
        expect(boot.getAttribute('target')).toBe('_blank');
        expect(boot.getAttribute('rel')).toBe('noopener noreferrer');
        expect(screen.getByRole('link', {name: 'Save-compatibility gate (json storage)'}).getAttribute('href'))
            .toBe(`${RUNS}/90`);
        expect(screen.getByRole('link', {name: 'How releases work'}).getAttribute('href')).toBe('/releases');
        expect(screen.getByRole('heading', {level: 2, name: 'Verified before release'})).toBeTruthy();
    });
});
