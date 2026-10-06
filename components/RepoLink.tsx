import React from 'react';
import {Link} from '@mui/material';
import {resolveRepoLink} from '../utils/guides';

interface RepoLinkProps {
    // markdown-to-jsx passes through whatever the author wrote, so a malformed
    // link can arrive without one.
    href?: string;
    // The repository the markdown came from, supplied per-render through the
    // override's `props` since it differs per plugin. Absent when the caller
    // could not tell which repository that is; the link is then left as written.
    githubLink?: string;
    title?: string;
    children?: React.ReactNode;
}

// Every link rendered from markdown fetched out of a plugin repository — a
// USER_GUIDE.md on /guides/<id>, a mirrored release note on /resources/<slug>.
// A relative target is rewritten to point at that repository (see
// resolveRepoLink); anything that leaves the site opens in a new tab with
// rel="noopener noreferrer", the way the rest of the site's outbound links do.
// In-page anchors stay in the page.
const RepoLink: React.FC<RepoLinkProps> = ({href, githubLink, title, children}) => {
    const written = href ?? '';
    const target = githubLink ? resolveRepoLink(githubLink, written) : written;
    const staysOnPage = target === '' || target.startsWith('#');
    return staysOnPage
        ? <Link href={target} title={title}>{children}</Link>
        : <Link href={target} title={title} target="_blank" rel="noopener noreferrer">{children}</Link>;
};

export default RepoLink;
