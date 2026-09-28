-- Democracy, left out of V21 because it had no stable release. It has one now
-- (0.2.0, 2026-09-28: ported to Medieval Factions 5/6 and booted by the release
-- gates on Minecraft 1.19.4, 1.21.11 and 26.2), and a SpigotMC listing created
-- the same night. No bStats project. The icon is new under public/icons, drawn
-- in the house style (light-blue disc, black ring, flat symbol): a ballot going
-- into a ballot box.
--
-- The catalogue is edited at /admin/plugins since #87; ON CONFLICT keeps this
-- seed from failing on a box where an admin has already added Democracy.

INSERT INTO plugins (id, slug, title, description, github_url, spigotmc_url, bstats_id, icon_path) VALUES
    (gen_random_uuid(), 'democracy', 'Democracy',
     'Lets a Medieval Factions faction hold elections: members stand as candidates, vote, and follow the count. Requires Medieval Factions 5 or 6.',
     'https://github.com/Dans-Plugins/Democracy',
     'https://www.spigotmc.org/resources/democracy.139167/', NULL, '/icons/dem.png')
ON CONFLICT (slug) DO NOTHING;

-- Tags from the vocabulary V20 set up; no new tag is introduced.
INSERT INTO plugin_tags (plugin_id, tag)
SELECT p.id, t.tag
FROM (VALUES
    ('democracy', 'medieval'),
    ('democracy', 'factions'),
    ('democracy', 'roleplay')
) AS t (slug, tag)
JOIN plugins p ON p.slug = t.slug
ON CONFLICT (plugin_id, tag) DO NOTHING;
