// Per the DPC conventions, each plugin ships an in-repo USER_GUIDE.md (a
// required end-user getting-started guide versioned alongside the code). Link to
// that file on the repository's default branch, derived from the plugin's repo
// link so the Guides page stays in sync with the catalogue (pages/data/plugins.json)
// without hard-coding per-plugin URLs. `blob/HEAD` resolves to the default branch
// (main or master) so we don't have to know each repo's branch name.
// See https://github.com/Dans-Plugins/dpc-conventions (DOCUMENTATION_PRACTICES.md).
export const userGuideUrl = (githubLink: string): string =>
    `${githubLink.replace(/\/+$/, '')}/blob/HEAD/USER_GUIDE.md`;
