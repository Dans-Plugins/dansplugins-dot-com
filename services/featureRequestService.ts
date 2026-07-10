// Client-side calls to the dpc-api feature-request endpoints — community
// plugin ideas, upvoted via the existing like mechanism and (admin-only)
// convertible into a real GitHub issue.
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:45345';

export interface FeatureRequest {
    id: string;
    repo: string;
    title: string;
    description: string;
    authorUsername: string;
    status: 'OPEN' | 'CONVERTED';
    convertedIssueUrl: string | null;
    createdAt: string;
}

type Result<T> = {ok: true; value: T} | {ok: false; message: string};

const parseErrorMessage = async (res: Response, fallback: string): Promise<string> => {
    try {
        const body = await res.json();
        return typeof body.detail === 'string' ? body.detail : fallback;
    } catch {
        return fallback;
    }
};

/** Feature requests, optionally scoped to one repo. */
export const getFeatureRequests = async (repo?: string): Promise<FeatureRequest[]> => {
    try {
        const url = repo
            ? `${API_BASE}/api/v1/feature-requests?repo=${encodeURIComponent(repo)}`
            : `${API_BASE}/api/v1/feature-requests`;
        const res = await fetch(url);
        return res.ok ? await res.json() : [];
    } catch {
        return [];
    }
};

/** Submit a new feature request. */
export const createFeatureRequest = async (
    token: string,
    repo: string,
    title: string,
    description: string
): Promise<Result<FeatureRequest>> => {
    try {
        const res = await fetch(`${API_BASE}/api/v1/feature-requests`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json', Authorization: `Bearer ${token}`},
            body: JSON.stringify({repo, title, description}),
        });
        if (!res.ok) {
            return {ok: false, message: await parseErrorMessage(res, `Request failed (HTTP ${res.status})`)};
        }
        return {ok: true, value: await res.json()};
    } catch {
        return {ok: false, message: 'Network error — please try again.'};
    }
};

/** Convert a feature request into a real GitHub issue. Admin-only server-side. */
export const convertFeatureRequest = async (token: string, id: string): Promise<Result<FeatureRequest>> => {
    try {
        const res = await fetch(`${API_BASE}/api/v1/feature-requests/${encodeURIComponent(id)}/convert`, {
            method: 'POST',
            headers: {Authorization: `Bearer ${token}`},
        });
        if (!res.ok) {
            return {ok: false, message: await parseErrorMessage(res, `Request failed (HTTP ${res.status})`)};
        }
        return {ok: true, value: await res.json()};
    } catch {
        return {ok: false, message: 'Network error — please try again.'};
    }
};
