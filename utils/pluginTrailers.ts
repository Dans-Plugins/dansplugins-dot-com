// Short gameplay clips ("previews") for some plugins, keyed by catalogue slug.
//
// Kept here in code rather than in dpc-api's catalogue: a clip is a set of
// files shipped with this site (public/trailers/), recorded by the scripts in
// scripts/previews/, so it changes with a commit to this repo and never with a
// catalogue edit. No column, no migration. A slug the catalogue no longer has
// is simply never looked up.

export type TrailerAspect = '1:1' | '16:10';

export interface PluginTrailer {
    // A still from the clip: the only part the server renders, and all a
    // visitor who prefers reduced motion ever sees.
    poster: string;
    webm?: string;
    mp4?: string;
    // What the clip shows, for screen readers (the clip itself is decorative
    // motion with no sound).
    alt: string;
    aspect?: TrailerAspect;
    // Shown under the clip on the plugin's page: how it was made. A chat clip
    // is a recreation of the chat window and must say so.
    caption: string;
}

const CHAT_CAPTION = 'A recreated chat panel: every line is the plugin’s real output, captured from commands a bot player ran on a test server.';

export const PLUGIN_TRAILERS: Readonly<Record<string, PluginTrailer>> = {
    'medieval-factions': {
        poster: '/trailers/medieval-factions.jpg',
        webm: '/trailers/medieval-factions.webm',
        mp4: '/trailers/medieval-factions.mp4',
        aspect: '16:10',
        alt: 'Medieval Factions in Minecraft chat: /mf create Oakvale founds a faction, /mf claim claims the chunk, and /mf map shows the new claim between two neighbouring factions’ territory. A recreation of the chat panel; every line is the plugin’s real output from a test server.',
        caption: CHAT_CAPTION,
    },
    'currencies': {
        poster: '/trailers/currencies.jpg',
        webm: '/trailers/currencies.webm',
        mp4: '/trailers/currencies.mp4',
        aspect: '16:10',
        alt: 'Currencies in Minecraft chat: /currency create Ducat offers to rename the held gold nugget, the currency is created, /currency mint Ducat 3 mints three coins, and /currency info Ducat shows it belongs to the faction Southmarch with 3 minted. A recreation of the chat panel; every line is the plugin’s real output from a test server.',
        caption: CHAT_CAPTION,
    },
    'bluemap-medieval-factions': {
        poster: '/trailers/bluemap-medieval-factions.jpg',
        webm: '/trailers/bluemap-medieval-factions.webm',
        mp4: '/trailers/bluemap-medieval-factions.mp4',
        aspect: '16:10',
        alt: 'BlueMap’s web map of a Minecraft world with three Medieval Factions territories drawn in their faction colours (Riverhold blue, Ashford yellow, Southmarch red) and members’ player heads; the view zooms in on Southmarch and clicking it opens the label “Faction: Southmarch”.',
        caption: 'Recorded from BlueMap’s own web map on a test server, with claims made beforehand by bot players running the plugin\u2019s commands.',
    },
};

/** The plugin's clip, or null when it has none. */
export const trailerFor = (slug: string): PluginTrailer | null => PLUGIN_TRAILERS[slug] ?? null;

/** A clip's aspect as a CSS aspect-ratio value. */
export const trailerAspectRatio = (trailer: Pick<PluginTrailer, 'aspect'>): string =>
    trailer.aspect === '16:10' ? '16 / 10' : '1 / 1';
