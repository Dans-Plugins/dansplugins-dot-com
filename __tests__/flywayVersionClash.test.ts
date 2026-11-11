import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { findVersionClashes, formatReport, parseMigration } from '../scripts/flyway/version-clash.mjs';
import { DEFAULT_MIGRATION_DIR, runCheck } from '../scripts/flyway/check-version-clash.mjs';

// The migration directory as it stood at the merge base of PR #323
// (`f98807d`): V1..V17 plus the directory's README.
const AT_FORK_F98807D = [
    'README.md',
    'V1__create_factions_table.sql',
    'V2__create_api_keys_and_faction_fields.sql',
    'V3__create_accounts_table.sql',
    'V4__add_api_key_prefix.sql',
    'V5__add_column_constraints.sql',
    'V6__add_faction_active_column.sql',
    'V7__add_faction_last_synced_at.sql',
    'V8__create_discord_announcements_table.sql',
    'V9__replace_accounts_with_users.sql',
    'V10__create_likes_table.sql',
    'V11__drop_discord_announcements_table.sql',
    'V12__create_backlog_items_table.sql',
    'V13__create_claims_table.sql',
    'V14__create_feature_requests_table.sql',
    'V15__create_plugins_table.sql',
    'V16__create_plugin_versions_tables.sql',
    'V17__create_plugin_download_counts_table.sql',
];
// `main` at 4addea2, just before #323 merged: PR #324 had already landed V18.
const MAIN_AT_4ADDEA2 = [...AT_FORK_F98807D, 'V18__add_plugin_first_released_at.sql'];
// PR #323's head (`7c64e8c`), cut before #324 merged.
const PR_323_HEAD_7C64E8C = [...AT_FORK_F98807D, 'V18__add_six_listed_plugins.sql'];

describe('parseMigration', () => {
    it('reads the version and description of a versioned migration', () => {
        expect(parseMigration(`${DEFAULT_MIGRATION_DIR}/V18__add_six_listed_plugins.sql`)).toEqual({
            file: 'V18__add_six_listed_plugins.sql',
            version: '18',
            major: 18,
            description: 'add_six_listed_plugins',
        });
    });

    it('compares versions the way Flyway does', () => {
        expect(parseMigration('V018__x.sql')?.version).toBe('18');
        expect(parseMigration('V1.0__x.sql')?.version).toBe('1');
        expect(parseMigration('V2_1__x.sql')?.version).toBe('2.1');
    });

    it('ignores files that are not versioned migrations', () => {
        expect(parseMigration('README.md')).toBeNull();
        expect(parseMigration('R__refresh_view.sql')).toBeNull();
        expect(parseMigration('V18_missing_double_underscore.sql')).toBeNull();
    });
});

describe('findVersionClashes, replaying the 2026-09-20 V18 break', () => {
    it('faults #323 against main at 4addea2 on V18 and names V19 as next free', () => {
        const result = findVersionClashes({
            base: MAIN_AT_4ADDEA2,
            forkPoint: AT_FORK_F98807D,
            head: PR_323_HEAD_7C64E8C,
        });

        expect(result.clashes).toEqual([
            {
                version: '18',
                added: ['V18__add_six_listed_plugins.sql'],
                existing: ['V18__add_plugin_first_released_at.sql'],
                suggested: '19',
            },
        ]);
        expect(result.nextFree).toBe('19');
        expect(formatReport(result, '4addea2')).toContain(
            'FAULT V18: V18__add_six_listed_plugins.sql clashes, 4addea2 already has '
            + 'V18__add_plugin_first_released_at.sql. Next free version: V19.',
        );
    });

    it('passes #323 against its own stale merge base, which is why its CI stayed green', () => {
        const result = findVersionClashes({
            base: AT_FORK_F98807D,
            forkPoint: AT_FORK_F98807D,
            head: PR_323_HEAD_7C64E8C,
        });

        expect(result.clashes).toEqual([]);
        expect(result.added).toEqual(['V18__add_six_listed_plugins.sql']);
    });

    it('passes the #327 fix, which renamed the later-merged V18 to V19', () => {
        const brokenMain = [...MAIN_AT_4ADDEA2, 'V18__add_six_listed_plugins.sql'];
        const fixHead = [...MAIN_AT_4ADDEA2, 'V19__add_six_listed_plugins.sql'];

        const result = findVersionClashes({ base: brokenMain, forkPoint: brokenMain, head: fixHead });

        expect(result.clashes).toEqual([]);
        expect(result.baseDuplicates).toEqual([]);
    });
});

