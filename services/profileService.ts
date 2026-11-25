// Client-side calls to the dpc-api public profile endpoint. Same public API the
// account/leaderboard pages use.
import type {LikedTarget} from './likeService'
import {getApiBaseUrl} from '../utils/apiBase'

const API_BASE = getApiBaseUrl()

/** A user's public profile — no internal id and no API keys (see dpc-api PublicProfileResponse). */
export interface PublicProfile {
    username: string
    displayName: string | null
    avatarUrl: string | null
    bio: string | null
    createdAt: string
    badges: string[]
    likes: LikedTarget[]
}

/**
 * Fetch a user's public profile by username. Resolves to `null` only when
 * dpc-api says the user does not exist (404), and rejects when the API could
 * not answer (network failure or any other error status), so the page can
 * tell "no such user" apart from "try again later" instead of claiming a real
 * user does not exist during an outage.
 */
export const getPublicProfile = async (username: string): Promise<PublicProfile | null> => {
    const res = await fetch(`${API_BASE}/api/v1/profile/${encodeURIComponent(username)}`)
    if (res.status === 404) {
        return null
    }
    if (!res.ok) {
        throw new Error(`Profile request failed: HTTP ${res.status}`)
    }
    return await res.json()
}
