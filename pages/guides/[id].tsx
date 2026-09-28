import {Alert, Box, Button, Container, Typography} from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ExtensionIcon from '@mui/icons-material/Extension';
import type {GetServerSideProps, NextPage} from 'next';
import React from 'react';
import TopBar from '../../components/TopBar';
import Seo from '../../components/Seo';
import SelfLoadingLikeButton from '../../components/SelfLoadingLikeButton';
import BottomBar from '../../components/BottomBar';
import GuideMarkdown from '../../components/GuideMarkdown';
import {NextLinkComposed} from '../../components/NextLinkComposed';
import {pageStyle, sectionHeaderStyle, containerPaddingStyle} from '../../styles/styles';
import {userGuideUrl, userGuideRawUrl} from '../../utils/guides';
import {getCataloguePlugin} from '../../services/pluginCatalogueService';
import {resourcePath} from '../../utils/resources';

const version = require('../../package.json').version;

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
    const plugin = id ? await getCataloguePlugin(id) : null;
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

const GuidePage: NextPage<GuidePageProps> = ({id, title, githubLink, markdown}) => (
    <Box sx={(theme) => pageStyle(theme)}>
        <Seo
            title={`${title} Guide`}
            description={`User guide for the ${title} plugin from Dan's Plugins Community.`}
            // Unlike /u/[username], the id needs no encoding: getServerSideProps
            // only serves ids that match an entry in the catalogue,
            // and those are plain slugs.
            path={`/guides/${id}`}
        />
        <TopBar/>
        <Container component="main" id="main" maxWidth="md" sx={(theme) => containerPaddingStyle(theme)}>
            {/* The plugin page is where a reader goes next — to download, check
                versions, or report a bug — so it is linked beside the way back. */}
            <Box sx={{display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2}}>
                <Button component={NextLinkComposed} to="/guides" startIcon={<ArrowBackIcon/>}>
                    All guides
                </Button>
                <Button component={NextLinkComposed} to={resourcePath(id)} startIcon={<ExtensionIcon/>} data-testid="guide-plugin-link">
                    {title} plugin page
                </Button>
            </Box>
            <Box sx={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap'}}>
                <Typography variant="h3" component="h1" gutterBottom sx={(theme) => sectionHeaderStyle(theme)}>
                    {title} Guide
                </Typography>
                <SelfLoadingLikeButton targetType="guide" targetId={id}/>
            </Box>

            {markdown ? (
                <GuideMarkdown markdown={markdown} githubLink={githubLink}/>
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

            {/* Guides run to thousands of pixels; the end of one offers the way
                back up and on to the plugin rather than leaving the reader to
                scroll the whole way back. */}
            <Box sx={{mt: 4, display: 'flex', gap: 1, flexWrap: 'wrap'}}>
                <Button href="#main" startIcon={<ArrowUpwardIcon/>} size="small">
                    Back to top
                </Button>
                <Button component={NextLinkComposed} to={resourcePath(id)} startIcon={<ExtensionIcon/>} size="small">
                    {title} plugin page
                </Button>
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
