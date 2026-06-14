import {describe, expect, it} from 'vitest'
import {relativeTimeFrom} from '../utils/relativeTime'

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
