import {describe, expect, it} from 'vitest'
import {allTags, allTestedVersions, filterPlugins, isFilterActive, relatedPlugins} from '../utils/catalogueFilter'

const plugins = [
    {id: 'mf', title: 'Medieval Factions', description: 'Feudal groups.', tags: ['medieval', 'factions'], testedVersions: ['1.21']},
    {id: 'cur', title: 'Currencies', description: 'Mint local currencies.', tags: ['medieval', 'factions', 'economy'], testedVersions: ['1.21']},
    {id: 'fiefs', title: 'Fiefs', description: 'Create fiefs.', tags: ['medieval', 'factions'], testedVersions: ['1.16', '1.17', '1.18']},
    {id: 'fs', title: 'FoodSpoilage', description: 'Food rots.', tags: ['survival'], testedVersions: ['1.18', '1.19', '1.20']},
    {id: 'mc', title: 'Medieval Cookery', description: 'Cooking recipes.', tags: ['medieval', 'roleplay', 'recipes'], testedVersions: null},
    {id: 'plain', title: 'Plain', description: 'Untagged.'},
]

describe('filterPlugins', () => {
    it('returns everything when no facet is set', () => {
        expect(filterPlugins(plugins, {})).toEqual(plugins)
        expect(filterPlugins(plugins, {query: '  ', tag: null, version: null})).toEqual(plugins)
    })

    it('matches the search text against title, description and tags, case-insensitively', () => {
        expect(filterPlugins(plugins, {query: 'FIEF'}).map((p) => p.id)).toEqual(['fiefs'])
        expect(filterPlugins(plugins, {query: 'rots'}).map((p) => p.id)).toEqual(['fs'])
        expect(filterPlugins(plugins, {query: 'economy'}).map((p) => p.id)).toEqual(['cur'])
    })

    it('keeps only plugins carrying the chosen tag', () => {
        expect(filterPlugins(plugins, {tag: 'factions'}).map((p) => p.id)).toEqual(['mf', 'cur', 'fiefs'])
    })

    it('keeps only plugins that list the chosen Minecraft version as tested, never one whose versions are unknown', () => {
        expect(filterPlugins(plugins, {version: '1.18'}).map((p) => p.id)).toEqual(['fiefs', 'fs'])
        expect(filterPlugins(plugins, {version: '1.21'}).map((p) => p.id)).toEqual(['mf', 'cur'])
    })

    it('composes every facet', () => {
        expect(filterPlugins(plugins, {query: 'c', tag: 'medieval', version: '1.21'}).map((p) => p.id)).toEqual(['mf', 'cur'])
        expect(filterPlugins(plugins, {query: 'currenc', tag: 'medieval', version: '1.21'}).map((p) => p.id)).toEqual(['cur'])
        expect(filterPlugins(plugins, {tag: 'survival', version: '1.21'})).toEqual([])
    })
})

describe('isFilterActive', () => {
    it('is false for an empty or blank filter and true once any facet is set', () => {
        expect(isFilterActive({})).toBe(false)
        expect(isFilterActive({query: '   ', tag: null, version: null})).toBe(false)
        expect(isFilterActive({query: 'x'})).toBe(true)
        expect(isFilterActive({tag: 'admin'})).toBe(true)
        expect(isFilterActive({version: '1.21'})).toBe(true)
    })
})

describe('allTags', () => {
    it('lists each tag in use once, alphabetically', () => {
        expect(allTags(plugins)).toEqual(['economy', 'factions', 'medieval', 'recipes', 'roleplay', 'survival'])
    })
})

describe('allTestedVersions', () => {
    it('lists each version once, newest first, numerically rather than lexically', () => {
        expect(allTestedVersions(plugins)).toEqual(['1.21', '1.20', '1.19', '1.18', '1.17', '1.16'])
        expect(allTestedVersions([{id: 'a', title: 'A', description: '', testedVersions: ['1.9', '1.10', '26.1']}]))
            .toEqual(['26.1', '1.10', '1.9'])
    })
})

describe('relatedPlugins', () => {
    it('ranks by tags in common, ties alphabetical, and excludes the plugin itself', () => {
        expect(relatedPlugins(plugins[0], plugins).map((p) => p.id)).toEqual(['cur', 'fiefs', 'mc'])
    })

    it('honours the limit', () => {
        expect(relatedPlugins(plugins[0], plugins, 1).map((p) => p.id)).toEqual(['cur'])
    })

    it('is empty for an untagged plugin, and omits plugins sharing nothing', () => {
        expect(relatedPlugins(plugins[5], plugins)).toEqual([])
        expect(relatedPlugins(plugins[3], plugins)).toEqual([])
    })
})
