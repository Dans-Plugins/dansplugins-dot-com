// Which trace program each plugin reports as. trace (https://github.com/Stephenson-Software/trace)
// names a program by the `application` its client sends, which is the plugin's
// own name rather than this site's slug, so the two have to be paired somewhere.
//
// A static map for now: the names are fixed in each plugin's source and change
// only when a plugin is renamed. It could move into dpc-api's catalogue (a
// `traceName` column beside `bstatsId`) once something other than this site
// needs it.
//
// bluemap-medieval-factions is absent on purpose: it does not report to trace.

export const TRACE_PROGRAM_NAMES: Readonly<Record<string, string>> = {
    'activity-tracker': 'ActivityTracker',
    'alternate-account-finder': 'AlternateAccountFinder',
    'bookshelves-you-can-use': 'BookshelvesYouCanUse',
    'conquest-recipes': 'Conquest-Recipes',
    'currencies': 'Currencies',
    'dans-essentials': 'DansEssentials',
    'dans-plugin-manager': 'DansPluginManager',
    'dans-set-home': 'DansSetHome',
    'dans-spawn-system': 'DansSpawnSystem',
    'democracy': 'Democracy',
    'easy-links': 'EasyLinks',
    'fiefs': 'Fiefs',
    'food-spoilage': 'FoodSpoilage',
    'herald': 'Herald',
    'kdr-tracker': 'KDRTracker',
    'mailboxes': 'Mailboxes',
    'medieval-cookery': 'MedievalCookery',
    'medieval-economy': 'MedievalEconomy',
    'medieval-factions': 'MedievalFactions',
    'medieval-roleplay-engine': 'MedievalRoleplayEngine',
    'mini-factions': 'MiniFactions',
    'more-recipes': 'More-Recipes',
    'nether-access-controller': 'NetherAccessController',
    'no-more-creepers': 'NoMoreCreepers',
    'player-lore': 'PlayerLore',
    'simple-skills': 'SimpleSkills',
    'wild-pets': 'WildPets',
};

/** The trace program a plugin reports as, or undefined for one that does not report. */
export const traceNameFor = (slug: string): string | undefined =>
    Object.prototype.hasOwnProperty.call(TRACE_PROGRAM_NAMES, slug) ? TRACE_PROGRAM_NAMES[slug] : undefined;

/** Every plugin slug that reports to trace, alphabetical. */
export const traceReportingSlugs = (): string[] => Object.keys(TRACE_PROGRAM_NAMES).sort();
