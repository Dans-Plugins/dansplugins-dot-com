import {describe, expect, it} from 'vitest';
import {TRACE_PROGRAM_NAMES, traceNameFor, traceReportingSlugs} from '../utils/traceNames';

describe('trace program names', () => {
    it('maps the 27 reporting plugins', () => {
        expect(Object.keys(TRACE_PROGRAM_NAMES)).toHaveLength(27);
    });

    it('gives every plugin its own program', () => {
        const names = Object.values(TRACE_PROGRAM_NAMES);
        expect(new Set(names).size).toBe(names.length);
    });

    it('resolves a slug to the name its plugin reports as, including the hyphenated ones', () => {
        expect(traceNameFor('medieval-factions')).toBe('MedievalFactions');
        expect(traceNameFor('kdr-tracker')).toBe('KDRTracker');
        expect(traceNameFor('conquest-recipes')).toBe('Conquest-Recipes');
        expect(traceNameFor('more-recipes')).toBe('More-Recipes');
    });

    it('has no name for a plugin that does not report, or for an unknown slug', () => {
        expect(traceNameFor('bluemap-medieval-factions')).toBeUndefined();
        expect(traceNameFor('not-a-plugin')).toBeUndefined();
        // Not fooled by Object.prototype.
        expect(traceNameFor('toString')).toBeUndefined();
    });

    it('lists the reporting slugs alphabetically', () => {
        const slugs = traceReportingSlugs();
        expect(slugs).toEqual([...slugs].sort());
        expect(slugs).not.toContain('bluemap-medieval-factions');
    });
});
