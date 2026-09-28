// Reads the "Verification" section that stable releases carry in their notes: the public
// record of the release gates each one passed before it was published (see
// https://github.com/Dans-Plugins/release-gates and the /releases page). The notes are
// the release bodies dpc-api already mirrors, so nothing here calls GitHub.
//
// Two shapes exist. Releases since late September 2026 list one line per gate run:
//   - [boot gate run](https://…/runs/1): booted twice on a fresh Spigot server running Minecraft 1.19.4 (11 assertions passed).
//   - [save-compatibility gate run](https://…/runs/2) on the `json` backend: data written by `v6.0.0` was loaded …
// Earlier ones put a single boot run in a sentence:
//   Booted twice on a real Spigot server before publication — [boot gate run](https://…/runs/3) (10 assertions passed).
// Anything the notes do not state (a Minecraft version, a backend) is left out, never guessed.

export type GateKind = 'boot' | 'save-compatibility' | 'dependents' | 'install';

export interface GateRun {
    kind: GateKind;
    url: string;
    // The Minecraft version the run booted, when the notes say ("running Minecraft 1.19.4").
    minecraftVersion: string | null;
    // The storage backend a save-compatibility run used, when the notes say ("on the `json` backend").
    backend: string | null;
}

export interface ReleaseVerification {
    runs: GateRun[];
    // Distinct Minecraft versions the boot gate ran on, in the order the notes list them.
    minecraftVersions: string[];
}

const GATE_LINK = /\[(boot|save-compatibility|dependents|install) gate run\]\((https?:\/\/[^)\s]+)\)([^\n]*)/g;
const MINECRAFT = /running Minecraft (\d+(?:\.\d+){1,2})/;
const BACKEND = /on the `([a-z0-9]+)` backend/;

/** The body of the notes' "Verification" section, or null when there is none. */
export function verificationSection(changelog: string | null | undefined): string | null {
    if (!changelog) {
        return null;
    }
    const start = changelog.search(/^#{2,4}\s*Verification\s*$/m);
    if (start < 0) {
        return null;
    }
    const rest = changelog.slice(start).replace(/^[^\n]*\n/, '');
    const end = rest.search(/^(#{1,4}\s|---\s*$)/m);
    return (end < 0 ? rest : rest.slice(0, end)).trim();
}

/** The gate runs a release's notes record, or null when they record none. */
export function parseReleaseVerification(changelog: string | null | undefined): ReleaseVerification | null {
    const section = verificationSection(changelog);
    if (!section) {
        return null;
    }
    const runs: GateRun[] = [];
    const gateLink = new RegExp(GATE_LINK.source, 'g');
    let match: RegExpExecArray | null;
    while ((match = gateLink.exec(section)) !== null) {
        const [, kind, url, after] = match;
        runs.push({
            kind: kind as GateKind,
            url,
            minecraftVersion: kind === 'boot' ? after.match(MINECRAFT)?.[1] ?? null : null,
            backend: kind === 'save-compatibility' ? after.match(BACKEND)?.[1] ?? null : null,
        });
    }
    if (runs.length === 0) {
        return null;
    }
    const minecraftVersions: string[] = [];
    runs.forEach((run) => {
        if (run.minecraftVersion && !minecraftVersions.includes(run.minecraftVersion)) {
            minecraftVersions.push(run.minecraftVersion);
        }
    });
    return {runs, minecraftVersions};
}

/** One line describing a run, for a list on the resource page. */
export function describeGateRun(run: GateRun): string {
    switch (run.kind) {
        case 'boot':
            return run.minecraftVersion ? `Boot gate on Minecraft ${run.minecraftVersion}` : 'Boot gate';
        case 'save-compatibility':
            return run.backend ? `Save-compatibility gate (${run.backend} storage)` : 'Save-compatibility gate';
        case 'dependents':
            return 'Dependents gate';
        case 'install':
            return 'Install gate';
    }
}
