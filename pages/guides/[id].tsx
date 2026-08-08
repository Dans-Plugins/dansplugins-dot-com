import {Alert, Box, Button, Container, Typography} from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Markdown from 'markdown-to-jsx';
import type {GetServerSideProps, NextPage} from 'next';
import React from 'react';
import TopBar from '../../components/TopBar';
import Seo from '../../components/Seo';
import SelfLoadingLikeButton from '../../components/SelfLoadingLikeButton';
import BottomBar from '../../components/BottomBar';
import {NextLinkComposed} from '../../components/NextLinkComposed';
import {pageStyle, sectionHeaderStyle, containerPaddingStyle} from '../../styles/styles';
import {userGuideUrl, userGuideRawUrl} from '../../utils/guides';

const version = require('../../package.json').version;

interface GuidePlugin {
    id: string;
    title: string;
    githubLink: string;
}

const pluginData = require('../data/plugins.json') as { plugins: GuidePlugin[] };

interface GuidePageProps {
    id: string;
    title: string;
    githubLink: string;
    // The fetched guide markdown, or null if it couldn't be loaded (the page then
    // falls back to a link to GitHub).
    markdown: string | null;
}

export const getServerSideProps: GetServerSideProps<GuidePageProps> = async ({params}) => {
    const id = typeof params?.id === 'string' ? params.id : '';
    const plugin = pluginData.plugins.find((p) => p.id === id);
    if (!plugin) {
        return {notFound: true};
    }
    let markdown: string | null = null;
    try {
        const res = await fetch(userGuideRawUrl(plugin.githubLink));
        if (res.ok) {
            markdown = await res.text();
        }
    } catch {
        // Leave markdown null; the page renders a fallback link to GitHub.
    }
    return {props: {id, title: plugin.title, githubLink: plugin.githubLink, markdown}};
};

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

const GuidePage: NextPage<GuidePageProps> = ({id, title, githubLink, markdown}) => (
    <Box sx={(theme) => pageStyle(theme)}>
        <Seo
            title={`${title} Guide`}
            description={`User guide for the ${title} plugin from Dan's Plugins Community.`}
            // Unlike /u/[username], the id needs no encoding: getServerSideProps
            // only serves ids that match an entry in the plugins.json catalogue,
            // and those are plain slugs.
            path={`/guides/${id}`}
        />
        <TopBar/>
        <Container component="main" id="main" maxWidth="md" sx={(theme) => containerPaddingStyle(theme)}>
            <Button component={NextLinkComposed} to="/guides" startIcon={<ArrowBackIcon/>} sx={{mb: 2}}>
                All guides
            </Button>
            <Box sx={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap'}}>
                <Typography variant="h3" component="h1" gutterBottom sx={(theme) => sectionHeaderStyle(theme)}>
                    {title} Guide
                </Typography>
                <SelfLoadingLikeButton targetType="guide" targetId={id}/>
            </Box>

            {markdown ? (
                <Box sx={guideBodyStyle}>
                    <Markdown>{markdown}</Markdown>
                </Box>
            ) : (
                <Alert
                    severity="info"
                    action={
                        <Button
                            color="inherit"
                            size="small"
                            href={userGuideUrl(githubLink)}
                            target="_blank"
                            rel="noopener noreferrer"
                            endIcon={<OpenInNewIcon/>}
                        >
                            View on GitHub
                        </Button>
                    }
                >
                    This guide couldn&apos;t be loaded right now — you can read it on GitHub instead.
                </Alert>
            )}

            <Box sx={{mt: 4}}>
                <Button
                    href={userGuideUrl(githubLink)}
                    target="_blank"
                    rel="noopener noreferrer"
                    endIcon={<OpenInNewIcon/>}
                    size="small"
                >
                    View this guide on GitHub
                </Button>
            </Box>
        </Container>
        <BottomBar version={version}/>
    </Box>
);

export default GuidePage;
