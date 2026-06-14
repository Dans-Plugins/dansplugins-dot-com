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
