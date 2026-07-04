import { describe, expect, it } from 'vitest';
import { hasChosenExperience } from '../utils/experience';

describe('hasChosenExperience', () => {
    it('is true once the visitor has dismissed or acted on the splash', () => {
        expect(hasChosenExperience('true')).toBe(true);
    });

    it('is false when nothing is stored yet', () => {
        expect(hasChosenExperience(null)).toBe(false);
    });

    it('is false for any unrecognised value', () => {
        expect(hasChosenExperience('false')).toBe(false);
        expect(hasChosenExperience('')).toBe(false);
        expect(hasChosenExperience('yes')).toBe(false);
    });
});
