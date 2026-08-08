import {Avatar, Box, Button, Chip, Container, Divider, Link, Paper, Stack, Typography} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import BugReportIcon from '@mui/icons-material/BugReport';
import DnsIcon from '@mui/icons-material/Dns';
import DownloadIcon from '@mui/icons-material/Download';
import GitHubIcon from '@mui/icons-material/GitHub';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import NewReleasesIcon from '@mui/icons-material/NewReleases';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import type {GetServerSideProps, NextPage} from 'next';
import React from 'react';
import TopBar from '../../components/TopBar';
import Seo from '../../components/Seo';
import BottomBar from '../../components/BottomBar';
import SelfLoadingLikeButton from '../../components/SelfLoadingLikeButton';
import {NextLinkComposed} from '../../components/NextLinkComposed';
import {pageStyle, sectionHeaderStyle, containerPaddingStyle} from '../../styles/styles';
import {getServerCount} from '../../utils/bstats';
import {getLatestRelease, releasesUrl} from '../../utils/github';
import {colorForTitle} from '../../utils/pluginAvatar';
import {resourceDescription, resourcePath} from '../../utils/resources';

const version = require('../../package.json').version;

interface CataloguePlugin {
    id: string;
    title: string;
    description: string;
    githubLink: string;
    spigotmcLink?: string;
    bStatsId?: string;
    icon?: string;
}

const pluginData = require('../data/plugins.json') as { plugins: CataloguePlugin[] };

interface ResourcePageProps {
    slug: string;
    title: string;
    description: string;
    githubLink: string;
    // Everything below is absent for some plugins. Spelled as null rather than
    // omitted because Next.js cannot serialise undefined into page props, and
    // because the catalogue file uses "" for "no SpigotMC page" / "no bStats
    // project", which is the same absence written a third way.
    spigotmcLink: string | null;
    icon: string | null;
    // Live figures; null when bStats or the GitHub API can't be reached, in
    // which case the page simply omits that chip rather than showing a zero.
    serverCount: number | null;
    latestVersion: string | null;
}

// Treat the catalogue's empty strings as the absences they are.
const orNull = (value: string | undefined): string | null => (value && value.trim() ? value : null);

export const getServerSideProps: GetServerSideProps<ResourcePageProps> = async ({params}) => {
    const slug = typeof params?.slug === 'string' ? params.slug : '';
    const plugin = pluginData.plugins.find((p) => p.id === slug);
    if (!plugin) {
        return {notFound: true};
    }

    // Neither figure is load-bearing: a bStats outage or a GitHub rate limit
    // must degrade the page, never fail it. Both helpers already swallow their
    // own errors and resolve to undefined.
    const [serverCount, latestVersion] = await Promise.all([
        plugin.bStatsId ? getServerCount(plugin.bStatsId) : Promise.resolve(undefined),
        getLatestRelease(plugin.githubLink)
    ]);

    return {
        props: {
            slug,
            title: plugin.title,
            description: plugin.description,
            githubLink: plugin.githubLink,
            spigotmcLink: orNull(plugin.spigotmcLink),
            icon: orNull(plugin.icon),
            serverCount: serverCount ?? null,
            latestVersion: latestVersion ?? null
        }
    };
};

