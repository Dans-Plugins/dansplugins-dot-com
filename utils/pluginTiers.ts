import type {CatalogueTier} from '@kingdom-community/community-site-kit/catalogue';

// The home page lists plugins in tiers, most established first, so a server
// owner meets the proven plugins before the young ones. A plugin's tier is
// derived from what the catalogue already knows (see derivedPluginTier), and
// TIER_OVERRIDES pins one by hand where the derivation gets it wrong.

export type PluginTierKey = 'established' | 'growing' | 'early';

export const PLUGIN_TIERS: readonly CatalogueTier[] = [
    {key: 'established', heading: 'Established', blurb: 'Stable 1.0+ releases listed on SpigotMC: start here.'},
    {key: 'growing', heading: 'Growing', blurb: 'Released and in use, still finding their final shape.'},
    {key: 'early', heading: 'Early releases', blurb: 'Young plugins: try them on a test server first.'},
];

// Hand-set tiers by plugin slug, winning over the derived one.
export const TIER_OVERRIDES: Readonly<Record<string, PluginTierKey>> = {};

interface TierSignals {
    id: string;
    latestVersion?: string | null;
    spigotmcLink?: string | null;
}

// The major version of a release tag such as "v9.0.0" or "1.7.0"; null when
// there is no tag or it does not start with a number.
export const majorVersion = (tag: string | null | undefined): number | null => {
    const match = /^v?(\d+)\./i.exec(tag?.trim() ?? '');
    return match ? Number(match[1]) : null;
};

// Established: a 1.0+ release and a SpigotMC listing. Growing: one of the two.
// Early: neither (a 0.x release with no listing, or no release at all).
export const derivedPluginTier = (plugin: TierSignals): PluginTierKey => {
    const stable = (majorVersion(plugin.latestVersion) ?? 0) >= 1;
    const listed = Boolean(plugin.spigotmcLink);
    if (stable && listed) return 'established';
    if (stable || listed) return 'growing';
    return 'early';
};

export const pluginTier = (plugin: TierSignals): PluginTierKey =>
    TIER_OVERRIDES[plugin.id] ?? derivedPluginTier(plugin);
