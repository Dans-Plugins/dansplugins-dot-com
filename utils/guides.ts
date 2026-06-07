// Per the DPC conventions' two-tier documentation model, each plugin's
// narrative user guide lives on its GitHub wiki "Guide" page. Derive that URL
// from the plugin's repository link so the Guides page stays in sync with the
// plugin catalogue (pages/data/plugins.json) without hard-coding per-plugin URLs.
// See https://github.com/Dans-Plugins/dpc-conventions (DOCUMENTATION_PRACTICES.md).
export const wikiGuideUrl = (githubLink: string): string =>
    `${githubLink.replace(/\/+$/, '')}/wiki/Guide`;
