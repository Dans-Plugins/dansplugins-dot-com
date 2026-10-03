import {describe, expect, it} from 'vitest'
import {facetValues, filterCatalogue, isCatalogueQueryActive} from '@kingdom-community/community-site-kit/catalogue'
import {PLUGIN_FACETS, TAG_FACET, VERSION_FACET, expansionsOf, relatedPlugins, requiredPlugins, type FilterablePlugin} from '../utils/catalogueFilter'

// The expectations are the ones the site's own helpers had; the rules now run
// through community-site-kit's catalogue helpers with this site's facets.
interface Filter {query?: string; tag?: string | null; version?: string | null}
const toQuery = ({query, tag, version}: Filter) => ({text: query, facets: {tag, version}})
const filterPlugins = <T extends FilterablePlugin>(all: T[], filter: Filter) => filterCatalogue(all, PLUGIN_FACETS, toQuery(filter))
const isFilterActive = (filter: Filter) => isCatalogueQueryActive(toQuery(filter))
const allTags = (all: FilterablePlugin[]) => facetValues(all, TAG_FACET)
const allTestedVersions = (all: FilterablePlugin[]) => facetValues(all, VERSION_FACET)

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

    it('leaves out the expansions and requirements the page already links', () => {
        const withRequires = plugins.map((p) => (p.id === 'cur' || p.id === 'fiefs' ? {...p, requires: ['mf']} : p))
        expect(relatedPlugins(withRequires[0], withRequires).map((p) => p.id)).toEqual(['mc'])
        // Currencies' sibling add-on is still related; the plugin it requires is not.
        expect(relatedPlugins(withRequires[1], withRequires).map((p) => p.id)).toEqual(['fiefs', 'mc'])
    })
})

describe('expansionsOf and requiredPlugins', () => {
    const catalogue = [
        {id: 'cur', title: 'Currencies', description: '', tags: ['factions'], requires: ['mf']},
        {id: 'fiefs', title: 'Fiefs', description: '', tags: ['factions'], requires: ['mf', 'gone']},
        {id: 'mf', title: 'Medieval Factions', description: '', tags: ['factions'], requires: []},
        {id: 'mre', title: 'Medieval Roleplay Engine', description: '', tags: ['factions']},
    ]

    it('lists the plugins requiring the given one, in catalogue order, never from tags alone', () => {
        expect(expansionsOf(catalogue[2], catalogue).map((p) => p.id)).toEqual(['cur', 'fiefs'])
        expect(expansionsOf(catalogue[3], catalogue)).toEqual([])
    })

    it('resolves what a plugin requires, skipping a slug the catalogue lacks', () => {
        expect(requiredPlugins(catalogue[1], catalogue).map((p) => p.id)).toEqual(['mf'])
        expect(requiredPlugins(catalogue[2], catalogue)).toEqual([])
        expect(requiredPlugins(catalogue[3], catalogue)).toEqual([])
    })

    it('ignores a plugin naming itself', () => {
        const selfish = [{id: 'x', title: 'X', description: '', requires: ['x']}]
        expect(expansionsOf(selfish[0], selfish)).toEqual([])
        expect(requiredPlugins(selfish[0], selfish)).toEqual([])
    })
})
