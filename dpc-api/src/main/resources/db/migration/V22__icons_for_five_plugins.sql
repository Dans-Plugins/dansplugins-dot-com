-- Icons for the five plugins V21 added without one. The files are new under
-- public/icons, drawn in the house style (light-blue disc, black ring, flat
-- symbol). Only a NULL icon_path is filled in, so an icon an admin set at
-- /admin/plugins in the meantime is left alone.

UPDATE plugins SET icon_path = v.icon_path
FROM (VALUES
    ('bluemap-medieval-factions', '/icons/bmf.png'),
    ('bookshelves-you-can-use',   '/icons/bycu.png'),
    ('herald',                    '/icons/h.png'),
    ('kdr-tracker',               '/icons/kdr.png'),
    ('mini-factions',             '/icons/mnf.png')
) AS v (slug, icon_path)
WHERE plugins.slug = v.slug AND plugins.icon_path IS NULL;
