import {describe, expect, it} from 'vitest'
import {absoluteDateFrom, relativeTimeFrom} from '../utils/relativeTime'

const NOW = 1_700_000_000_000
const ago = (ms: number) => new Date(NOW - ms).toISOString()

describe('relativeTimeFrom', () => {
    it('returns "just now" under a minute', () => {
        expect(relativeTimeFrom(ago(30 * 1000), NOW)).toBe('just now')
    })

    it('formats minutes, singular and plural', () => {
        expect(relativeTimeFrom(ago(60 * 1000), NOW)).toBe('1 minute ago')
        expect(relativeTimeFrom(ago(5 * 60 * 1000), NOW)).toBe('5 minutes ago')
    })

    it('formats hours', () => {
        expect(relativeTimeFrom(ago(3 * 60 * 60 * 1000), NOW)).toBe('3 hours ago')
    })

    it('formats days', () => {
        expect(relativeTimeFrom(ago(2 * 24 * 60 * 60 * 1000), NOW)).toBe('2 days ago')
        expect(relativeTimeFrom(ago(24 * 60 * 60 * 1000), NOW)).toBe('1 day ago')
    })

    it('returns an empty string for an unparseable timestamp', () => {
        expect(relativeTimeFrom('not-a-date', NOW)).toBe('')
    })
})

describe('absoluteDateFrom', () => {
    it('formats an ISO timestamp as a calendar date', () => {
        expect(absoluteDateFrom('2026-01-02T03:04:05Z')).toBe('January 2, 2026')
    })

    it('formats a date-only string the way the News page always has', () => {
        // pages/news.tsx now shares this helper, so the two must agree.
        expect(absoluteDateFrom('2026-07-04')).toBe('July 4, 2026')
    })

    it('reads the date in UTC, not the runtime time zone', () => {
        // Late-evening UTC is already the next day east of it and still the same
        // day west of it; pinning the zone is what stops the server and the
        // browser rendering different dates for the same release.
        expect(absoluteDateFrom('2026-03-15T23:30:00Z')).toBe('March 15, 2026')
        expect(absoluteDateFrom('2026-03-15T00:30:00Z')).toBe('March 15, 2026')
    })

    it('returns an empty string for an unparseable timestamp', () => {
        expect(absoluteDateFrom('not-a-date')).toBe('')
    })

    it('returns an empty string for an absent date', () => {
        // The footer leans on this: it passes '' for a missing visit-counter
        // start date and shows the counter only when a date comes back, so an
        // empty result has to mean "nothing to print" here too.
        expect(absoluteDateFrom('')).toBe('')
    })
})
