import {Avatar, Box, Button, Chip, Container, Divider, Link, Paper, Stack, Typography} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import BugReportIcon from '@mui/icons-material/BugReport';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import DnsIcon from '@mui/icons-material/Dns';
import DownloadIcon from '@mui/icons-material/Download';
import GitHubIcon from '@mui/icons-material/GitHub';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import NewReleasesIcon from '@mui/icons-material/NewReleases';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import VerifiedIcon from '@mui/icons-material/Verified';
import StarIcon from '@mui/icons-material/Star';
import type {GetServerSideProps, NextPage} from 'next';
import React from 'react';
import TopBar from '../../components/TopBar';
import Seo from '../../components/Seo';
import BottomBar from '../../components/BottomBar';
import SelfLoadingLikeButton from '../../components/SelfLoadingLikeButton';
import PluginVersionList from '../../components/PluginVersionList';
import {NextLinkComposed} from '../../components/NextLinkComposed';
import {
    getPlugin,
    getPluginDownloads,
    getPluginVersions,
    latestStableTag,
    totalDownloads,
    PluginDownloads,
    PluginVersion
} from '../../services/pluginVersionService';
import {pageStyle, sectionHeaderStyle, containerPaddingStyle} from '../../styles/styles';
import {getServerCount} from '../../utils/bstats';
import {formatTestedVersions, getSpigotListing, shownRating, spigotResourceId, spigotReviewsUrl} from '../../utils/spigot';
import {getLatestRelease, releasesUrl} from '../../utils/github';
import {colorForTitle} from '../../utils/pluginAvatar';
import {absoluteDateFrom} from '../../utils/relativeTime';
import {resourceDescription, resourcePath} from '../../utils/resources';
import {relatedPlugins} from '../../utils/catalogueFilter';

const version = require('../../package.json').version;

interface CataloguePlugin {
    id: string;
    title: string;
    description: string;
    githubLink: string;
    spigotmcLink?: string;
    bStatsId?: string;
    icon?: string;
    tags?: string[];
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
    // Minecraft versions the author lists as tested on SpigotMC, through
    // Spiget. Null for a plugin with no SpigotMC page, and when Spiget can't
    // be reached; the chip is omitted either way.
    testedVersions: string[] | null;
    // SpigotMC's rating and download count, from the same listing — a bridge
    // until the site has reviews of its own, shown as SpigotMC's figures and
    // linked there. The rating is null below the review threshold as well as
    // when unknown; either figure being null omits its chip.
    spigotRating: {average: number; count: number} | null;
    spigotDownloads: number | null;
    // The release history dpc-api mirrors from GitHub. Empty for a plugin that
    // publishes no releases, and also whenever the API can't be reached — the
    // page hides the section either way rather than failing.
    versions: PluginVersion[];
    // Downloads made through this site — total, and of the latest release —
    // the pair a SpigotMC resource page shows. Null when the API can't be
    // reached, and the figures are omitted rather than shown as zeros.
    downloads: PluginDownloads | null;
    // The two dates a SpigotMC resource page states. The last update is the
    // newest mirrored release; the first release is what dpc-api has recorded
    // (see PluginRecord) — the mirror's oldest row would be wrong for any
    // plugin with more releases than the mirror keeps, so it is not used. Null
    // hides the line, never guesses.
    firstReleasedAt: string | null;
    lastUpdatedAt: string | null;
    // From the catalogue: what the plugin is for, and the plugins sharing a
    // tag with it (most in common first). Currencies and Fiefs both call
    // themselves expansions of Medieval Factions; this is where the site
    // finally says so.
    tags: string[];
    related: RelatedPlugin[];
}

interface RelatedPlugin {
    slug: string;
    title: string;
    description: string;
    icon: string | null;
}

// Treat the catalogue's empty strings as the absences they are.
const orNull = (value: string | undefined): string | null => (value && value.trim() ? value : null);

