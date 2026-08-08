import {describe, expect, it} from 'vitest';
import {resourceDescription, resourcePath} from '../utils/resources';

describe('resourcePath', () => {
    it('builds the on-site resource route for a slug', () => {
        expect(resourcePath('medieval-factions')).toBe('/resources/medieval-factions');
    });

    it('percent-encodes a slug so the generated link resolves to the route', () => {
        expect(resourcePath('a b')).toBe('/resources/a%20b');
        expect(resourcePath('a/b')).toBe('/resources/a%2Fb');
    });

    it('returns a site-relative path, never an absolute URL', () => {
        expect(resourcePath('fiefs').startsWith('/')).toBe(true);
    });
});

describe('resourceDescription', () => {
    it('uses the plugin description, which is what a search result should show', () => {
        expect(resourceDescription('Fiefs', 'Allows players to create fiefs.'))
            .toBe('Allows players to create fiefs.');
    });

    it('falls back to a community-framed sentence when the description is empty', () => {
        expect(resourceDescription('Fiefs', ''))
            .toBe("Fiefs, a Minecraft plugin from Dan's Plugins Community.");
    });

    it('treats a whitespace-only description as missing', () => {
        expect(resourceDescription('Fiefs', '   ')).toContain("Dan's Plugins Community");
    });
});