describe('findVersionClashes', () => {
    it('reports nothing for a branch that adds no migrations', () => {
        const result = findVersionClashes({ base: MAIN_AT_4ADDEA2, forkPoint: MAIN_AT_4ADDEA2, head: MAIN_AT_4ADDEA2 });

        expect(result.added).toEqual([]);
        expect(result.clashes).toEqual([]);
        expect(formatReport(result, 'main')).toEqual(['ok: this branch adds no Flyway migrations.']);
    });

    it('faults a branch that adds two migrations on one version', () => {
        const head = [...MAIN_AT_4ADDEA2, 'V19__a.sql', 'V19__b.sql'];

        const result = findVersionClashes({ base: MAIN_AT_4ADDEA2, forkPoint: MAIN_AT_4ADDEA2, head });

        expect(result.clashes).toEqual([
            { version: '19', added: ['V19__a.sql', 'V19__b.sql'], existing: [], suggested: '19' },
        ]);
        expect(formatReport(result, 'main').join('\n')).toContain('this branch adds more than one migration on it');
    });

    it('gives each clash its own free number, after the branch\'s non-clashing migrations', () => {
        const base = [...AT_FORK_F98807D, 'V18__base_a.sql', 'V19__base_b.sql'];
        const head = [...AT_FORK_F98807D, 'V18__mine_a.sql', 'V19__mine_b.sql', 'V20__mine_c.sql'];

        const result = findVersionClashes({ base, forkPoint: AT_FORK_F98807D, head });

        expect(result.clashes.map((c) => [c.version, c.suggested])).toEqual([['18', '21'], ['19', '22']]);
        expect(result.nextFree).toBe('21');
    });

    it('warns about, but does not blame the branch for, a clash already on the base', () => {
        const base = [...MAIN_AT_4ADDEA2, 'V18__add_six_listed_plugins.sql'];
        const head = [...base, 'V19__new.sql'];

        const result = findVersionClashes({ base, forkPoint: base, head });

        expect(result.clashes).toEqual([]);
        expect(result.baseDuplicates).toEqual([
            { version: '18', files: ['V18__add_plugin_first_released_at.sql', 'V18__add_six_listed_plugins.sql'] },
        ]);
        expect(formatReport(result, 'main')[0]).toMatch(/^WARNING V18: main itself already has more than one migration/);
    });
});

const git = (cwd: string, ...args: string[]) =>
    execFileSync('git', ['-C', cwd, '-c', 'user.name=test', '-c', 'user.email=test@example.invalid', ...args], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();

describe('runCheck against a git repository rebuilt from the V18 history', () => {
    let repo: string;

    const commit = (files: string[], message: string) => {
        const dir = join(repo, DEFAULT_MIGRATION_DIR);
        rmSync(dir, { recursive: true, force: true });
        mkdirSync(dir, { recursive: true });
        for (const file of files) {
            writeFileSync(join(dir, file), `-- ${file}\n`);
        }
        git(repo, 'add', '-A');
        git(repo, 'commit', '-q', '-m', message);
    };

    beforeAll(() => {
        repo = mkdtempSync(join(tmpdir(), 'flyway-clash-'));
        git(repo, 'init', '-q');
        commit(AT_FORK_F98807D, 'fork point (f98807d)');
        git(repo, 'branch', 'pr-323');
        commit(MAIN_AT_4ADDEA2, '#324: V18__add_plugin_first_released_at (4addea2)');
        git(repo, 'branch', 'main-at-4addea2');
        git(repo, 'checkout', '-q', 'pr-323');
        commit(PR_323_HEAD_7C64E8C, '#323: V18__add_six_listed_plugins (7c64e8c)');
    });

    afterAll(() => {
        rmSync(repo, { recursive: true, force: true });
    });

    it('fails on V18 against the current base tip and names V19', () => {
        const { exitCode, lines } = runCheck({ repo, base: 'main-at-4addea2', head: 'pr-323' });

        expect(exitCode).toBe(1);
        expect(lines.join('\n')).toMatch(/FAULT V18: V18__add_six_listed_plugins\.sql clashes, main-at-4addea2 \([0-9a-f]{7}\) already has V18__add_plugin_first_released_at\.sql\. Next free version: V19\./);
    });

    it('passes against the stale merge base', () => {
        const forkPoint = git(repo, 'merge-base', 'main-at-4addea2', 'pr-323');

        expect(runCheck({ repo, base: forkPoint, head: 'pr-323' }).exitCode).toBe(0);
    });

    it('throws on a ref that does not exist, so the CLI can exit 2', () => {
        expect(() => runCheck({ repo, base: 'no-such-branch', head: 'pr-323' })).toThrow();
    });
});

// The same replay against this repository's real history, when the clone has
// it (a full local clone does; CI's shallow checkout does not, so it skips).
const hasRealHistory = (() => {
    try {
        git(process.cwd(), 'cat-file', '-e', '4addea2c446408f6661b711de47405ecc5dc4c25^{commit}');
        git(process.cwd(), 'cat-file', '-e', '7c64e8c2314dab3938063e3d9dbaf589b083a7e8^{commit}');
        return true;
    } catch {
        return false;
    }
})();

describe.skipIf(!hasRealHistory)('runCheck against the real dansplugins-dot-com history', () => {
    it('faults PR #323 (7c64e8c) against main at 4addea2 on V18, next free V19', () => {
        const { exitCode, lines } = runCheck({ base: '4addea2', head: '7c64e8c' });

        expect(exitCode).toBe(1);
        expect(lines).toContain(
            'FAULT V18: V18__add_six_listed_plugins.sql clashes, 4addea2 already has '
            + 'V18__add_plugin_first_released_at.sql. Next free version: V19.',
        );
    });
});
