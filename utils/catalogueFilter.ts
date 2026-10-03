/**
 * The plugin catalogue's search facets and sort orders, as community-site-kit's
 * catalogue helpers take them — the kit does the filtering and sorting itself,
 * the same way on this site as on preponderous.org and danielstephenson.dev.
 * Kept here: which facets a plugin has, what each sort means, and the
 * "related plugins" a resource page names.
 */
import {
    compareDottedVersionsDescending,
    compareTitles,
    descendingBy,
    relatedItems,
    type CatalogueFacet,
    type CatalogueSortOption,
} from '@kingdom-community/community-site-kit/catalogue'

/** The minimal plugin shape filtering and sorting need. */
export interface FilterablePlugin {
    id: string
    title: string
    description: string
    tags?: string[] | null
    // Slugs of the plugins this one cannot run without.
    requires?: string[] | null
    // As SpigotMC lists them, mirrored through Spiget; null when unknown.
    testedVersions?: string[] | null
    serverCount?: number | null
    // Downloads through the site, every release summed.
    downloadCount?: number | null
}

export const TAG_FACET: CatalogueFacet<FilterablePlugin> = {
    key: 'tag',
    label: 'Tag',
    values: (plugin) => plugin.tags,
}

/**
 * A plugin whose tested versions are unknown is excluded by a version filter
 * rather than assumed compatible — "does this run on my server?" deserves a no
 * over a guess. Not searchable: "1.2" as search text should not match 1.21.
 */
export const VERSION_FACET: CatalogueFacet<FilterablePlugin> = {
    key: 'version',
    label: 'Minecraft version',
    values: (plugin) => plugin.testedVersions,
    searchable: false,
    compare: compareDottedVersionsDescending,
}

export const PLUGIN_FACETS = [TAG_FACET, VERSION_FACET]

/**
 * The home page's sort orders. Likes load in the browser after the page, so
 * the like order is built from the counts known at the time.
 *
 * - Popularity: bStats server count; a plugin with no count comes after every
 *   plugin with one.
 * - Most liked / most downloaded: a missing count is 0.
 * - Every order breaks ties by title.
 */
export const pluginSortOptions = (likeCounts: Record<string, number>): CatalogueSortOption<FilterablePlugin>[] => [
    {key: 'popularity', label: 'By Popularity', compare: descendingBy((plugin) => plugin.serverCount)},
    {key: 'most-liked', label: 'Most Liked', compare: descendingBy((plugin) => likeCounts[plugin.id] ?? 0)},
    {key: 'most-downloaded', label: 'Most Downloaded', compare: descendingBy((plugin) => plugin.downloadCount ?? 0)},
    {key: 'alphabetical', label: 'Alphabetical', compare: compareTitles},
]

/**
 * The plugins that cannot run without the given one — its expansions, the way
 * Currencies, Fiefs, Democracy and Bluemap_MedievalFactions are Medieval
 * Factions'. Read from each plugin's own `requires`, never inferred from tags:
 * sharing the "factions" tag is not a dependency. In catalogue order.
 */
export const expansionsOf = <T extends FilterablePlugin>(plugin: T, all: T[]): T[] =>
    all.filter((other) => other.id !== plugin.id && (other.requires ?? []).includes(plugin.id))

/**
 * The catalogue entries the given plugin requires, in catalogue order. A slug
 * the catalogue does not have is skipped rather than shown as a dead link.
 */
export const requiredPlugins = <T extends FilterablePlugin>(plugin: T, all: T[]): T[] => {
    const required = new Set(plugin.requires ?? [])
    return all.filter((other) => other.id !== plugin.id && required.has(other.id))
}

/**
 * Plugins sharing a tag with the given one: most tags in common first, ties
 * alphabetical, at most `limit`. A plugin the page already links as an
 * expansion or a requirement is left out, so the block names something new.
 */
export const relatedPlugins = <T extends FilterablePlugin>(plugin: T, all: T[], limit = 4): T[] => {
    const linked = new Set([...expansionsOf(plugin, all), ...requiredPlugins(plugin, all)].map((other) => other.id))
    return relatedItems(plugin, all.filter((other) => !linked.has(other.id)), TAG_FACET as CatalogueFacet<T>, limit)
}
