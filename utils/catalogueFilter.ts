/**
 * Faceted filtering of the catalogue, and the "related plugins" a resource
 * page names — pure functions over the plugin shape the pages already hold,
 * so they can be tested without rendering.
 */

/** The minimal plugin shape filtering needs. */
export interface FilterablePlugin {
    id: string
    title: string
    description: string
    tags?: string[] | null
    // As SpigotMC lists them, mirrored through Spiget; null when unknown.
    testedVersions?: string[] | null
}

export interface CatalogueFilter {
    query?: string
    tag?: string | null
    version?: string | null
}

const matchesQuery = (plugin: FilterablePlugin, query: string): boolean =>
    plugin.title.toLowerCase().includes(query) ||
    plugin.description.toLowerCase().includes(query) ||
    (plugin.tags ?? []).some((tag) => tag.toLowerCase().includes(query))

/**
 * Every facet composes: a plugin is shown only if it matches the search
 * text (title, description or a tag), carries the chosen tag, and lists the
 * chosen Minecraft version as tested. A plugin whose tested versions are
 * unknown is excluded by a version filter rather than assumed compatible —
 * "does this run on my server?" deserves a no over a guess.
 */
export const filterPlugins = <T extends FilterablePlugin>(plugins: T[], filter: CatalogueFilter): T[] => {
    const query = filter.query?.trim().toLowerCase() ?? ''
    return plugins.filter((plugin) =>
        (!query || matchesQuery(plugin, query)) &&
        (!filter.tag || (plugin.tags ?? []).includes(filter.tag)) &&
        (!filter.version || (plugin.testedVersions ?? []).includes(filter.version)))
}

export const isFilterActive = (filter: CatalogueFilter): boolean =>
    Boolean(filter.query?.trim() || filter.tag || filter.version)

/** Every tag in use, alphabetical, so the filter offers only choices that match something. */
export const allTags = (plugins: FilterablePlugin[]): string[] =>
    Array.from(new Set(plugins.flatMap((plugin) => plugin.tags ?? []))).sort()

const versionKey = (version: string): number[] =>
    version.split('.').map((part) => Number.parseInt(part, 10) || 0)

const compareVersions = (a: string, b: string): number => {
    const ka = versionKey(a)
    const kb = versionKey(b)
    for (let i = 0; i < Math.max(ka.length, kb.length); i++) {
        const diff = (ka[i] ?? 0) - (kb[i] ?? 0)
        if (diff !== 0) return diff
    }
    return 0
}

/** Every tested Minecraft version any plugin lists, newest first. */
export const allTestedVersions = (plugins: FilterablePlugin[]): string[] =>
    Array.from(new Set(plugins.flatMap((plugin) => plugin.testedVersions ?? []))).sort((a, b) => compareVersions(b, a))

/**
 * Plugins sharing a tag with the given one: most tags in common first, ties
 * alphabetical, at most `limit`. Currencies and Fiefs both call themselves
 * expansions of Medieval Factions; this is where the site finally says so.
 */
export const relatedPlugins = <T extends FilterablePlugin>(plugin: FilterablePlugin, all: T[], limit = 4): T[] => {
    const tags = new Set(plugin.tags ?? [])
    if (tags.size === 0) return []
    return all
        .filter((other) => other.id !== plugin.id)
        .map((other) => ({ other, shared: (other.tags ?? []).filter((tag) => tags.has(tag)).length }))
        .filter(({ shared }) => shared > 0)
        .sort((a, b) => b.shared - a.shared || a.other.title.localeCompare(b.other.title))
        .slice(0, limit)
        .map(({ other }) => other)
}
