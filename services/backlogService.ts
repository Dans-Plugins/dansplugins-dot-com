// Client-side calls to the dpc-api dev-portal backlog endpoints — a read-only
// mirror of open GitHub issues/PRs across the Dans-Plugins org.
import {getApiBaseUrl} from '../utils/apiBase';

const API_BASE = getApiBaseUrl();

export interface BacklogItem {
    repo: string;
    number: number;
    targetId: string;
    itemType: 'ISSUE' | 'PULL_REQUEST';
    title: string;
    draft: boolean;
    authorLogin: string | null;
    htmlUrl: string;
    commentCount: number;
    githubCreatedAt: string;
    githubUpdatedAt: string;
}

export interface RepoSummary {
    repo: string;
    openIssueCount: number;
    openPrCount: number;
    draftPrCount: number;
    oldestOpenItemAt: string | null;
}

// Both calls reject when dpc-api cannot answer (network failure or an error
// status) rather than resolving to an empty list: an empty backlog means "the
// first sync has not run yet", and an outage must not be dressed up as that.
const getJson = async <T>(url: string): Promise<T> => {
    const res = await fetch(url);
    if (!res.ok) {
        throw new Error(`Backlog request failed: HTTP ${res.status}`);
    }
    return await res.json();
};

/** Open issues/PRs, optionally scoped to one repo. Rejects if the API cannot answer. */
export const getBacklogItems = (repo?: string): Promise<BacklogItem[]> =>
    getJson(repo
        ? `${API_BASE}/api/v1/backlog?repo=${encodeURIComponent(repo)}`
        : `${API_BASE}/api/v1/backlog`);

/** Per-repo backlog rollup, sorted largest-first. Rejects if the API cannot answer. */
export const getBacklogSummary = (): Promise<RepoSummary[]> =>
    getJson(`${API_BASE}/api/v1/backlog/summary`);
