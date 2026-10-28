import { describe, expect, it } from 'vitest';
import { derivedPluginTier, majorVersion, PLUGIN_TIERS, pluginTier, TIER_OVERRIDES } from '../utils/pluginTiers';

describe('majorVersion', () => {
    it('reads the major of a tag, with or without a leading v', () => {
        expect(majorVersion('v9.0.0')).toBe(9);
        expect(majorVersion('1.7.0')).toBe(1);
        expect(majorVersion('v0.2.2')).toBe(0);
    });

    it('is null without a numeric tag', () => {
        expect(majorVersion(null)).toBeNull();
        expect(majorVersion(undefined)).toBeNull();
        expect(majorVersion('nightly')).toBeNull();
    });
});

describe('derivedPluginTier', () => {
    const spigot = 'https://www.spigotmc.org/resources/x.1/';

    it('is established for a 1.0+ release listed on SpigotMC', () => {
        expect(derivedPluginTier({ id: 'mf', latestVersion: 'v9.0.0', spigotmcLink: spigot })).toBe('established');
    });

    it('is growing with only one of the two', () => {
        expect(derivedPluginTier({ id: 'a', latestVersion: 'v1.1.3', spigotmcLink: null })).toBe('growing');
        expect(derivedPluginTier({ id: 'b', latestVersion: 'v0.7.0', spigotmcLink: spigot })).toBe('growing');
    });

    it('is early with neither, or no release at all', () => {
        expect(derivedPluginTier({ id: 'c', latestVersion: 'v0.2.1', spigotmcLink: null })).toBe('early');
        expect(derivedPluginTier({ id: 'd', latestVersion: null, spigotmcLink: null })).toBe('early');
    });
});

describe('tier overrides', () => {
    it('name only known tiers', () => {
        const keys = PLUGIN_TIERS.map((tier) => tier.key);
        for (const [id, tier] of Object.entries(TIER_OVERRIDES)) {
            expect(keys, id).toContain(tier);
        }
    });

    it('win over the derived tier', () => {
        for (const [id, tier] of Object.entries(TIER_OVERRIDES)) {
            expect(pluginTier({ id, latestVersion: null, spigotmcLink: null })).toBe(tier);
        }
    });
});
