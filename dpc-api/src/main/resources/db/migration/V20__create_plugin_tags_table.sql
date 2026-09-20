-- Tags on the catalogue, so the home page can be filtered by what a plugin is
-- for and a resource page can name the plugins related to it. Hand-curated:
-- there are sixteen plugins and one author, and a tag is a judgement about
-- what a plugin is *for* that no upstream field carries (SpigotMC's category
-- is too coarse — most of these would land in "Mechanics").
--
-- Seeded from pages/data/plugins.json (every plugin V15 and V19 seeded), the
-- same two-step arrangement V15 set up for the catalogue itself: the site still renders tags from the file,
-- __tests__/pluginCatalogue.test.ts fails if the two disagree, and editing
-- them on the site (rather than by migration) arrives with the catalogue
-- move (#87). One row per (plugin, tag); a plugin's tags are read as a set,
-- so no ordering column.

CREATE TABLE plugin_tags (
    plugin_id UUID        NOT NULL REFERENCES plugins (id) ON DELETE CASCADE,
    tag       VARCHAR(32) NOT NULL,
    PRIMARY KEY (plugin_id, tag)
);

CREATE INDEX idx_plugin_tags_tag ON plugin_tags (tag);

INSERT INTO plugin_tags (plugin_id, tag)
SELECT p.id, t.tag
FROM (VALUES
    ('activity-tracker', 'admin'),
    ('alternate-account-finder', 'admin'),
    ('alternate-account-finder', 'moderation'),
    ('currencies', 'medieval'),
    ('currencies', 'factions'),
    ('currencies', 'economy'),
    ('dans-essentials', 'admin'),
    ('dans-spawn-system', 'admin'),
    ('dans-spawn-system', 'world'),
    ('fiefs', 'medieval'),
    ('fiefs', 'factions'),
    ('food-spoilage', 'survival'),
    ('mailboxes', 'messaging'),
    ('medieval-cookery', 'medieval'),
    ('medieval-cookery', 'roleplay'),
    ('medieval-cookery', 'recipes'),
    ('medieval-factions', 'medieval'),
    ('medieval-factions', 'factions'),
    ('medieval-roleplay-engine', 'medieval'),
    ('medieval-roleplay-engine', 'roleplay'),
    ('more-recipes', 'recipes'),
    ('nether-access-controller', 'admin'),
    ('nether-access-controller', 'moderation'),
    ('nether-access-controller', 'world'),
    ('no-more-creepers', 'survival'),
    ('no-more-creepers', 'mobs'),
    ('simple-skills', 'progression'),
    ('wild-pets', 'survival'),
    ('wild-pets', 'mobs'),
    ('conquest-recipes', 'recipes'),
    ('dans-plugin-manager', 'admin'),
    ('dans-set-home', 'world'),
    ('easy-links', 'utility'),
    ('medieval-economy', 'medieval'),
    ('medieval-economy', 'economy'),
    ('player-lore', 'roleplay')
) AS t (slug, tag)
JOIN plugins p ON p.slug = t.slug;
