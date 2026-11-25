import React from 'react';
import {Box} from '@mui/material';
import {markdownLinkStyle} from '../styles/styles';

// Themed styling for the rendered markdown elements (markdown-to-jsx emits plain
// HTML tags, so these are descendant-selector rules rather than component props).
const guideBodyStyle = {
    // Config keys, URLs and class names have no spaces to break at; on a phone
    // they would push the page wider than the screen. <pre> blocks keep their
    // lines and scroll inside themselves instead.
    overflowWrap: 'anywhere',
    // Every markdown heading renders one level down (see DEMOTED_HEADINGS in
    // utils/markdownHtml.ts), so each tag here wears the look of the markdown
    // level it came from.
    '& h2': {fontFamily: '"Space Grotesk", sans-serif', fontSize: '1.8rem', fontWeight: 700, mt: 4, mb: 1.5},
    '& h3': {fontFamily: '"Space Grotesk", sans-serif', fontSize: '1.4rem', fontWeight: 600, mt: 4, mb: 1.5},
    '& h4': {fontFamily: '"Space Grotesk", sans-serif', fontSize: '1.15rem', fontWeight: 600, mt: 3, mb: 1},
    '& p': {mb: 2, lineHeight: 1.7},
    '& ul, & ol': {pl: 3, mb: 2},
    '& li': {mb: 0.5},
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
    // On a phone a wide table scrolls inside itself rather than the page.
    '& table': {borderCollapse: 'collapse', width: '100%', display: {xs: 'block', sm: 'table'}, overflowX: 'auto'},
    '& th, & td': {border: '1px solid', borderColor: 'divider', p: 1, textAlign: 'left'},
};

interface GuideMarkdownProps {
    // The guide, already rendered to HTML on the server by renderGuideMarkdown
    // (utils/markdownHtml.ts), which resolves its relative links against the
    // plugin's repository, renders each heading one level down, and does not
    // parse raw HTML in it (the body is
    // whatever currently sits in a plugin repository's USER_GUIDE.md, not a
    // file this site controls). Rendering it there keeps markdown-to-jsx out
    // of the browser bundle.
    html: string;
}

const GuideMarkdown: React.FC<GuideMarkdownProps> = ({html}) => (
    <Box
        sx={(theme) => ({...guideBodyStyle, '& a': markdownLinkStyle(theme)})}
        dangerouslySetInnerHTML={{__html: html}}
    />
);

export default GuideMarkdown;
