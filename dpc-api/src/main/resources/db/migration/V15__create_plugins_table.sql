-- The plugin catalogue, moved out of the checked-in pages/data/plugins.json and
-- into a table so per-plugin community state (versions, reviews, discussion) has
-- something to hang off. See RESOURCE_HUB.md for why this lands in two steps:
-- this migration seeds the table and dpc-api serves it read-only, while the site
-- still renders from plugins.json. __tests__/pluginCatalogue.test.ts fails if the
-- two ever disagree, and both the file and that guard are deleted once the site
-- renders from this table.
--
-- The slug is the id the catalogue already uses, so existing /guides/[id] URLs
-- and every likes.target_id row keep working unchanged.

CREATE TABLE plugins (
    id           UUID PRIMARY KEY,
    slug         VARCHAR(64)  NOT NULL UNIQUE,
    title        VARCHAR(100) NOT NULL,
    description  VARCHAR(500) NOT NULL,
    github_url   VARCHAR(512) NOT NULL,
    -- Nullable rather than empty-string: a plugin that is not published on
    -- SpigotMC, or has no bStats project, has no value here at all. The
    -- catalogue file spells the same absence as "", normalised away below.
    spigotmc_url VARCHAR(512),
    bstats_id    VARCHAR(32),
    icon_path    VARCHAR(256),
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

INSERT INTO plugins (id, slug, title, description, github_url, spigotmc_url, bstats_id, icon_path) VALUES
    (gen_random_uuid(), 'activity-tracker', 'Activity Tracker',
     'Tracks the activity of players.',
     'https://github.com/Dans-Plugins/Activity-Tracker',
     'https://www.spigotmc.org/resources/activity-tracker.96724/', '12983', '/icons/at.png'),
    (gen_random_uuid(), 'alternate-account-finder', 'Alternate Account Finder',
     'Identifies accounts that have used the same IP address.',
     'https://github.com/Dans-Plugins/AlternateAccountFinder',
     'https://www.spigotmc.org/resources/alternate-account-finder.83290/', '9834', '/icons/aaf.png'),
    (gen_random_uuid(), 'currencies', 'Currencies',
     'An expansion for Medieval Factions that allows faction owners to create and mint local currencies.',
     'https://github.com/Dans-Plugins/Currencies',
     'https://www.spigotmc.org/resources/currencies.96381/', '12810', '/icons/c.png'),
    (gen_random_uuid(), 'dans-essentials', 'Dan''s Essentials',
     'Provides miscellaneous commands.',
     'https://github.com/Dans-Plugins/Dans-Essentials',
     'https://www.spigotmc.org/resources/dans-essentials.80513/', '9527', '/icons/de.png'),
    (gen_random_uuid(), 'dans-spawn-system', 'Dan''s Spawn System',
     'Allows players to use signs to select a custom spawn in their world.',
     'https://github.com/Dans-Plugins/Dans-Spawn-System',
     'https://www.spigotmc.org/resources/dans-spawn-system.82697/', '12161', '/icons/dss.png'),
    (gen_random_uuid(), 'fiefs', 'Fiefs',
     'Allows players to create fiefs and manage them.',
     'https://github.com/Dans-Plugins/Fiefs',
     'https://www.spigotmc.org/resources/fiefs-early-access.98559/', '12743', '/icons/f.png'),
    (gen_random_uuid(), 'food-spoilage', 'FoodSpoilage',
     'Makes food items turn into rotten flesh after a certain period of time.',
     'https://github.com/Dans-Plugins/FoodSpoilage',
     'https://www.spigotmc.org/resources/food-spoilage.81507/', '8992', '/icons/fs.png'),
    (gen_random_uuid(), 'mailboxes', 'Mailboxes',
     'Allows players and plugins to send persistent messages to players.',
     'https://github.com/Dans-Plugins/Mailboxes',
     'https://www.spigotmc.org/resources/mailboxes.96611/', '12902', '/icons/m.png'),
    (gen_random_uuid(), 'medieval-cookery', 'Medieval Cookery',
     'Allows server owners to add cooking recipes for an enhanced roleplay experience.',
     'https://github.com/Dans-Plugins/Medieval-Cookery',
     NULL, NULL, NULL),
    (gen_random_uuid(), 'medieval-factions', 'Medieval Factions',
     'Allows players to organize themselves into feudal, diplomatic, lawful groups akin to nations.',
     'https://github.com/Dans-Plugins/Medieval-Factions',
     'https://www.spigotmc.org/resources/medieval-factions.79941/', '8929', '/icons/mf.png'),
    (gen_random_uuid(), 'medieval-roleplay-engine', 'Medieval Roleplay Engine',
     'Facilitates roleplay between players.',
     'https://github.com/Dans-Plugins/Medieval-Roleplay-Engine',
     'https://www.spigotmc.org/resources/medieval-roleplay-engine.79993/', '8996', '/icons/mre.png'),
    (gen_random_uuid(), 'more-recipes', 'More Recipes',
     'Adds static recipes for items that are not craftable in vanilla.',
     'https://github.com/Dans-Plugins/More-Recipes',
     'https://www.spigotmc.org/resources/more-recipes.81832/', '12140', '/icons/mr.png'),
    (gen_random_uuid(), 'nether-access-controller', 'Nether Access Controller',
     'Allows operators to control who has access to the nether.',
     'https://github.com/Dans-Plugins/Nether-Access-Controller',
     'https://www.spigotmc.org/resources/nether-access-controller.95905/', '12673', '/icons/nac.png'),
    (gen_random_uuid(), 'no-more-creepers', 'NoMoreCreepers',
     'Prevents creepers from spawning.',
     'https://github.com/Dans-Plugins/NoMoreCreepers',
     'https://www.spigotmc.org/resources/nomorecreepers.97946/', '13432', '/icons/nmc.png'),
    (gen_random_uuid(), 'simple-skills', 'SimpleSkills',
     'Introduces skills into the game in a systematic, easy to use, expandable way.',
     'https://github.com/Dans-Plugins/SimpleSkills',
     'https://www.spigotmc.org/resources/simpleskills.98039/', '13470', '/icons/ss.png'),
    (gen_random_uuid(), 'wild-pets', 'Wild Pets',
     'Allows players to tame any entity and keep them as a pet.',
     'https://github.com/Dans-Plugins/Wild-Pets',
     'https://www.spigotmc.org/resources/wild-pets.95800/', '12332', '/icons/wp.png');
