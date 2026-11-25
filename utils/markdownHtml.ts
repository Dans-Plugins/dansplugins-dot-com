// Server-side markdown rendering for the two places the site shows markdown it
// fetched from a plugin repository: a USER_GUIDE.md on /guides/<id> and the
// mirrored release notes on /resources/<slug>.
//
// The markdown is turned into HTML in getServerSideProps and the page only
// injects that string, so markdown-to-jsx (about 22 kB gzipped) never ships to
// the browser. Next.js drops imports used only by getServerSideProps from the
// client bundle; import this module from nowhere else that renders in the
// browser, or the library comes back.
//
// Output is React's own rendering of markdown-to-jsx's tree, so text is escaped
// exactly as it was when the page rendered the markdown itself, and raw HTML in
// the markdown is still not parsed (disableParsingRawHTML).
import {createElement, type ReactNode} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import Markdown from 'markdown-to-jsx';
import {resolveRepoLink} from './guides';
import {parseGithubRepo} from './github';
import type {PluginVersion} from '../services/pluginVersionService';

interface RepoAnchorProps {
    href?: string;
    githubLink?: string;
    title?: string;
    children?: ReactNode;
}

// Every link in markdown fetched out of a plugin repository, as a plain <a>
// (it replaced the MUI-Link-based components/RepoLink.tsx): a relative target
// is rewritten against the repository, anything leaving the site opens in a
// new tab with rel="noopener noreferrer", the way the rest of the site's
// outbound links do, and an in-page anchor stays in the page. The underline and
// colour MUI's Link drew are applied by the container's `& a` rule (see
// markdownLinkStyle in styles/styles.ts).
export const RepoAnchor = ({href, githubLink, title, children}: RepoAnchorProps) => {
    const written = href ?? '';
    const target = githubLink ? resolveRepoLink(githubLink, written) : written;
    const staysOnPage = target === '' || target.startsWith('#');
    return staysOnPage
        ? createElement('a', {href: target, title}, children)
        : createElement('a', {href: target, title, target: '_blank', rel: 'noopener noreferrer'}, children);
};

// A guide is shown under the page's own <h1> ("<Plugin> Guide"), and most
// USER_GUIDE.md files open with a `# Title` of their own. Rendered as-is that
// is a second <h1>, and the guide's `##` sections sit one level too high in
// the outline. Shifting each level down by one keeps a single <h1> per page
// and the guide's structure intact beneath it.
export const DEMOTED_HEADINGS = {
    h1: {component: 'h2'},
    h2: {component: 'h3'},
    h3: {component: 'h4'},
    h4: {component: 'h5'},
    h5: {component: 'h6'},
} as const;

/**
 * Markdown written against a repository, rendered to an HTML string. Relative
 * links resolve against `githubLink`; without one they are left as written.
 * `demoteHeadings` renders each heading one level down (guides; see
 * DEMOTED_HEADINGS).
 */
export const renderRepoMarkdown = (
    markdown: string,
    githubLink?: string,
    {demoteHeadings = false}: {demoteHeadings?: boolean} = {},
): string =>
    renderToStaticMarkup(
        createElement(
            Markdown,
            {
                options: {
                    disableParsingRawHTML: true,
                    overrides: {
                        ...(demoteHeadings ? DEMOTED_HEADINGS : {}),
                        a: {component: RepoAnchor, props: {githubLink}},
                    },
                },
            },
            markdown,
        ),
    );

/** A plugin's USER_GUIDE.md, rendered for the guide page (headings demoted). */
export const renderGuideMarkdown = (markdown: string, githubLink: string): string =>
    renderRepoMarkdown(markdown, githubLink, {demoteHeadings: true});

/** A mirrored release with its notes already rendered (null when it has none). */
export type RenderedPluginVersion = PluginVersion & {changelogHtml: string | null};

/**
 * Renders each release's notes, resolving relative links against the
 * repository named by the release's own GitHub URL.
 */
export const withChangelogHtml = (versions: PluginVersion[]): RenderedPluginVersion[] =>
    versions.map((version) => {
        const repo = parseGithubRepo(version.htmlUrl);
        return {
            ...version,
            changelogHtml: version.changelog
                ? renderRepoMarkdown(version.changelog, repo ? `https://github.com/${repo}` : undefined)
                : null,
        };
    });
