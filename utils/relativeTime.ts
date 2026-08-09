// Timestamp formatting for display. Both formatters here are pure functions of
// their arguments, which is what makes them testable — and, for the absolute
// one, what keeps server-rendered markup identical to what the browser produces
// on hydration.

// Format an ISO timestamp as a short relative time (e.g. "3 days ago"). `now`
// is passed in (rather than read from the clock) so the function is pure and
// testable; callers supply `Date.now()`.
export const relativeTimeFrom = (iso: string, now: number): string => {
    const then = new Date(iso).getTime()
    if (Number.isNaN(then)) {
        return ''
    }
    const seconds = Math.round((now - then) / 1000)
    if (seconds < 60) {
        return 'just now'
    }
    const units: [number, string][] = [
        [60, 'minute'],
        [60, 'hour'],
        [24, 'day'],
    ]
    let value = seconds
    let unit = 'second'
    for (const [size, name] of units) {
        if (value < size) {
            break
        }
        value = Math.round(value / size)
        unit = name
    }
    return `${value} ${unit}${value === 1 ? '' : 's'} ago`
}

// Format an ISO timestamp as a fixed calendar date (e.g. "January 2, 2026").
// This is the site's only calendar-date formatter — news posts, release dates,
// the footer's visit counter, and profile join dates all print through it, so
// one date reads the same wherever it appears.
//
// Pinned to en-US and UTC rather than left to the runtime's locale and time
// zone, for two reasons. In server-rendered markup a date the server and the
// browser disagree about is a hydration mismatch, not a nicety. And even where
// only the browser renders it, an unpinned instant near midnight UTC prints as
// a different calendar day for two visitors in different places.
//
// Returns '' for an unparseable timestamp, matching relativeTimeFrom above.
export const absoluteDateFrom = (iso: string): string => {
    const date = new Date(iso)
    if (Number.isNaN(date.getTime())) {
        return ''
    }
    return date.toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
    })
}
