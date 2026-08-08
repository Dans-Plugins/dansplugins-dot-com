import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, it} from 'vitest';
import pluginData from '../pages/data/plugins.json';

// Drift guard for the two-step catalogue migration described in RESOURCE_HUB.md.
// The site still renders from pages/data/plugins.json, while dpc-api serves the
// plugins table seeded by V15 — so for now the same catalogue is written down
// twice, and the duplication has to be policed rather than trusted.
//
// This checks the two identifying fields: the slug (which every guide URL,
// resource URL and likes.target_id row keys off, so a mismatch breaks links) and
// the title. It deliberately does not compare descriptions or icons: those are
// cosmetic, and the whole comparison disappears when the site switches to the
// API and plugins.json is deleted.

const MIGRATION = join(
    process.cwd(),
    'dpc-api/src/main/resources/db/migration/V15__create_plugins_table.sql'
);

// Each seeded row opens with `(gen_random_uuid(), 'slug', 'Title',`. SQL escapes
// an apostrophe by doubling it ("Dan''s Essentials"), so the literal pattern has
// to admit '' inside the quotes and unescape it afterwards.
const seededPlugins = (): { slug: string; title: string }[] => {
    const sql = readFileSync(MIGRATION, 'utf8');
    const rows = [...sql.matchAll(/\(gen_random_uuid\(\),\s*'((?:[^']|'')*)',\s*'((?:[^']|'')*)'/g)];
    return rows.map(([, slug, title]) => ({
        slug: slug.replace(/''/g, "'"),
        title: title.replace(/''/g, "'")
    }));
};

describe('plugin catalogue seed', () => {
    it('parses the seeded rows out of the migration', () => {
        // Guards the guard: a regex that matched nothing would make every
        // comparison below pass vacuously.
        expect(seededPlugins().length).toBeGreaterThan(0);
        expect(seededPlugins().map((plugin) => plugin.slug)).toContain('medieval-factions');
    });

    it('seeds exactly the plugins the site renders, by slug', () => {
        const seeded = seededPlugins().map((plugin) => plugin.slug).sort();
        const rendered = pluginData.plugins.map((plugin) => plugin.id).sort();

        expect(seeded).toEqual(rendered);
    });

    it('gives every plugin the same title in both places', () => {
        const seededTitles = new Map(seededPlugins().map((plugin) => [plugin.slug, plugin.title]));
        const mismatched = pluginData.plugins
            .filter((plugin) => seededTitles.get(plugin.id) !== plugin.title)
            .map((plugin) => `${plugin.id}: "${plugin.title}" vs "${seededTitles.get(plugin.id)}"`);

        expect(mismatched).toEqual([]);
    });

    it('seeds no duplicate slugs, which the table\'s UNIQUE constraint would reject', () => {
        const slugs = seededPlugins().map((plugin) => plugin.slug);

        expect(slugs.length).toBe(new Set(slugs).size);
    });
});
