-- SpigotMC links for four catalogue plugins that got their first SpigotMC
-- listing on 2026-10-29: Herald (140089), KDR Tracker (140090), MiniFactions
-- (140091) and Medieval Cookery (140092). Each listing serves the plugin's
-- current stable release from GitHub, so the catalogue card's SpigotMC button
-- now has somewhere to go. Only a NULL spigotmc_url is filled in, so a link an
-- admin set at /admin/plugins in the meantime is left alone.

UPDATE plugins SET spigotmc_url = 'https://www.spigotmc.org/resources/herald.140089/'
WHERE slug = 'herald' AND spigotmc_url IS NULL;

UPDATE plugins SET spigotmc_url = 'https://www.spigotmc.org/resources/kdr-tracker.140090/'
WHERE slug = 'kdr-tracker' AND spigotmc_url IS NULL;

UPDATE plugins SET spigotmc_url = 'https://www.spigotmc.org/resources/minifactions.140091/'
WHERE slug = 'mini-factions' AND spigotmc_url IS NULL;

UPDATE plugins SET spigotmc_url = 'https://www.spigotmc.org/resources/medieval-cookery.140092/'
WHERE slug = 'medieval-cookery' AND spigotmc_url IS NULL;
