// Client-side calls to the dpc-api dev-portal backlog endpoints — a read-only
// mirror of open GitHub issues/PRs across the Dans-Plugins org.
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:45345';

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

/** Open issues/PRs, optionally scoped to one repo. */
export const getBacklogItems = async (repo?: string): Promise<BacklogItem[]> => {
    try {
        const url = repo
            ? `${API_BASE}/api/v1/backlog?repo=${encodeURIComponent(repo)}`
            : `${API_BASE}/api/v1/backlog`;
        const res = await fetch(url);
        return res.ok ? await res.json() : [];
    } catch {
        return [];
    }
};

/** Per-repo backlog rollup, sorted largest-first. */
export const getBacklogSummary = async (): Promise<RepoSummary[]> => {
    try {
        const res = await fetch(`${API_BASE}/api/v1/backlog/summary`);
        return res.ok ? await res.json() : [];
    } catch {
        return [];
    }
};
