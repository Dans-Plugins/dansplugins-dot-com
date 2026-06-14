// Human-readable labels for the badge codes returned by the dpc-api profile
// endpoints. Unknown codes fall back to the raw value so a newly-added badge
// still renders before this map is updated.
export const BADGE_LABELS: Record<string, string> = {
    SERVER_OWNER: 'Server Owner',
}

export const badgeLabel = (code: string): string => BADGE_LABELS[code] ?? code
