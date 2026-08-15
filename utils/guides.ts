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

// A link target that already names where it goes: an absolute URL (`https:`,
// `mailto:`), a protocol-relative one (`//host/path`), or an in-page anchor
// (`#commands`). Everything else in a USER_GUIDE.md is written for GitHub, where
// it resolves against the repository.
const isSelfContainedTarget = (href: string): boolean =>
    href.startsWith('#') || href.startsWith('//') || /^[a-z][a-z0-9+.-]*:/i.test(href);

// Rewrite a link found inside a fetched guide so it still goes where its author
// meant. `[Commands](COMMANDS.md)` works on GitHub because the guide is read
// from the repository; rendered at /guides/<id> the browser would resolve it to
// /guides/COMMANDS.md and the site would answer 404. Relative targets are
// therefore pointed back at the repository, on the same `blob/HEAD` default
// branch userGuideUrl uses, with any `#fragment` carried along untouched.
// Self-contained targets are returned unchanged.
export const resolveGuideLink = (githubLink: string, href: string): string => {
    if (href === '' || isSelfContainedTarget(href)) {
        return href;
    }
    // `/docs/x.md` is repository-root-relative and `./x.md` is guide-relative;
    // USER_GUIDE.md lives at the repository root, so both land in the same place.
    const path = href.replace(/^\.?\//, '');
    return `${githubLink.replace(/\/+$/, '')}/blob/HEAD/${path}`;
};
