/**
 * A catalogue as `GET /api/v1/plugins` serves it, for tests that render pages
 * from it now that pages/data/plugins.json is gone. Small, but shaped like
 * the real thing: one plugin with every optional set, one with none, and
 * enough shared tags for the related-plugins ranking to have an opinion.
 */
export const API_CATALOGUE = [
    {
        slug: 'activity-tracker', title: 'Activity Tracker', description: 'Tracks the activity of players.',
        githubUrl: 'https://github.com/Dans-Plugins/Activity-Tracker',
        spigotmcUrl: 'https://www.spigotmc.org/resources/activity-tracker.96724/', bstatsId: '12983',
        iconPath: '/icons/at.png', firstReleasedAt: null, tags: ['admin']
    },
    {
        slug: 'currencies', title: 'Currencies',
        description: 'An expansion for Medieval Factions that allows faction owners to create and mint local currencies.',
        githubUrl: 'https://github.com/Dans-Plugins/Currencies',
        spigotmcUrl: 'https://www.spigotmc.org/resources/currencies.96381/', bstatsId: '12810',
        iconPath: '/icons/c.png', firstReleasedAt: null, tags: ['economy', 'factions', 'medieval']
    },
    {
        slug: 'dans-essentials', title: "Dan's Essentials", description: 'Provides miscellaneous commands.',
        githubUrl: 'https://github.com/Dans-Plugins/Dans-Essentials',
        spigotmcUrl: 'https://www.spigotmc.org/resources/dans-essentials.80513/', bstatsId: '9527',
        iconPath: '/icons/de.png', firstReleasedAt: null, tags: ['admin']
    },
    {
        slug: 'fiefs', title: 'Fiefs', description: 'Allows players to create fiefs and manage them.',
        githubUrl: 'https://github.com/Dans-Plugins/Fiefs',
        spigotmcUrl: 'https://www.spigotmc.org/resources/fiefs-early-access.98559/', bstatsId: '12743',
        iconPath: '/icons/f.png', firstReleasedAt: null, tags: ['factions', 'medieval']
    },
    {
        slug: 'medieval-cookery', title: 'Medieval Cookery',
        description: 'Allows server owners to add cooking recipes for an enhanced roleplay experience.',
        githubUrl: 'https://github.com/Dans-Plugins/Medieval-Cookery',
        spigotmcUrl: null, bstatsId: null, iconPath: null, firstReleasedAt: null, tags: ['medieval', 'recipes', 'roleplay']
    },
    {
        slug: 'medieval-factions', title: 'Medieval Factions',
        description: 'Allows players to organize themselves into feudal, diplomatic, lawful groups akin to nations.',
        githubUrl: 'https://github.com/Dans-Plugins/Medieval-Factions',
        spigotmcUrl: 'https://www.spigotmc.org/resources/medieval-factions.79941/', bstatsId: '8929',
        iconPath: '/icons/mf.png', firstReleasedAt: '2020-06-05T00:07:47Z', tags: ['factions', 'medieval']
    },
];

/** The fetch stub answer for `/api/v1/plugins`. */
export const catalogueResponse = () => ({ok: true, json: async () => API_CATALOGUE} as unknown as Response);
