// Client-side calls to the dpc-api public profile endpoint. Same public API the
// account/leaderboard pages use.
import type {LikedTarget} from './likeService'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:45345'

/** A user's public profile — no internal id and no API keys (see dpc-api PublicProfileResponse). */
export interface PublicProfile {
    username: string
    displayName: string | null
    avatarUrl: string | null
    bio: string | null
    createdAt: string
    likes: LikedTarget[]
}

/**
 * Fetch a user's public profile by username. Resolves to `null` when the user
 * does not exist (404) or the request fails, so callers can render a
 * not-found state without throwing.
 */
export const getPublicProfile = async (username: string): Promise<PublicProfile | null> => {
    try {
        const res = await fetch(`${API_BASE}/api/v1/profile/${encodeURIComponent(username)}`)
        return res.ok ? await res.json() : null
    } catch {
        return null
    }
}
