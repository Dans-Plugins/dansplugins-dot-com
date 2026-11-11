// Flyway version-clash check (text only), from RFC 0007 "Flyway History as
// Strata Rock Layers" (the text check split out on its own).
//
// Question answered: if the head branch were merged into the base branch as
// the base stands *now*, would two versioned migrations share one Flyway
// version number? Flyway refuses to start on that ("Found more than one
// migration with version N"), which is what broke `main` on 2026-09-20 when
// PR #323's V18 landed 25 minutes after PR #324's V18 (fixed by #327).
//
// PR CI alone cannot see this: it runs against the base as it was when the
// run started, so a PR cut before another migration landed stays green. This
// module compares against whatever base tip the caller passes in.
//
// Pure functions here; git access lives in check-version-clash.mjs.

/** Flyway's default versioned-migration file name: V<version>__<description>.sql */
const VERSIONED = /^V(\d+(?:[._]\d+)*)__(.+)\.sql$/;

/**
 * Parses a migration file name (a bare name or a path).
 * @param {string} path
 * @returns {{ file: string, version: string, major: number, description: string } | null}
 *   null for anything that is not a versioned migration (repeatables,
 *   README.md, and so on).
 */
export function parseMigration(path) {
    const file = path.slice(path.lastIndexOf('/') + 1);
    const match = VERSIONED.exec(file);
    if (!match) {
        return null;
    }
    // Flyway compares versions numerically, part by part, so V018 is V18 and
    // V1.0 is V1: strip leading zeros and trailing zero parts before comparing.
    const parts = match[1].split(/[._]/).map((part) => String(Number(part)));
    while (parts.length > 1 && parts[parts.length - 1] === '0') {
        parts.pop();
    }
    return { file, version: parts.join('.'), major: Number(parts[0]), description: match[2] };
}

/**
 * @param {string[]} paths
 * @returns {Map<string, string[]>} version -> file names, sorted
 */
function byVersion(paths) {
    const map = new Map();
    for (const path of paths) {
        const migration = parseMigration(path);
        if (migration) {
            const files = map.get(migration.version) ?? [];
            files.push(migration.file);
            files.sort();
            map.set(migration.version, files);
        }
    }
    return map;
}

/**
 * @param {string[]} paths
 * @returns {Set<string>} bare file names of the versioned migrations
 */
function fileNames(paths) {
    return new Set(paths.map(parseMigration).filter(Boolean).map((m) => m.file));
}

/**
 * Compares the migrations a head branch adds with the base branch tip.
 *
 * @param {{ base: string[], forkPoint: string[], head: string[] }} trees
 *   Migration paths (or bare names) in the base branch tip, in the merge base
 *   of base and head, and in the head. The merge base only serves to tell
 *   which head files the branch itself added or removed.
 * @returns {{
 *   added: string[],
 *   clashes: { version: string, added: string[], existing: string[], suggested: string }[],
 *   baseDuplicates: { version: string, files: string[] }[],
 *   nextFree: string,
 * }}
 */
export function findVersionClashes({ base, forkPoint, head }) {
    const atFork = fileNames(forkPoint);
    const onHead = fileNames(head);
    const added = [...onHead].filter((file) => !atFork.has(file)).sort();
    // A branch that renumbers a file (as #327 did) removes the old name; that
    // name must not count against it after the merge.
    const removed = new Set([...atFork].filter((file) => !onHead.has(file)));

    const baseKept = [...fileNames(base)].filter((file) => !removed.has(file));
    const baseVersions = byVersion(baseKept);
    const addedVersions = byVersion(added);

    const baseDuplicates = [...baseVersions]
        .filter(([, files]) => files.length > 1)
        .map(([version, files]) => ({ version, files }));

    const clashing = [];
    for (const [version, files] of addedVersions) {
        const existing = (baseVersions.get(version) ?? []).filter((file) => !files.includes(file));
        if (existing.length > 0 || files.length > 1) {
            clashing.push({ version, added: files, existing });
        }
    }

    // Free numbers come after everything that will be on the base once the
    // merge is done, including the head's own migrations that do not clash.
    const clashingVersions = new Set(clashing.map((clash) => clash.version));
    const taken = [
        ...baseKept.map(parseMigration),
        ...added.map(parseMigration).filter((m) => !clashingVersions.has(m.version)),
    ];
    let next = taken.reduce((max, m) => Math.max(max, m.major), 0) + 1;
    const nextFree = String(next);

    const clashes = clashing
        .sort((a, b) => compareVersions(a.version, b.version))
        .map((clash) => ({ ...clash, suggested: String(next++) }));

    return { added, clashes, baseDuplicates, nextFree };
}

/**
 * @param {string} a
 * @param {string} b
 */
function compareVersions(a, b) {
    const pa = a.split('.').map(Number);
    const pb = b.split('.').map(Number);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
        const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
        if (diff !== 0) {
            return diff;
        }
    }
    return 0;
}

/**
 * Renders a result as the lines the check prints.
 * @param {ReturnType<typeof findVersionClashes>} result
 * @param {string} baseLabel how to name the base in messages, e.g. "origin/main (0341feb)"
 * @returns {string[]}
 */
export function formatReport(result, baseLabel) {
    const lines = [];
    for (const { version, files } of result.baseDuplicates) {
        lines.push(`WARNING V${version}: ${baseLabel} itself already has more than one migration on this version: ${files.join(', ')}`);
    }
    if (result.added.length === 0) {
        lines.push('ok: this branch adds no Flyway migrations.');
        return lines;
    }
    const clashingFiles = new Set(result.clashes.flatMap((clash) => clash.added));
    for (const file of result.added) {
        if (!clashingFiles.has(file)) {
            lines.push(`ok   ${file}: version is free on ${baseLabel}`);
        }
    }
    for (const clash of result.clashes) {
        const where = clash.existing.length > 0
            ? `${baseLabel} already has ${clash.existing.join(', ')}`
            : 'this branch adds more than one migration on it';
        lines.push(`FAULT V${clash.version}: ${clash.added.join(', ')} clashes, ${where}. Next free version: V${clash.suggested}.`);
    }
    if (result.clashes.length > 0) {
        lines.push('');
        lines.push('Flyway refuses to start with two migrations on one version.');
        lines.push('Rename the clashing file(s) to the suggested version, after merging or rebasing on the latest base branch.');
    }
    return lines;
}
