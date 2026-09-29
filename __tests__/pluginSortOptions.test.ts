import {describe, expect, it} from 'vitest'
import {sortCatalogue} from '@kingdom-community/community-site-kit/catalogue'
import {pluginSortOptions, type FilterablePlugin} from '../utils/catalogueFilter'

// The expectations are the ones the site's own sortPlugins had; the orders now
// run through community-site-kit's sortCatalogue.
const sortPlugins = <T extends Omit<FilterablePlugin, 'description'>>(
    plugins: T[],
    key: string,
    likeCounts: Record<string, number> = {},
): T[] => {
    const option = pluginSortOptions(likeCounts).find((candidate) => candidate.key === key)!
    return sortCatalogue(plugins.map((p) => ({description: '', ...p})), option) as unknown as T[]
}

const plugins = [
    {id: 'a', title: 'Apple', serverCount: 10},
    {id: 'b', title: 'Banana', serverCount: 50},
    {id: 'c', title: 'Cherry', serverCount: null},
]

describe('pluginSortOptions', () => {
    it('sorts alphabetically by title', () => {
        expect(sortPlugins(plugins, 'alphabetical').map((p) => p.id)).toEqual(['a', 'b', 'c'])
    })

    it('sorts by server count descending, count-less plugins last', () => {
        expect(sortPlugins(plugins, 'popularity').map((p) => p.id)).toEqual(['b', 'a', 'c'])
    })

    it('breaks a server-count tie of two count-less plugins alphabetically', () => {
        const countless = [
            {id: 'z', title: 'Zeta', serverCount: null},
            {id: 'm', title: 'Mu', serverCount: null},
        ]
        expect(sortPlugins(countless, 'popularity').map((p) => p.id)).toEqual(['m', 'z'])
    })

    it('sorts by downloads through the site descending, a missing count as 0, ties alphabetical', () => {
        const downloaded = [
            {id: 'a', title: 'Apple', downloadCount: 3},
            {id: 'b', title: 'Banana', downloadCount: null},
            {id: 'c', title: 'Cherry', downloadCount: 40},
            {id: 'd', title: 'Damson'},
        ]
        expect(sortPlugins(downloaded, 'most-downloaded').map((p) => p.id)).toEqual(['c', 'a', 'b', 'd'])
    })

    it('sorts by like count descending, ties alphabetical', () => {
        const likeCounts = {a: 1, b: 5, c: 5}
        expect(sortPlugins(plugins, 'most-liked', likeCounts).map((p) => p.id)).toEqual(['b', 'c', 'a'])
    })

    it('treats a missing like count as zero', () => {
        const likeCounts = {a: 3}
        expect(sortPlugins(plugins, 'most-liked', likeCounts).map((p) => p.id)).toEqual(['a', 'b', 'c'])
    })

    it('does not mutate the input array', () => {
        const input = [...plugins]
        sortPlugins(input, 'alphabetical')
        expect(input.map((p) => p.id)).toEqual(['a', 'b', 'c'])
    })
})
