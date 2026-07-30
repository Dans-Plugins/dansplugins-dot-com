// Client-side calls to the dpc-api claim endpoints — "I'm working on this" on a
// backlog issue/PR. A claim is a dpc-api record, not a GitHub assignee.
import {getApiBaseUrl} from '../utils/apiBase';

const API_BASE = getApiBaseUrl();

export interface Claim {
    repo: string;
    number: number;
    targetId: string;
    claimantUsername: string;
    claimedAt: string;
}

/** Every currently active claim, across all repos (public). */
export const getActiveClaims = async (): Promise<Claim[]> => {
    try {
        const res = await fetch(`${API_BASE}/api/v1/claims/active`);
        return res.ok ? await res.json() : [];
    } catch {
        return [];
    }
};

/** The signed-in user's own active claims (requires a token). */
export const getMyClaims = async (token: string): Promise<Claim[]> => {
    try {
        const res = await fetch(`${API_BASE}/api/v1/claims/me`, {
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
    repo: string,
    number: number
): Promise<{ok: true; claim?: Claim} | {ok: false; message: string}> => {
    try {
        const res = await fetch(`${API_BASE}/api/v1/claims`, {
            method,
            headers: {'Content-Type': 'application/json', Authorization: `Bearer ${token}`},
            body: JSON.stringify({repo, number}),
        });
        if (!res.ok) {
            let message = `Request failed (HTTP ${res.status})`;
            try {
                const body = await res.json();
                if (typeof body.detail === 'string') {
                    message = body.detail;
                }
            } catch {
                // Body wasn't JSON (or was empty) — keep the generic message.
            }
            return {ok: false, message};
        }
        if (method === 'DELETE') {
            return {ok: true};
        }
        return {ok: true, claim: await res.json()};
    } catch {
        return {ok: false, message: 'Network error — please try again.'};
    }
};

/** Claim a backlog item. */
export const claimItem = (token: string, repo: string, number: number) =>
    mutate('POST', token, repo, number);

/** Release your own claim on a backlog item. */
export const releaseItem = (token: string, repo: string, number: number) =>
    mutate('DELETE', token, repo, number);
