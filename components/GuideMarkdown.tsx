import React from 'react';
import {Box, Link} from '@mui/material';
import Markdown from 'markdown-to-jsx';
import {resolveGuideLink} from '../utils/guides';

// Themed styling for the rendered markdown elements (markdown-to-jsx emits plain
// HTML tags, so these are descendant-selector rules rather than component props).
const guideBodyStyle = {
    '& h1': {fontFamily: '"Space Grotesk", sans-serif', fontSize: '1.8rem', fontWeight: 700, mt: 4, mb: 1.5},
    '& h2': {fontFamily: '"Space Grotesk", sans-serif', fontSize: '1.4rem', fontWeight: 600, mt: 4, mb: 1.5},
    '& h3': {fontFamily: '"Space Grotesk", sans-serif', fontSize: '1.15rem', fontWeight: 600, mt: 3, mb: 1},
    '& p': {mb: 2, lineHeight: 1.7},
    '& ul, & ol': {pl: 3, mb: 2},
    '& li': {mb: 0.5},
    '& a': {color: 'primary.main'},
    '& code': {
        bgcolor: 'action.hover',
        px: 0.6,
        py: 0.2,
        borderRadius: 0.5,
        fontFamily: 'monospace',
        fontSize: '0.9em',
    },
    '& pre': {
        bgcolor: '#0d1117',
        color: '#c9d1d9',
        border: '1px solid',
        borderColor: 'divider',
        p: 2,
        borderRadius: 2,
        overflow: 'auto',
    },
    '& pre code': {bgcolor: 'transparent', p: 0, color: 'inherit', fontSize: '0.85rem'},
    '& blockquote': {borderLeft: '4px solid', borderColor: 'divider', pl: 2, ml: 0, color: 'text.secondary'},
    '& img': {maxWidth: '100%'},
    '& table': {borderCollapse: 'collapse', width: '100%'},
    '& th, & td': {border: '1px solid', borderColor: 'divider', p: 1, textAlign: 'left'},
};

interface GuideLinkProps {
    // markdown-to-jsx passes through whatever the author wrote, so a malformed
    // link can arrive without one.
    href?: string;
    // Supplied per-render through the override's `props`, since the repository a
    // relative target resolves against differs per guide.
    githubLink: string;
    title?: string;
    children?: React.ReactNode;
}

// Every link the guide body renders. A relative target is rewritten to point at
// the repository the guide came from (see resolveGuideLink); anything that
// leaves the site opens in a new tab with rel="noopener noreferrer", the way the
// rest of the site's outbound links do. In-page anchors stay in the page.
export const GuideLink: React.FC<GuideLinkProps> = ({href, githubLink, title, children}) => {
    const target = resolveGuideLink(githubLink, href ?? '');
    const staysOnPage = target === '' || target.startsWith('#');
    return staysOnPage
        ? <Link href={target} title={title}>{children}</Link>
        : <Link href={target} title={title} target="_blank" rel="noopener noreferrer">{children}</Link>;
};

interface GuideMarkdownProps {
    markdown: string;
    // The plugin's repository, used to resolve the guide's relative links.
    githubLink: string;
}

// Raw HTML is disabled for the same reason components/PluginVersionList.tsx
// disables it: markdown-to-jsx parses it by default, and this body is whatever
// currently sits in a plugin repository's USER_GUIDE.md rather than a file this
// site controls. No catalogued guide uses raw HTML today, so nothing rendered
// changes; the setting stops the two markdown renderers from disagreeing.
const GuideMarkdown: React.FC<GuideMarkdownProps> = ({markdown, githubLink}) => (
    <Box sx={guideBodyStyle}>
        <Markdown
            options={{
                disableParsingRawHTML: true,
                overrides: {a: {component: GuideLink, props: {githubLink}}},
            }}
        >
            {markdown}
        </Markdown>
    </Box>
);

export default GuideMarkdown;
