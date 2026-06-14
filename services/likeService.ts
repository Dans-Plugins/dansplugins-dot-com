// Client-side calls to the dpc-api likes endpoints. The base URL is the same
// public API the leaderboard/account pages use.
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:45345';

export type LikeTargetType = 'plugin' | 'guide';

export interface LikedTarget {
    targetType: LikeTargetType;
    targetId: string;
}

/** Public aggregate like counts for a target type: targetId -> count. */
export const getLikeCounts = async (type: LikeTargetType): Promise<Record<string, number>> => {
    try {
        const res = await fetch(`${API_BASE}/api/v1/likes/counts?type=${type}`);
        return res.ok ? await res.json() : {};
    } catch {
        return {};
    }
};

/** The signed-in user's liked targets (requires a token). */
export const getMyLikes = async (token: string): Promise<LikedTarget[]> => {
    try {
        const res = await fetch(`${API_BASE}/api/v1/likes/me`, {
            headers: {Authorization: `Bearer ${token}`},
        });
        return res.ok ? await res.json() : [];
    } catch {
        return [];
    }
};

const mutate = async (
    method: 'POST' | 'DELETE',
    token: string,
    targetType: LikeTargetType,
    targetId: string
): Promise<number | null> => {
    try {
        const res = await fetch(`${API_BASE}/api/v1/likes`, {
            method,
            headers: {'Content-Type': 'application/json', Authorization: `Bearer ${token}`},
            body: JSON.stringify({targetType, targetId}),
        });
        if (!res.ok) {
            return null;
        }
        const data = await res.json();
        return typeof data.count === 'number' ? data.count : null;
    } catch {
        return null;
    }
};

/** Like a target; resolves to the new count, or null on failure. */
export const likeTarget = (token: string, type: LikeTargetType, id: string) =>
    mutate('POST', token, type, id);

/** Unlike a target; resolves to the new count, or null on failure. */
export const unlikeTarget = (token: string, type: LikeTargetType, id: string) =>
    mutate('DELETE', token, type, id);