const ResourcePage: NextPage<ResourcePageProps> = ({
    slug,
    title,
    description,
    githubLink,
    spigotmcLink,
    icon,
    serverCount,
    latestVersion
}) => {
    const downloads = releasesUrl(githubLink);
    return (
        <Box sx={(theme) => pageStyle(theme)}>
            <Seo
                title={title}
                description={resourceDescription(title, description)}
                path={resourcePath(slug)}
            />
            <TopBar/>
            <Container component="main" id="main" maxWidth="md" sx={(theme) => containerPaddingStyle(theme)}>
                <Button component={NextLinkComposed} to="/" startIcon={<ArrowBackIcon/>} sx={{mb: 2}}>
                    All plugins
                </Button>

                <Stack direction="row" spacing={2} alignItems="center" sx={{mb: 2}}>
                    <Avatar
                        variant="rounded"
                        {...(icon ? {src: icon, alt: `${title} icon`} : {'aria-hidden': true})}
                        sx={{
                            bgcolor: colorForTitle(title),
                            width: 64,
                            height: 64,
                            fontFamily: '"Space Grotesk", sans-serif',
                            fontWeight: 700,
                            fontSize: '1.75rem'
                        }}
                    >
                        {title.charAt(0).toUpperCase()}
                    </Avatar>
                    <Box sx={{flexGrow: 1}}>
                        <Typography variant="h3" component="h1" sx={(theme) => sectionHeaderStyle(theme)}>
                            {title}
                        </Typography>
                    </Box>
                    <SelfLoadingLikeButton targetType="plugin" targetId={slug}/>
                </Stack>

                {serverCount || latestVersion ? (
                    <Stack direction="row" spacing={1} sx={{flexWrap: 'wrap', rowGap: 1, mb: 3}}>
                        {serverCount ? (
                            <Chip
                                size="small"
                                variant="outlined"
                                icon={<DnsIcon/>}
                                label={`${serverCount.toLocaleString()} servers`}
                            />
                        ) : null}
                        {latestVersion ? (
                            <Chip
                                size="small"
                                variant="outlined"
                                icon={<NewReleasesIcon/>}
                                label={`Latest: ${latestVersion}`}
                            />
                        ) : null}
                    </Stack>
                ) : null}

                <Typography variant="body1" color="text.secondary" sx={{mb: 3, lineHeight: 1.7}}>
                    {description}
                </Typography>

                <Stack direction="row" spacing={1} sx={{flexWrap: 'wrap', rowGap: 1, mb: 4}}>
                    {downloads ? (
                        <Button
                            variant="contained"
                            startIcon={<DownloadIcon/>}
                            endIcon={<OpenInNewIcon/>}
                            component={Link}
                            href={downloads}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            Download
                        </Button>
                    ) : null}
                    <Button
                        variant="outlined"
                        startIcon={<MenuBookIcon/>}
                        component={NextLinkComposed}
                        to={`/guides/${slug}`}
                    >
                        User guide
                    </Button>
                    <Button
                        variant="outlined"
                        startIcon={<GitHubIcon/>}
                        endIcon={<OpenInNewIcon/>}
                        component={Link}
                        href={githubLink}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Source
                    </Button>
                    {spigotmcLink ? (
                        <Button
                            variant="outlined"
                            endIcon={<OpenInNewIcon/>}
                            component={Link}
                            href={spigotmcLink}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            SpigotMC
                        </Button>
                    ) : null}
                </Stack>

                <Divider sx={{mb: 3}}/>

                <Paper elevation={0} sx={{p: 2.5, bgcolor: 'action.hover'}}>
                    <Typography variant="h6" component="h2" gutterBottom>
                        Something wrong, or something missing?
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{mb: 2}}>
                        Bugs go to the plugin&apos;s issue tracker, where they can actually be fixed and
                        tracked. Ideas for new behaviour go to the Dev Portal, where the community can
                        upvote them.
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{flexWrap: 'wrap', rowGap: 1}}>
                        <Button
                            size="small"
                            variant="outlined"
                            startIcon={<BugReportIcon/>}
                            endIcon={<OpenInNewIcon/>}
                            component={Link}
                            href={`${githubLink.replace(/\/+$/, '')}/issues/new`}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            Report a bug
                        </Button>
                        <Button
                            size="small"
                            variant="outlined"
                            startIcon={<LightbulbIcon/>}
                            component={NextLinkComposed}
                            to="/dev"
                        >
                            Suggest a feature
                        </Button>
                    </Stack>
                </Paper>
            </Container>
            <BottomBar version={version}/>
        </Box>
    );
};

export default ResourcePage;
