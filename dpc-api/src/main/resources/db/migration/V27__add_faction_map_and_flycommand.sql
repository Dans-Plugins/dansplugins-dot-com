-- Two plugins in the Dans-Plugins organization that now have a stable GitHub
-- release with a jar attached but were missing from the catalogue, found by
-- the 2026-10-29 audit of the organization's repositories against it.
-- FlyCommand was left out of V21 for having no stable release; it has had one
-- since 1.0.0 (2026-10-02). Faction Map is new (0.1.0, then 0.2.0). Neither
-- is on SpigotMC, has a bStats project or has an icon yet, so those columns
-- are NULL and the card falls back to the lettered avatar.
--
-- Faction Map only soft-depends on Medieval Factions (it draws the terrain
-- without it), so no plugin_requires edge is seeded for it.
--
-- Still left out on purpose: repositories with no stable release (Radios,
-- Cellphones and the planned plugins, whose only release is the `dev`
-- prerelease).
--
-- The catalogue is edited at /admin/plugins since #87; ON CONFLICT keeps this
-- seed from failing on a box where an admin has already added one of these.

INSERT INTO plugins (id, slug, title, description, github_url, spigotmc_url, bstats_id, icon_path) VALUES
    (gen_random_uuid(), 'faction-map', 'Faction Map',
     'A lightweight 3D map of the world in the browser, with Medieval Factions territories, borders and alliances, wars and vassals drawn on top.',
     'https://github.com/Dans-Plugins/Faction-Map', NULL, NULL, NULL),
    (gen_random_uuid(), 'flycommand', 'FlyCommand',
     'Lets permitted players toggle flight on and off with a single /fly command.',
     'https://github.com/Dans-Plugins/FlyCommand', NULL, NULL, NULL)
ON CONFLICT (slug) DO NOTHING;

-- Tags from the vocabulary V20 set up; no new tag is introduced.
INSERT INTO plugin_tags (plugin_id, tag)
SELECT p.id, t.tag
FROM (VALUES
    ('faction-map', 'medieval'),
    ('faction-map', 'factions'),
    ('faction-map', 'world'),
    ('flycommand', 'utility'),
    ('flycommand', 'admin')
) AS t (slug, tag)
JOIN plugins p ON p.slug = t.slug
ON CONFLICT (plugin_id, tag) DO NOTHING;
