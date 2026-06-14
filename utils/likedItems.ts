import type {LikedTarget} from '../services/likeService'

/** The minimal plugin-catalogue shape needed to label a liked item. */
export interface CataloguePlugin {
    id: string
    title: string
}

/** A liked target resolved into something the UI can render and link to. */
export interface ResolvedLikedItem {
    /** Stable React key, unique across the plugin/guide types. */
    key: string
    targetType: LikedTarget['targetType']
    targetId: string
    /** Human-readable label (plugin/guide title, or the raw id if unknown). */
    title: string
    /** Internal href to view the item. */
    href: string
}

/**
 * Resolve a user's raw liked targets into displayable items by joining them
 * against the plugin catalogue. Both plugin and guide likes key off the plugin
 * id — a guide's id is its plugin's id (see `pages/guides/[id].tsx`). A like
 * whose id is no longer in the catalogue still renders, using the raw id as a
 * fallback label, so a stale like is never silently dropped.
 *
 * Plugins live on the home catalogue (`/#plugins`, there is no per-plugin
 * route); guides have their own page at `/guides/{id}`. The result is sorted by
 * title, with a stable tiebreaker on target type, so the rendered list is
 * deterministic.
 */
export const resolveLikedItems = (
    likes: LikedTarget[],
    plugins: CataloguePlugin[]
): ResolvedLikedItem[] => {
    const byId = new Map(plugins.map((p) => [p.id, p]))
    const resolved = likes.map((like): ResolvedLikedItem => {
        const name = byId.get(like.targetId)?.title ?? like.targetId
        if (like.targetType === 'guide') {
            return {
                key: `guide:${like.targetId}`,
                targetType: 'guide',
                targetId: like.targetId,
                title: `${name} Guide`,
                href: `/guides/${like.targetId}`,
            }
        }
        return {
            key: `plugin:${like.targetId}`,
            targetType: 'plugin',
            targetId: like.targetId,
            title: name,
            href: '/#plugins',
        }
    })
    return resolved.sort((a, b) => {
        const byTitle = a.title.localeCompare(b.title)
        if (byTitle !== 0) return byTitle
        return a.targetType.localeCompare(b.targetType)
    })
}
