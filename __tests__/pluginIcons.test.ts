import {describe, expect, it} from 'vitest'
import {existsSync, readdirSync, readFileSync} from 'fs'
import {join} from 'path'

// The catalogue lives in dpc-api's `plugins` table now, so the icons it names
// at runtime can only be checked at runtime. What this repository still
// controls is the seed: every icon path a migration writes into the table must
// be a file under public/, or the plugin ships with a broken image from its
// first render. An admin editing an icon path later is on their own, which is
// why the admin form says the path must exist under public/icons.
const MIGRATIONS_DIR = join(__dirname, '..', 'dpc-api', 'src', 'main', 'resources', 'db', 'migration')

const seededIconPaths = (): string[] =>
    readdirSync(MIGRATIONS_DIR)
        .filter((name) => name.endsWith('.sql'))
        .flatMap((name) => [...readFileSync(join(MIGRATIONS_DIR, name), 'utf8').matchAll(/'(\/icons\/[^']+)'/g)].map((m) => m[1]))

describe('seeded plugin icon paths', () => {
    it('finds icon paths in the migrations at all', () => {
        expect(seededIconPaths().length).toBeGreaterThan(0)
    })

    it('every seeded icon file exists under public/', () => {
        const missing = [...new Set(seededIconPaths())]
            .filter((icon) => !existsSync(join(__dirname, '..', 'public', icon)))
        expect(missing).toEqual([])
    })
})
