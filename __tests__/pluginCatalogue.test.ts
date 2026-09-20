import {readdirSync, readFileSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, it} from 'vitest';
import pluginData from '../pages/data/plugins.json';

// Drift guard for the two-step catalogue migration described in RESOURCE_HUB.md.
// The site still renders from pages/data/plugins.json, while dpc-api serves the
// plugins table seeded by V15 and extended by later migrations — so for now the same catalogue is written down
// twice, and the duplication has to be policed rather than trusted.
//
// This checks the three load-bearing fields: the slug (which every guide URL,
// resource URL and likes.target_id row keys off), the title, and the GitHub URL
// (which the download, source and bug-report links all resolve to, so a drift
// there is a broken link rather than a cosmetic mismatch). It deliberately does
// not compare descriptions or icons: those are cosmetic, and the whole
// comparison disappears when the site switches to the API and plugins.json is
// deleted.

// V15 seeded the table; later migrations (V19 onwards) add rows in the same
// shape, so every migration is scanned and the union is compared.
const MIGRATIONS_DIR = join(process.cwd(), 'dpc-api/src/main/resources/db/migration');

// Tags live in their own table, seeded by V20 from the same catalogue file
// under the same arrangement, so they are policed the same way.
const TAGS_MIGRATION = join(
    process.cwd(),
    'dpc-api/src/main/resources/db/migration/V20__create_plugin_tags_table.sql'
);

// Each seeded row opens with `(gen_random_uuid(), 'slug', 'Title', 'Description',
// 'https://github.com/...'`, the columns spanning several lines. SQL escapes an
// apostrophe by doubling it ("Dan''s Essentials"), so the literal pattern has to
// admit '' inside the quotes and unescape it afterwards.
const unquote = (literal: string): string => literal.replace(/''/g, "'");

const seededPlugins = (): { slug: string; title: string; githubUrl: string }[] => {
    const sql = readdirSync(MIGRATIONS_DIR)
        .filter((name) => name.endsWith('.sql'))
        .sort()
        .map((name) => readFileSync(join(MIGRATIONS_DIR, name), 'utf8'))
        .join('\n');
    const literal = "'((?:[^']|'')*)'";
    const row = new RegExp(`\\(gen_random_uuid\\(\\),\\s*${literal},\\s*${literal},\\s*${literal},\\s*${literal}`, 'g');
    return [...sql.matchAll(row)].map(([, slug, title, , githubUrl]) => ({
        slug: unquote(slug),
        title: unquote(title),
        githubUrl: unquote(githubUrl)
    }));
};

// Each seeded tag is one `('slug', 'tag')` pair in V20's VALUES list.
const seededTags = (): Map<string, string[]> => {
    const sql = readFileSync(TAGS_MIGRATION, 'utf8');
    const tags = new Map<string, string[]>();
    for (const [, slug, tag] of sql.matchAll(/\('([a-z0-9-]+)',\s*'([a-z0-9-]+)'\)/g)) {
        tags.set(slug, [...(tags.get(slug) ?? []), tag]);
    }
    return tags;
};

describe('plugin tag seed', () => {
    it('parses the seeded pairs out of the migration', () => {
        expect(seededTags().size).toBeGreaterThan(0);
        expect(seededTags().get('medieval-factions')).toContain('factions');
    });

    it('gives every plugin the same tags in both places', () => {
        const seeded = seededTags();
        const mismatched = pluginData.plugins
            .filter((plugin) => [...(plugin.tags ?? [])].sort().join(',') !== [...(seeded.get(plugin.id) ?? [])].sort().join(','))
            .map((plugin) => `${plugin.id}: [${(plugin.tags ?? []).join(', ')}] vs [${(seeded.get(plugin.id) ?? []).join(', ')}]`);

        expect(mismatched).toEqual([]);
    });

    it('seeds tags only for plugins the site renders', () => {
        const rendered = new Set(pluginData.plugins.map((plugin) => plugin.id));
        expect([...seededTags().keys()].filter((slug) => !rendered.has(slug))).toEqual([]);
    });
});

describe('plugin catalogue seed', () => {
    it('parses the seeded rows out of the migration', () => {
        // Guards the guard: a regex that matched nothing would make every
        // comparison below pass vacuously.
        expect(seededPlugins().length).toBeGreaterThan(0);
        expect(seededPlugins().map((plugin) => plugin.slug)).toContain('medieval-factions');
        // Pins which capture group is which: a mis-numbered group would still
        // parse rows, but would compare the wrong column below.
        seededPlugins().forEach((plugin) => {
            expect(plugin.githubUrl).toMatch(/^https:\/\/github\.com\//);
        });
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

    it('points every plugin at the same repository in both places', () => {
        // Not cosmetic like the description: the download, source and bug-report
        // links on a resource page are all derived from this URL, so a drift
        // here is a broken link once the site reads from the table.
        const seededUrls = new Map(seededPlugins().map((plugin) => [plugin.slug, plugin.githubUrl]));
        const mismatched = pluginData.plugins
            .filter((plugin) => seededUrls.get(plugin.id) !== plugin.githubLink)
            .map((plugin) => `${plugin.id}: "${plugin.githubLink}" vs "${seededUrls.get(plugin.id)}"`);

        expect(mismatched).toEqual([]);
    });

    it('seeds no duplicate slugs, which the table\'s UNIQUE constraint would reject', () => {
        const slugs = seededPlugins().map((plugin) => plugin.slug);

        expect(slugs.length).toBe(new Set(slugs).size);
    });
});
