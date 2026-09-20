-- Six plugins that are published on SpigotMC under the Dan's Plugins account
-- but were missing from the catalogue seeded by V15, found by the 2026-09-20
-- audit of SpigotMC listings against GitHub releases. Same row shape as V15;
-- pages/data/plugins.json gains the same six entries and
-- __tests__/pluginCatalogue.test.ts now reads every migration, so the two
-- copies of the catalogue stay policed until the site renders from this table.
--
-- Easy Links, Dan's Plugin Manager, PlayerLore and Conquest Recipes have no
-- bStats project, so bstats_id is NULL for them as it is for Medieval Cookery.

INSERT INTO plugins (id, slug, title, description, github_url, spigotmc_url, bstats_id, icon_path) VALUES
    (gen_random_uuid(), 'conquest-recipes', 'Conquest Recipes',
     'Adds recipes for the item textures that the Conquest Resource Pack adds to the game.',
     'https://github.com/Dans-Plugins/Conquest-Recipes',
     'https://www.spigotmc.org/resources/conquest-recipes.83594/', NULL, '/icons/cr.png'),
    (gen_random_uuid(), 'dans-plugin-manager', 'Dan''s Plugin Manager',
     'Lets operators download the community''s plugins in-game or from the server console.',
     'https://github.com/Dans-Plugins/Dans-Plugin-Manager',
     'https://www.spigotmc.org/resources/dans-plugin-manager-early-access.100279/', NULL, '/icons/dpm.png'),
    (gen_random_uuid(), 'dans-set-home', 'Dan''s Set Home',
     'Allows players to set and teleport to home locations.',
     'https://github.com/Dans-Plugins/Dans-Set-Home',
     'https://www.spigotmc.org/resources/dans-set-home.79986/', '12126', '/icons/dsh.png'),
    (gen_random_uuid(), 'easy-links', 'Easy Links',
     'Lets players view relevant links with simple commands.',
     'https://github.com/Dans-Plugins/Easy-Links',
     'https://www.spigotmc.org/resources/easylinks-early-access.98040/', NULL, '/icons/el.png'),
    (gen_random_uuid(), 'medieval-economy', 'Medieval Economy',
     'Provides a virtual coinpurse and a physical currency item for simulating an economy.',
     'https://github.com/Dans-Plugins/Medieval-Economy',
     'https://www.spigotmc.org/resources/medieval-economy.81836/', '8998', '/icons/me.png'),
    (gen_random_uuid(), 'player-lore', 'PlayerLore',
     'Allows players to add lore to their items.',
     'https://github.com/Dans-Plugins/PlayerLore',
     'https://www.spigotmc.org/resources/playerlore.98602/', NULL, '/icons/pl.png');
