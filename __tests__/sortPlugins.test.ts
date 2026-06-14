import {describe, expect, it} from 'vitest'
import {sortPlugins} from '../utils/sortPlugins'

const plugins = [
    {id: 'a', title: 'Apple', serverCount: 10},
    {id: 'b', title: 'Banana', serverCount: 50},
    {id: 'c', title: 'Cherry', serverCount: null},
]

describe('sortPlugins', () => {
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
