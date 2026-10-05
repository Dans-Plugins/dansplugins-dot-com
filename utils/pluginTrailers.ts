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
// A world clip: the test server's real world, as a spectator camera player
// saw it, rendered in 3D by prismarine-viewer a frame at a time.
const WORLD_CAPTION = 'Rendered in 3D from a test server’s real world, as a spectator camera player saw it while bot players used the plugin; the chat lines are recreated from the server’s real output.';

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
    'dans-plugin-manager': {
        poster: '/trailers/dans-plugin-manager.jpg',
        webm: '/trailers/dans-plugin-manager.webm',
        mp4: '/trailers/dans-plugin-manager.mp4',
        aspect: '16:10',
        alt: "Dan's Plugin Manager in Minecraft chat: a server operator runs /dpm search faction, which lists Medieval Factions, MiniFactions and BlueMap Medieval Factions, then /dpm info herald, which fetches and shows Herald's description, repository and latest release. A recreation of the chat panel; every line is the plugin's real output from a test server.",
        caption: CHAT_CAPTION,
    },
    'democracy': {
        poster: '/trailers/democracy.jpg',
        webm: '/trailers/democracy.webm',
        mp4: '/trailers/democracy.mp4',
        aspect: '16:10',
        alt: "Democracy in Minecraft chat: the leader of the faction Southmarch runs /d start to call an election, /d vote Elspeth, and /d info, which shows the count: Elspeth 2 votes, Garrick 1. The other members stood and voted off-screen (other test players). A recreation of the chat panel; every line is the plugin's real output from a test server.",
        caption: CHAT_CAPTION,
    },
    'medieval-roleplay-engine': {
        poster: '/trailers/medieval-roleplay-engine.jpg',
        webm: '/trailers/medieval-roleplay-engine.webm',
        mp4: '/trailers/medieval-roleplay-engine.mp4',
        aspect: '16:10',
        alt: "Medieval Roleplay Engine in Minecraft chat: /card name Elspeth of Southmarch names the character, /me draws her sword shows as an emote by that name, /roll 1d20+5 rolls and adds, and /yell To arms! is shouted in red. A recreation of the chat panel; every line is the plugin's real output from a test server.",
        caption: CHAT_CAPTION,
    },
    'fiefs': {
        poster: '/trailers/fiefs.jpg',
        webm: '/trailers/fiefs.webm',
        mp4: '/trailers/fiefs.mp4',
        aspect: '16:10',
        alt: "Fiefs in Minecraft chat: inside the faction Southmarch's land, /fi create \"Ironbrook\" creates a fief, /fi claim claims the chunk for it, /fi list shows its power, members and land, and /fi info Ironbrook shows its owner and demesne. A recreation of the chat panel; every line is the plugin's real output from a test server.",
        caption: CHAT_CAPTION,
    },
    'mailboxes': {
        poster: '/trailers/mailboxes.jpg',
        webm: '/trailers/mailboxes.webm',
        mp4: '/trailers/mailboxes.mp4',
        aspect: '16:10',
        alt: "Mailboxes in Minecraft chat: a player is told a message has arrived, runs /m list to see it from Rowena, and /m open to read \"The council meets at noon.\" with Archive and Delete buttons. The sender was another test player, off-screen. A recreation of the chat panel; every line is the plugin's real output from a test server.",
        caption: CHAT_CAPTION,
    },
    'simple-skills': {
        poster: '/trailers/simple-skills.jpg',
        webm: '/trailers/simple-skills.webm',
        mp4: '/trailers/simple-skills.mp4',
        aspect: '16:10',
        alt: "SimpleSkills in Minecraft chat: while a player digs dirt with a shovel, the plugin says they have learned the Digging skill, then that it has levelled up to 1 and to 2, and /ss info lists Digging at level 2 with its experience. A recreation of the chat panel; every line is the plugin's real output from a test server.",
        caption: CHAT_CAPTION,
    },
    'activity-tracker': {
        poster: '/trailers/activity-tracker.jpg',
        webm: '/trailers/activity-tracker.webm',
        mp4: '/trailers/activity-tracker.mp4',
        aspect: '16:10',
        alt: "Activity Tracker in Minecraft chat: /at info shows a player's logins, play time, ranking bar and first login, and /at top 5 lists the most active players with bars. A recreation of the chat panel; every line is the plugin's real output from a test server.",
        caption: CHAT_CAPTION,
    },
    'dans-essentials': {
        poster: '/trailers/dans-essentials.jpg',
        webm: '/trailers/dans-essentials.webm',
        mp4: '/trailers/dans-essentials.mp4',
        aspect: '16:10',
        alt: "Dan's Essentials in Minecraft chat: an operator runs /de getpos for their coordinates, /de label \"Oathkeeper\" to rename the sword in their hand, and /de broadcast to announce to everyone online. A recreation of the chat panel; every line is the plugin's real output from a test server.",
        caption: CHAT_CAPTION,
    },
    'dans-set-home': {
        poster: '/trailers/dans-set-home.jpg',
        webm: '/trailers/dans-set-home.webm',
        mp4: '/trailers/dans-set-home.mp4',
        aspect: '16:10',
        alt: "Dan's Set Home in Minecraft chat: /sethome replies Home set!, and later /home replies Teleporting in 3 seconds... before taking the player back. A recreation of the chat panel; every line is the plugin's real output from a test server.",
        caption: CHAT_CAPTION,
    },
    'easy-links': {
        poster: '/trailers/easy-links.jpg',
        webm: '/trailers/easy-links.webm',
        mp4: '/trailers/easy-links.mp4',
        aspect: '16:10',
        alt: "Easy Links in Minecraft chat: an operator runs /el create \"discord\" with the community's Discord invite, then /el list shows it and /el view \"discord\" prints the link. A recreation of the chat panel; every line is the plugin's real output from a test server.",
        caption: CHAT_CAPTION,
    },
    'medieval-economy': {
        poster: '/trailers/medieval-economy.jpg',
        webm: '/trailers/medieval-economy.webm',
        mp4: '/trailers/medieval-economy.mp4',
        aspect: '16:10',
        alt: "Medieval Economy in Minecraft chat: a new player runs /balance (0 coins in the coinpurse), /deposit 10 to move ten of their starting gold coins into it, and /balance again. A recreation of the chat panel; every line is the plugin's real output from a test server.",
        caption: CHAT_CAPTION,
    },
    'nether-access-controller': {
        poster: '/trailers/nether-access-controller.jpg',
        webm: '/trailers/nether-access-controller.webm',
        mp4: '/trailers/nether-access-controller.mp4',
        aspect: '16:10',
        alt: "Nether Access Controller in Minecraft chat, from an operator's side: /nac list shows who may use the nether, /nac allow Quill lets the player Quill light portals (refused until then), and /nac list again names Quill. A recreation of the chat panel; every line is the plugin's real output from a test server.",
        caption: CHAT_CAPTION,
    },
    'kdr-tracker': {
        poster: '/trailers/kdr-tracker.jpg',
        webm: '/trailers/kdr-tracker.webm',
        mp4: '/trailers/kdr-tracker.mp4',
        aspect: '16:10',
        alt: "KDR Tracker in Minecraft chat: after Bram defeats Cole in a fight, the plugin counts the kill, the death message appears, and /kdrt info shows 1 kill, 0 deaths and a K/D ratio of 1.00. A recreation of the chat panel; every line is the plugin's real output from a test server.",
        caption: CHAT_CAPTION,
    },
    'wild-pets': {
        poster: '/trailers/wild-pets.jpg',
        webm: '/trailers/wild-pets.webm',
        mp4: '/trailers/wild-pets.mp4',
        aspect: '16:10',
        alt: "Wild Pets in Minecraft, rendered in 3D: a player tames a sheep standing beside them and tells it to follow; they walk off, and as they cross into the next chunk the sheep appears at their side. Chat lines from the plugin (Tamed., Ember is now following you.) appear in the corner, recreated from the server's real output.",
        caption: WORLD_CAPTION,
    },
    'dans-spawn-system': {
        poster: '/trailers/dans-spawn-system.jpg',
        webm: '/trailers/dans-spawn-system.webm',
        mp4: '/trailers/dans-spawn-system.mp4',
        aspect: '16:10',
        alt: "Dan's Spawn System in Minecraft, rendered in 3D: a player right-clicks a [Spawn] sign whose lines give a spawn point; the plugin replies Spawn set! and the camera follows them to that point, a stone platform down the meadow. They walk off and are killed, and respawn on the platform (Teleporting to custom spawn!). The chat lines are recreated from the server's real output; the sign is drawn from its real text on the server, since the 3D viewer draws no signs.",
        caption: 'Rendered in 3D from a test server’s real world, as a spectator camera player saw it while a bot player used the plugin. The 3D viewer draws no signs, so the sign is drawn from its real text and position on the server; the chat lines are recreated from the server’s real output.',
    },
    'mini-factions': {
        poster: '/trailers/mini-factions.jpg',
        webm: '/trailers/mini-factions.webm',
        mp4: '/trailers/mini-factions.mp4',
        aspect: '16:10',
        alt: "MiniFactions in Minecraft chat: /mf create Thornwall replies Faction created., /mf claim costs a point of power and claims the chunk, /mf checkclaim confirms it is Thornwall's, and /mf info shows the leader, members, power and territory size. A recreation of the chat panel; every line is the plugin's real output from a test server.",
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
