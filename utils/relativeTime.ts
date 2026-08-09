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

// Format an ISO timestamp as a fixed calendar date (e.g. "2 January 2026").
// Pinned to en-GB and UTC rather than left to the runtime's locale and time
// zone: this renders inside server-rendered markup, and a date the server and
// the browser disagree about is a hydration mismatch, not a nicety. Returns ''
// for an unparseable timestamp, matching relativeTimeFrom above.
export const absoluteDateFrom = (iso: string): string => {
    const date = new Date(iso)
    if (Number.isNaN(date.getTime())) {
        return ''
    }
    return date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
    })
}
