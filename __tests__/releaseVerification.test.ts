import {describe, expect, it} from 'vitest'
import {describeGateRun, parseReleaseVerification, verificationSection} from '../utils/releaseVerification'

// Medieval Factions 6.1.0's notes, trimmed but otherwise verbatim: the per-run list shape.
const LIST_SHAPE = `## 6.1.0

A minor release.

### Version

\`v6.0.0\` → \`6.1.0\` — **MINOR**.

### Verification

Verified on a real Spigot server before publication; this release carries the exact jar that was verified.

- [boot gate run](https://github.com/Dans-Plugins/release-gates/actions/runs/36372707530): booted twice on a fresh Spigot server running Minecraft 1.19.4 (11 assertions passed).
- [boot gate run](https://github.com/Dans-Plugins/release-gates/actions/runs/36372721342): booted twice on a fresh Spigot server running Minecraft 1.21.11 (11 assertions passed).
- [boot gate run](https://github.com/Dans-Plugins/release-gates/actions/runs/36372727262): booted twice on a fresh Spigot server running Minecraft 26.2 (11 assertions passed).
- [save-compatibility gate run](https://github.com/Dans-Plugins/release-gates/actions/runs/36373199165) on the \`h2\` backend: data written by \`v6.0.0\` was loaded by this release across 5 restart cycles with nothing lost (34 assertions passed).
- [save-compatibility gate run](https://github.com/Dans-Plugins/release-gates/actions/runs/36373205056) on the \`json\` backend: data written by \`v6.0.0\` was loaded by this release across 5 restart cycles with nothing lost (36 assertions passed).
- [dependents gate run](https://github.com/Dans-Plugins/release-gates/actions/runs/36374010506): MF_Bluemap v1.0 — each one's current stable release — enabled against this release across two boots (18 assertions passed).

Install with Dan's Plugin Manager: \`/dpm get <plugin>\`.

---

_drafted by Claude on behalf of Daniel Stephenson_
`

// Wild Pets 1.9.0's notes: the earlier inline-sentence shape, one boot run, no Minecraft version.
const SENTENCE_SHAPE = `## 1.9.0

### Verification

Booted twice on a real Spigot server before publication — [boot gate run](https://github.com/Dans-Plugins/release-gates/actions/runs/35458313243) (10 assertions passed). This release carries the exact jar that was verified.

Install with Dan's Plugin Manager: \`/dpm get <plugin>\`.

---
`

describe('parseReleaseVerification', () => {
    it('reads every run of the per-run list, with the Minecraft version and backend each states', () => {
        const v = parseReleaseVerification(LIST_SHAPE)!
        expect(v.runs.map((r) => r.kind)).toEqual(['boot', 'boot', 'boot', 'save-compatibility', 'save-compatibility', 'dependents'])
        expect(v.minecraftVersions).toEqual(['1.19.4', '1.21.11', '26.2'])
        expect(v.runs[3]).toEqual({
            kind: 'save-compatibility',
            url: 'https://github.com/Dans-Plugins/release-gates/actions/runs/36373199165',
            minecraftVersion: null,
            backend: 'h2',
        })
        expect(v.runs[4].backend).toBe('json')
        expect(v.runs[5].url).toBe('https://github.com/Dans-Plugins/release-gates/actions/runs/36374010506')
    })

    it('reads the earlier sentence shape without inventing a Minecraft version', () => {
        const v = parseReleaseVerification(SENTENCE_SHAPE)!
        expect(v.runs).toEqual([{
            kind: 'boot',
            url: 'https://github.com/Dans-Plugins/release-gates/actions/runs/35458313243',
            minecraftVersion: null,
            backend: null,
        }])
        expect(v.minecraftVersions).toEqual([])
    })

    it('answers null for notes without a Verification section or without gate runs in it', () => {
        expect(parseReleaseVerification(null)).toBeNull()
        expect(parseReleaseVerification('## 1.0.0\n\nFirst release.\n')).toBeNull()
        expect(parseReleaseVerification('### Verification\n\nChecked by hand.\n')).toBeNull()
    })

    it('ignores gate-run links outside the Verification section', () => {
        const notes = 'See the [boot gate run](https://example.invalid/runs/1) of the last release.\n\n' + SENTENCE_SHAPE
        expect(parseReleaseVerification(notes)!.runs.map((r) => r.url)).toEqual([
            'https://github.com/Dans-Plugins/release-gates/actions/runs/35458313243',
        ])
    })
})

describe('verificationSection', () => {
    it('stops at the next heading or horizontal rule', () => {
        const section = verificationSection(LIST_SHAPE)!
        expect(section.startsWith('Verified on a real Spigot server')).toBe(true)
        expect(section).not.toContain('drafted by Claude')
    })
})

describe('describeGateRun', () => {
    it('names each run the way the resource page lists it', () => {
        const v = parseReleaseVerification(LIST_SHAPE)!
        expect(v.runs.map(describeGateRun)).toEqual([
            'Boot gate on Minecraft 1.19.4',
            'Boot gate on Minecraft 1.21.11',
            'Boot gate on Minecraft 26.2',
            'Save-compatibility gate (h2 storage)',
            'Save-compatibility gate (json storage)',
            'Dependents gate',
        ])
        expect(describeGateRun(parseReleaseVerification(SENTENCE_SHAPE)!.runs[0])).toBe('Boot gate')
    })
})
