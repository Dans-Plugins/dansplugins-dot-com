-- Five plugins in the Dans-Plugins organization that have a stable GitHub
-- release with a jar attached but were missing from the catalogue, found by
-- the 2026-09-25 audit of the organization's repositories against it. None is
-- on SpigotMC, so spigotmc_url is NULL; MiniFactions is the only one with a
-- bStats project (14969, read from its onEnable). None has an icon under
-- public/icons yet, so icon_path is NULL and the card falls back to the
-- lettered avatar (utils/pluginAvatar.ts).
--
-- Left out on purpose: repositories with no stable release (Democracy,
-- FlyCommand, Radios, Cellphones and the September idea repositories),
-- libraries (Ponder) and forks that ship someone else's plugin as is (RPKit,
-- minecraft-nodes). Bluemap_MedievalFactions is a fork too, but its release
-- is published from this organization; the description credits its author.
--
-- The catalogue is edited at /admin/plugins since #87; ON CONFLICT keeps this
-- seed from failing on a box where an admin has already added one of these.

INSERT INTO plugins (id, slug, title, description, github_url, spigotmc_url, bstats_id, icon_path) VALUES
    (gen_random_uuid(), 'bluemap-medieval-factions', 'BlueMap Medieval Factions',
     'Renders Medieval Factions claims on BlueMap''s web map. Originally written by Kilz.',
     'https://github.com/Dans-Plugins/Bluemap_MedievalFactions', NULL, NULL, NULL),
    (gen_random_uuid(), 'bookshelves-you-can-use', 'Bookshelves You Can Use',
     'Turns bookshelves into usable storage: right-click one to open a small inventory.',
     'https://github.com/Dans-Plugins/Bookshelves-You-Can-Use', NULL, NULL, NULL),
    (gen_random_uuid(), 'herald', 'Herald',
     'Sends a Discord webhook notification (or an email) when a player joins the server.',
     'https://github.com/Dans-Plugins/Herald', NULL, NULL, NULL),
    (gen_random_uuid(), 'kdr-tracker', 'KDR Tracker',
     'Keeps track of players'' kill/death ratios.',
     'https://github.com/Dans-Plugins/KDRTracker', NULL, NULL, NULL),
    (gen_random_uuid(), 'mini-factions', 'MiniFactions',
     'Introduces factions into the game in a simple, minimal, expandable way.',
     'https://github.com/Dans-Plugins/MiniFactions', NULL, '14969', NULL)
ON CONFLICT (slug) DO NOTHING;

-- Tags from the vocabulary V20 set up; no new tag is introduced.
INSERT INTO plugin_tags (plugin_id, tag)
SELECT p.id, t.tag
FROM (VALUES
    ('bluemap-medieval-factions', 'medieval'),
    ('bluemap-medieval-factions', 'factions'),
    ('bluemap-medieval-factions', 'world'),
    ('bookshelves-you-can-use', 'survival'),
    ('bookshelves-you-can-use', 'utility'),
    ('herald', 'admin'),
    ('herald', 'messaging'),
    ('kdr-tracker', 'utility'),
    ('mini-factions', 'factions')
) AS t (slug, tag)
JOIN plugins p ON p.slug = t.slug
ON CONFLICT (plugin_id, tag) DO NOTHING;
