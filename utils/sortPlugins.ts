export type SortOption = 'popularity' | 'most-liked' | 'alphabetical'

/** The minimal plugin shape the catalogue sort needs. */
export interface SortablePlugin {
    id: string
    title: string
    serverCount?: number | null
}

const byTitle = (a: SortablePlugin, b: SortablePlugin): number => a.title.localeCompare(b.title)

/**
 * Sort plugins for the catalogue. Pure — returns a new array, never mutates.
 *
 * - `popularity`: bStats server count descending; plugins with a count come
 *   before plugins without one, and ties (or two count-less plugins) fall back
 *   to alphabetical.
 * - `most-liked`: like count descending (a missing count counts as 0), ties
 *   alphabetical.
 * - `alphabetical`: title ascending.
 */
export const sortPlugins = <T extends SortablePlugin>(
    plugins: T[],
    sortBy: SortOption,
    likeCounts: Record<string, number> = {}
): T[] => {
    if (sortBy === 'alphabetical') {
        return [...plugins].sort(byTitle)
    }
    if (sortBy === 'most-liked') {
        return [...plugins].sort((a, b) => {
            const likesA = likeCounts[a.id] ?? 0
            const likesB = likeCounts[b.id] ?? 0
            return likesB - likesA || byTitle(a, b)
        })
    }
    // popularity (server count)
    return [...plugins].sort((a, b) => {
        const hasA = a.serverCount != null
        const hasB = b.serverCount != null
        if (hasA && hasB) return (b.serverCount as number) - (a.serverCount as number)
        if (hasA) return -1
        if (hasB) return 1
        return byTitle(a, b)
    })
}
