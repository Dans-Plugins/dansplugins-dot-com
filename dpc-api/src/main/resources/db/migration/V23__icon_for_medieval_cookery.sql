-- Icon for Medieval Cookery, the one catalogue plugin still without one; it
-- showed a bare initial where every other plugin shows its disc. The file is
-- new under public/icons, drawn in the house style (light-blue disc, black
-- ring, flat symbol): a cauldron over a fire. Only a NULL icon_path is filled
-- in, so an icon an admin set at /admin/plugins in the meantime is left alone.

UPDATE plugins SET icon_path = '/icons/mc.png'
WHERE slug = 'medieval-cookery' AND icon_path IS NULL;
