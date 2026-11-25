import React from 'react';
import {Box} from '@mui/material';
import Markdown from 'markdown-to-jsx';
import RepoLink from './RepoLink';

// Themed styling for the rendered markdown elements (markdown-to-jsx emits plain
// HTML tags, so these are descendant-selector rules rather than component props).
const guideBodyStyle = {
    // Every markdown heading renders one level down (see DEMOTED_HEADINGS), so
    // each tag here wears the look of the markdown level it came from.
    '& h2': {fontFamily: '"Space Grotesk", sans-serif', fontSize: '1.8rem', fontWeight: 700, mt: 4, mb: 1.5},
    '& h3': {fontFamily: '"Space Grotesk", sans-serif', fontSize: '1.4rem', fontWeight: 600, mt: 4, mb: 1.5},
    '& h4': {fontFamily: '"Space Grotesk", sans-serif', fontSize: '1.15rem', fontWeight: 600, mt: 3, mb: 1},
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

// The guide is shown under the page's own <h1> ("<Plugin> Guide"), and most
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
                overrides: {...DEMOTED_HEADINGS, a: {component: RepoLink, props: {githubLink}}},
            }}
        >
            {markdown}
        </Markdown>
    </Box>
);

export default GuideMarkdown;
