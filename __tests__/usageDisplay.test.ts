import {describe, expect, it} from 'vitest';
import {percentLabel, rankUsage, startsLabel, usageHeadline, versionShares} from '../utils/usageDisplay';
import type {ProgramUsage} from '../utils/traceUsage';
import {usageWithInstalls, usageWithoutInstalls} from './fixtures/traceUsage';

const NOW = Date.parse('2026-10-03T16:00:00Z');

describe('usageHeadline', () => {
    it('counts active servers only when trace counted distinct servers', () => {
        expect(usageHeadline(usageWithInstalls(), NOW).activeServers).toBe(57);
    });

    it('never presents starts as servers when installs are null', () => {
        const headline = usageHeadline(usageWithoutInstalls(), NOW);
        expect(headline.activeServers).toBeNull();
        expect(headline.lastReported).toBe('Last reported in use 2 days ago');
        expect(headline.starts).toBe('412 server starts in the last 30 days');
        // No visible text may call these servers or installs.
        for (const text of [headline.lastReported, headline.starts]) {
            expect(text).not.toMatch(/install|servers?(?! start)/i);
        }
    });

    it('omits the starts line when there were none, and handles a plugin never seen', () => {
        const quiet: ProgramUsage = {...usageWithoutInstalls(), startups30d: 0, lastSeen: null, days: []};
        expect(usageHeadline(quiet, NOW)).toEqual({activeServers: null, lastReported: null, starts: null});
    });

    it('labels a single start in the singular', () => {
        expect(startsLabel(1)).toBe('1 server start in the last 30 days');
        expect(startsLabel(1234)).toBe('1,234 server starts in the last 30 days');
    });
});

describe('versionShares', () => {
    it('divides active servers by version when installs are present', () => {
        const shares = versionShares(usageWithInstalls())!;
        expect(shares.basis).toBe('servers');
        expect(shares.heading).toMatch(/share of active servers/);
        expect(shares.rows.map((r) => [r.label, r.count])).toEqual([['6.1.0', 41], ['6.0.0', 10], ['Unknown version', 6]]);
        expect(shares.unit(41)).toBe('41 servers');
    });

    it('divides starts by version, and says so, when installs are null', () => {
        const shares = versionShares(usageWithoutInstalls())!;
        expect(shares.basis).toBe('starts');
        expect(shares.heading).toMatch(/share of server starts/);
        expect(shares.rows.map((r) => r.count)).toEqual([300, 80, 32]);
        expect(shares.unit(300)).toBe('300 starts');
        expect(shares.heading).not.toMatch(/active servers/);
    });

    it('falls back to starts when the headline has a server count but no version does', () => {
        const mixed: ProgramUsage = {...usageWithoutInstalls(), activeInstalls30d: 12};
        expect(versionShares(mixed)!.basis).toBe('starts');
    });

    it('shows the top five and groups the rest as other versions', () => {
        const many: ProgramUsage = {
            ...usageWithoutInstalls(),
            versions: [1, 2, 3, 4, 5, 6, 7].map((n) => ({version: `1.${n}`, installs: null, startups: n * 10})),
        };
        const shares = versionShares(many)!;
        expect(shares.rows.map((r) => r.label)).toEqual(['1.7', '1.6', '1.5', '1.4', '1.3', 'Other versions']);
        expect(shares.rows[5].count).toBe(30);
        expect(shares.rows.reduce((sum, r) => sum + r.share, 0)).toBeCloseTo(1);
    });

    it('is null when there is nothing to divide', () => {
        expect(versionShares({...usageWithoutInstalls(), versions: []})).toBeNull();
    });
});

describe('percentLabel', () => {
    it('rounds, but never shows a real sliver as 0%', () => {
        expect(percentLabel(0.7234)).toBe('72%');
        expect(percentLabel(0.001)).toBe('<1%');
        expect(percentLabel(0)).toBe('0%');
    });
});

describe('rankUsage', () => {
    const row = (title: string, usage: Partial<ProgramUsage> | null) => ({
        slug: title.toLowerCase(),
        title,
        usage: usage ? {...usageWithoutInstalls(), ...usage} : null,
    });

    it('puts server counts first, then recency, then plugins without figures, never by raw starts', () => {
        const ranked = rankUsage([
            row('Nothing', null),
            row('OldButBusy', {lastSeen: '2026-09-01T00:00:00Z', startups30d: 99999}),
            row('Recent', {lastSeen: '2026-10-03T00:00:00Z', startups30d: 3}),
            row('FewServers', {activeInstalls30d: 2}),
            row('ManyServers', {activeInstalls30d: 40}),
            row('NeverSeen', {lastSeen: null}),
        ]);
        expect(ranked.map((r) => r.title)).toEqual(['ManyServers', 'FewServers', 'Recent', 'OldButBusy', 'NeverSeen', 'Nothing']);
    });
});
