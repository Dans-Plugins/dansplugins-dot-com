/**
 * Extracts the `owner/repo` slug from a GitHub repository URL.
 * @param githubLink e.g. "https://github.com/Dans-Plugins/Activity-Tracker"
 * @returns "Dans-Plugins/Activity-Tracker" or undefined if the URL doesn't match
 */
export function parseGithubRepo(githubLink: string): string | undefined {
    const match = githubLink.match(/github\.com\/([^/]+)\/([^/#?]+)/i);
    if (!match) {
        return undefined;
    }
    return `${match[1]}/${match[2].replace(/\.git$/, '')}`;
}

/**
 * The repository's releases page, where its downloadable builds live.
 *
 * DPC deliberately does not host plugin files: every plugin publishes its
 * builds as GitHub release assets, so the download path points there rather
 * than at a mirror this site would have to store, scan and defend. See
 * RESOURCE_HUB.md.
 *
 * @param githubLink The repository's GitHub URL
 * @returns The releases URL, or undefined if the link isn't a repository URL
 */
export function releasesUrl(githubLink: string): string | undefined {
    const repo = parseGithubRepo(githubLink);
    return repo ? `https://github.com/${repo}/releases` : undefined;
}

/**
 * Fetches the latest release tag for a GitHub repository.
 *
 * The last direct call this site makes to the GitHub API while rendering, and
 * deliberately a single-plugin one: it is the resource page's fallback for when
 * dpc-api's release mirror has nothing for that plugin. Anything wanting tags
 * for the whole catalogue reads the mirror instead — see
 * `getLatestVersionsBySlug` in `services/pluginVersionService.ts` — because a
 * call per plugin per render does not fit GitHub's unauthenticated rate limit.
 *
 * @param githubLink The repository's GitHub URL
 * @returns The latest release tag name, or undefined if unavailable/error
 */
export async function getLatestRelease(githubLink: string): Promise<string | undefined> {
    const repo = parseGithubRepo(githubLink);
    if (!repo) {
        return undefined;
    }

    try {
        const response = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, {
            headers: {Accept: 'application/vnd.github+json'}
        });

        if (!response.ok) {
            // 404 just means the repo has no releases yet; not an error worth logging.
            if (response.status !== 404) {
                console.error(
                    `Error fetching latest release for ${repo}: HTTP ${response.status} ${response.statusText}`
                );
            }
            return undefined;
        }

        const data = await response.json();

        if (typeof data?.tag_name !== 'string' || data.tag_name.length === 0) {
            return undefined;
        }

        return data.tag_name;
    } catch (error) {
        console.error(`Error fetching latest release for ${repo}:`, error);
        return undefined;
    }
}