export const getServerSideProps: GetServerSideProps<ResourcePageProps> = async ({params}) => {
    const slug = typeof params?.slug === 'string' ? params.slug : '';
    const plugin = pluginData.plugins.find((p) => p.id === slug);
    if (!plugin) {
        return {notFound: true};
    }

    // The mirror first, because what it returns decides whether GitHub needs
    // asking at all: a mirrored release list already names the latest tag, and
    // the whole point of mirroring is that a page render doesn't spend a call
    // on GitHub's rate limit to learn something dpc-api already knows.
    const [versions, downloads, record] = await Promise.all([
        getPluginVersions(slug), getPluginDownloads(slug), getPlugin(slug)
    ]);
    const mirroredLatest = latestStableTag(versions);

    // Neither figure is load-bearing: a bStats outage or a GitHub rate limit
    // must degrade the page, never fail it. Both helpers already swallow their
    // own errors and resolve to undefined.
    const spigotId = spigotResourceId(plugin.spigotmcLink);
    const [serverCount, spigotListing, latestFromGithub] = await Promise.all([
        plugin.bStatsId ? getServerCount(plugin.bStatsId) : Promise.resolve(undefined),
        spigotId ? getSpigotListing(spigotId) : Promise.resolve(undefined),
        mirroredLatest ? Promise.resolve(undefined) : getLatestRelease(plugin.githubLink)
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
            latestVersion: mirroredLatest ?? latestFromGithub ?? null,
            testedVersions: spigotListing?.testedVersions ?? null,
            spigotRating: shownRating(spigotListing?.rating),
            spigotDownloads: spigotListing?.downloads ?? null,
            versions,
            downloads,
            firstReleasedAt: record?.firstReleasedAt ?? null,
            lastUpdatedAt: versions[0]?.publishedAt ?? null,
            tags: plugin.tags ?? [],
            related: relatedPlugins(plugin, pluginData.plugins).map((other) => ({
                slug: other.id,
                title: other.title,
                description: other.description,
                icon: orNull(other.icon)
            }))
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
    latestVersion,
    testedVersions,
    spigotRating,
    spigotDownloads,
    versions,
    downloads,
    firstReleasedAt,
    lastUpdatedAt,
    tags,
    related
}) => {
    const firstReleased = firstReleasedAt ? absoluteDateFrom(firstReleasedAt) : '';
    const lastUpdated = lastUpdatedAt ? absoluteDateFrom(lastUpdatedAt) : '';
    const testedLabel = testedVersions && testedVersions.length > 0 ? formatTestedVersions(testedVersions) : null;
    const releases = releasesUrl(githubLink);
    // GitHub's figure, kept as a second number beside the site's own: only what
    // the mirror has seen, which is the newest releases rather than every
    // release ever cut, so the chip says where it is from without claiming to
    // be a lifetime total.
    const githubDownloadCount = totalDownloads(versions);
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

                {serverCount || latestVersion || githubDownloadCount || testedLabel || spigotRating || spigotDownloads ? (
                    <Stack direction="row" spacing={1} sx={{flexWrap: 'wrap', rowGap: 1, mb: firstReleased || lastUpdated ? 1 : downloads ? 2 : 3}}>
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
                        {githubDownloadCount ? (
                            <Chip
                                size="small"
                                variant="outlined"
                                icon={<CloudDownloadIcon/>}
                                label={`${githubDownloadCount.toLocaleString()} downloads on GitHub`}
                                title="GitHub's count of downloads of the mirrored releases, from anywhere"
                            />
                        ) : null}
                        {testedLabel ? (
                            <Chip
                                size="small"
                                variant="outlined"
                                icon={<VerifiedIcon/>}
                                label={`Tested on Minecraft ${testedLabel}`}
                                title="Minecraft versions the plugin has been tested on, as listed on its SpigotMC page"
                                data-testid="tested-versions"
                            />
                        ) : null}
                        {spigotRating && spigotmcLink ? (
                            <Chip
                                size="small"
                                variant="outlined"
                                clickable
                                component="a"
                                href={spigotReviewsUrl(spigotmcLink)}
                                target="_blank"
                                rel="noopener noreferrer"
                                icon={<StarIcon/>}
                                label={`${spigotRating.average.toFixed(1)} · ${spigotRating.count.toLocaleString()} ${spigotRating.count === 1 ? 'review' : 'reviews'} on SpigotMC`}
                                title="SpigotMC's rating of this plugin; opens its reviews there"
                                data-testid="spigot-rating"
                            />
                        ) : null}
                        {spigotDownloads ? (
                            <Chip
                                size="small"
                                variant="outlined"
                                icon={<CloudDownloadIcon/>}
                                label={`${spigotDownloads.toLocaleString()} downloads on SpigotMC`}
                                title="SpigotMC's count of downloads from its listing"
                                data-testid="spigot-downloads"
                            />
                        ) : null}
                    </Stack>
                ) : null}

                {firstReleased || lastUpdated ? (
                    <Typography variant="body2" color="text.secondary" sx={{mb: downloads ? 2 : 3}} data-testid="release-dates">
                        {firstReleased ? `First released ${firstReleased}` : ''}
                        {firstReleased && lastUpdated ? ' · ' : ''}
                        {lastUpdated ? `Last updated ${lastUpdated}` : ''}
                    </Typography>
                ) : null}

                {downloads ? (
                    // The site's own downloads, the way a SpigotMC resource page
                    // shows them: a total, and the latest release's. Zeros are
                    // shown — a new counter reads 0, not nothing — and the pair
                    // is one landmark so a screen reader gets both figures together.
                    <Paper
                        variant="outlined"
                        component="section"
                        aria-label="Downloads"
                        data-testid="downloads"
                        sx={{px: 2, py: 1.5, mb: 3, display: 'inline-flex', flexWrap: 'wrap', gap: 3, rowGap: 1}}
                    >
                        <Stack direction="row" spacing={1} alignItems="center">
                            <DownloadIcon fontSize="small" color="action"/>
                            <Typography variant="body2" color="text.secondary">Downloads</Typography>
                        </Stack>
                        <Typography variant="body2" data-testid="downloads-total">
                            <Box component="span" sx={{fontWeight: 700}}>{downloads.total.toLocaleString()}</Box>
                            {' '}total
                        </Typography>
                        <Typography variant="body2" data-testid="downloads-latest">
                            <Box component="span" sx={{fontWeight: 700}}>{downloads.latest.toLocaleString()}</Box>
                            {downloads.latestTag ? ` latest (${downloads.latestTag})` : ' latest'}
                        </Typography>
                    </Paper>
                ) : null}

                <Typography variant="body1" color="text.secondary" sx={{mb: tags.length > 0 ? 1.5 : 3, lineHeight: 1.7}}>
                    {description}
                </Typography>

                {tags.length > 0 ? (
                    <Stack direction="row" spacing={0.5} sx={{flexWrap: 'wrap', rowGap: 0.5, mb: 3}} aria-label="Tags">
                        {tags.map((tag) => (
                            <Chip
                                key={tag}
                                label={tag}
                                size="small"
                                variant="outlined"
                                sx={{height: 22, fontSize: '0.7rem'}}
                                data-testid="plugin-tag"
                            />
                        ))}
                    </Stack>
                ) : null}

                <Stack direction="row" spacing={1} sx={{flexWrap: 'wrap', rowGap: 1, mb: 4}}>
                    {releases ? (
                        <Button
                            variant="contained"
                            startIcon={<DownloadIcon/>}
                            endIcon={<OpenInNewIcon/>}
                            component={Link}
                            href={releases}
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

                <PluginVersionList versions={versions} releasesUrl={releases}/>

                {related.length > 0 ? (
                    <Box component="section" aria-labelledby="related-heading" sx={{mb: 4}} data-testid="related-plugins">
                        <Typography id="related-heading" variant="h6" component="h2" gutterBottom>
                            Related plugins
                        </Typography>
                        <Stack spacing={1}>
                            {related.map((other) => (
                                <Paper
                                    key={other.slug}
                                    variant="outlined"
                                    component={NextLinkComposed}
                                    to={resourcePath(other.slug)}
                                    sx={{p: 1.5, display: 'flex', alignItems: 'center', gap: 1.5, textDecoration: 'none', color: 'inherit'}}
                                >
                                    <Avatar
                                        variant="rounded"
                                        {...(other.icon ? {src: other.icon, alt: ''} : {'aria-hidden': true})}
                                        sx={{bgcolor: colorForTitle(other.title), width: 32, height: 32, fontSize: '0.9rem'}}
                                    >
                                        {other.title.charAt(0).toUpperCase()}
                                    </Avatar>
                                    <Box sx={{minWidth: 0}}>
                                        <Typography variant="subtitle2" component="span" sx={{display: 'block'}}>
                                            {other.title}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" sx={{display: 'block'}}>
                                            {other.description}
                                        </Typography>
                                    </Box>
                                </Paper>
                            ))}
                        </Stack>
                    </Box>
                ) : null}

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
