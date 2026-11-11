#!/usr/bin/env node
// Fails when merging --head into --base (as --base stands now) would put two
// Flyway migrations on one version number. Reads git only; no database.
//
//   node scripts/flyway/check-version-clash.mjs --base origin/main --head HEAD
//
// Options:
//   --base <ref>   base branch tip to compare against (fetch it first)
//   --head <ref>   head commit of the branch being checked
//   --dir <path>   migration directory (default: the dpc-api one)
//   --repo <path>  git working directory (default: current directory)
//
// Exit codes: 0 no clash, 1 clash, 2 usage or git error.

import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { findVersionClashes, formatReport } from './version-clash.mjs';

export const DEFAULT_MIGRATION_DIR = 'dpc-api/src/main/resources/db/migration';

function git(repo, args) {
    return execFileSync('git', ['-C', repo, ...args], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
}

/** File paths under dir at ref, subdirectories included as Flyway scans them (empty when dir is absent). */
function listMigrations(repo, ref, dir) {
    const out = git(repo, ['ls-tree', '-r', '--name-only', ref, '--', `${dir.replace(/\/+$/, '')}/`]);
    return out ? out.split('\n') : [];
}

/** "origin/main (0341feb)" for a ref name, just the short SHA for a SHA. */
function label(ref, sha) {
    return sha.startsWith(ref) ? sha.slice(0, 7) : `${ref} (${sha.slice(0, 7)})`;
}

/**
 * Runs the check against a git repository.
 * @param {{ repo?: string, base: string, head: string, dir?: string }} options
 * @returns {{ exitCode: number, lines: string[] }}
 */
export function runCheck({ repo = '.', base, head, dir = DEFAULT_MIGRATION_DIR }) {
    const baseSha = git(repo, ['rev-parse', '--verify', `${base}^{commit}`]);
    const headSha = git(repo, ['rev-parse', '--verify', `${head}^{commit}`]);
    const forkSha = git(repo, ['merge-base', baseSha, headSha]);
    const result = findVersionClashes({
        base: listMigrations(repo, baseSha, dir),
        forkPoint: listMigrations(repo, forkSha, dir),
        head: listMigrations(repo, headSha, dir),
    });
    const baseLabel = label(base, baseSha);
    const lines = [
        `Flyway version-clash check: ${label(head, headSha)} against ${baseLabel}, merge base ${forkSha.slice(0, 7)}, in ${dir}`,
        ...formatReport(result, baseLabel),
    ];
    return { exitCode: result.clashes.length > 0 ? 1 : 0, lines };
}

function parseArgs(argv) {
    const options = {};
    for (let i = 0; i < argv.length; i += 2) {
        const key = argv[i];
        const value = argv[i + 1];
        if (!['--base', '--head', '--dir', '--repo'].includes(key) || value === undefined) {
            throw new Error(`unexpected argument: ${key}`);
        }
        options[key.slice(2)] = value;
    }
    if (!options.base || !options.head) {
        throw new Error('--base and --head are required');
    }
    return options;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
    try {
        const { exitCode, lines } = runCheck(parseArgs(process.argv.slice(2)));
        for (const line of lines) {
            console.log(line);
        }
        process.exitCode = exitCode;
    } catch (error) {
        console.error(`check-version-clash: ${error.stderr?.toString().trim() || error.message}`);
        console.error('usage: node scripts/flyway/check-version-clash.mjs --base <ref> --head <ref> [--dir <path>] [--repo <path>]');
        process.exitCode = 2;
    }
}
