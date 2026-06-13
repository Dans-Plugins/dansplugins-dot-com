// Per the DPC conventions, each plugin ships an in-repo USER_GUIDE.md (a
// required end-user getting-started guide versioned alongside the code). Link to
// that file on the repository's default branch, derived from the plugin's repo
// link so the Guides page stays in sync with the catalogue (pages/data/plugins.json)
// without hard-coding per-plugin URLs. `blob/HEAD` resolves to the default branch
// (main or master) so we don't have to know each repo's branch name.
// See https://github.com/Dans-Plugins/dpc-conventions (DOCUMENTATION_PRACTICES.md).
export const userGuideUrl = (githubLink: string): string =>
    `${githubLink.replace(/\/+$/, '')}/blob/HEAD/USER_GUIDE.md`;

// The raw (plain-text) URL for the same USER_GUIDE.md, used to fetch and render
// the guide on-site. raw.githubusercontent.com accepts `HEAD` as the default
// branch, so we don't need to know whether the repo uses main or master.
export const userGuideRawUrl = (githubLink: string): string =>
    `${githubLink.replace(/\/+$/, '').replace('https://github.com/', 'https://raw.githubusercontent.com/')}/HEAD/USER_GUIDE.md`;
