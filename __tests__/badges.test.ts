import {describe, expect, it} from 'vitest';
import {badgeLabel, BADGE_LABELS} from '../utils/badges';

describe('badgeLabel', () => {
    it('returns the human-readable label for a known badge code', () => {
        expect(badgeLabel('SERVER_OWNER')).toBe('Server Owner');
    });

    it('falls back to the raw code for an unknown badge', () => {
        expect(badgeLabel('SOME_NEW_BADGE')).toBe('SOME_NEW_BADGE');
    });

    it('is consistent with the BADGE_LABELS map for every known code', () => {
        Object.entries(BADGE_LABELS).forEach(([code, label]) => {
            expect(badgeLabel(code)).toBe(label);
        });
    });
});
