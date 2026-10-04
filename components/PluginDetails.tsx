import React from 'react';
import {Box, Button, Chip, Link, Typography} from '@mui/material';
import GitHubIcon from '@mui/icons-material/GitHub';
import DownloadIcon from '@mui/icons-material/Download';
import DnsIcon from '@mui/icons-material/Dns';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import NewReleasesIcon from '@mui/icons-material/NewReleases';
import VerifiedIcon from '@mui/icons-material/Verified';
import StarIcon from '@mui/icons-material/Star';
import LikeButton from './LikeButton';
import PluginTrailer from './PluginTrailer';
import {NextLinkComposed} from './NextLinkComposed';
import {pluginDetailsActionsStyle} from '../styles/styles';
import {resourcePath} from '../utils/resources';
import {downloadsLabel} from '../services/pluginVersionService';
import {formatTestedVersions} from '../utils/spigot';
import type {PluginTrailer as Trailer} from '../utils/pluginTrailers';

// Everything the catalogue says about one plugin — what it is, its figures, and
// where to go next. The home page grid shows only icons; this is the panel that
// opens when one of them is hovered or focused (components/PluginIconGrid.tsx).
export interface PluginDetailsProps {
    id: string;
    title: string;
    description: string;
    githubLink: string;
    spigotmcLink?: string | null;
    bStatsId?: string | null;
    icon?: string | null;
    serverCount?: number | null;
    latestVersion?: string | null;
    // Where Download sends the visitor — dpc-api's counting link for the
    // latest release's plugin jar, from the same mirror row as latestVersion;
    // absent when the plugin has no release or it attaches no jar.
    latestDownloadUrl?: string | null;
    // Downloads made through this site, every release summed — the figure a
    // SpigotMC listing shows per resource. Absent or zero hides the chip.
    downloadCount?: number | null;
    // Minecraft versions the author lists as tested on the plugin's SpigotMC
    // page, mirrored through Spiget (utils/spigot.ts). Absent or empty hides
    // the chip; a plugin with no SpigotMC page never has one.
    testedVersions?: string[] | null;
    // SpigotMC's star rating, already past the review threshold (see
    // shownRating in utils/spigot.ts); null hides the chip. A bridge until
    // the site has reviews of its own, and labelled as SpigotMC's.
    spigotRating?: { average: number; count: number } | null;
    // What the plugin is for, from the catalogue. Clicking one filters the
    // catalogue by it when the page offers that (the home page does).
    tags?: string[] | null;
    onTagClick?: (tag: string) => void;
    likeCount: number;
    liked: boolean;
    token: string | null;
    // Id for the description paragraph, so the grid tile can point
    // aria-describedby at it.
    descriptionId?: string;
    // Id for the title heading, so the mobile sheet can take its accessible
    // name from it.
    titleId?: string;
    // The plugin's preview clip, shown under the title. Passed only for the
    // desktop panel (hover or keyboard focus); the touch sheet gets none, so it
    // stays as it was and its buttons stay in view, and the clip plays on the
    // plugin's page instead, one tap away (Details).
    trailer?: Trailer | null;
}

const PluginDetails: React.FC<PluginDetailsProps> = ({
    id,
    title,
    description,
    githubLink,
    spigotmcLink,
    serverCount,
    latestVersion,
    latestDownloadUrl,
    downloadCount,
    testedVersions,
    spigotRating,
    tags,
    onTagClick,
    likeCount,
    liked,
    token,
    descriptionId,
    titleId,
    trailer,
}) => {
    const testedLabel = testedVersions && testedVersions.length > 0 ? formatTestedVersions(testedVersions) : null;
    return (
        <Box>
            <Typography id={titleId} variant="h6" component="h3" sx={{fontWeight: 600, lineHeight: 1.2, mb: 1}}>
                {/* The plugin's name is the obvious thing to click for more about it. */}
                <Link
                    component={NextLinkComposed}
                    to={resourcePath(id)}
                    underline="hover"
                    color="inherit"
                >
                    {title}
                </Link>
            </Typography>
            {trailer ? (
                // Loads nothing until the panel is open on screen (the grid
                // keeps closed panels mounted), and stops when it closes.
                <PluginTrailer trailer={trailer} load="visible" sx={{mb: 1.5}}/>
            ) : null}
            <Typography id={descriptionId} variant="body2" color="text.secondary">
                {description}
            </Typography>
            {tags && tags.length > 0 ? (
                <Box sx={{display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1.5}} aria-label="Tags">
                    {tags.map((tag) => (
                        <Chip
                            key={tag}
                            label={tag}
                            size="small"
                            variant="outlined"
                            sx={{height: 22, fontSize: '0.7rem'}}
                            {...(onTagClick ? {clickable: true, onClick: () => onTagClick(tag)} : {})}
                            data-testid="plugin-tag"
                        />
                    ))}
                </Box>
            ) : null}

            {(serverCount && serverCount > 0) || latestVersion || (downloadCount && downloadCount > 0) || testedLabel || spigotRating ? (
                <Box sx={{display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1.5}}>
                    {serverCount && serverCount > 0 ? (
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
                    {downloadCount && downloadCount > 0 ? (
                        <Chip
                            size="small"
                            variant="outlined"
                            icon={<DownloadIcon/>}
                            label={downloadsLabel(downloadCount)}
                            title="Downloads through dansplugins.com"
                            data-testid="download-count"
                        />
                    ) : null}
                    {testedLabel ? (
                        <Chip
                            size="small"
                            variant="outlined"
                            icon={<VerifiedIcon/>}
                            label={`MC ${testedLabel}`}
                            title="Minecraft versions the plugin has been tested on, as listed on SpigotMC"
                            data-testid="tested-versions"
                        />
                    ) : null}
                    {spigotRating ? (
                        <Chip
                            size="small"
                            variant="outlined"
                            icon={<StarIcon/>}
                            label={spigotRating.average.toFixed(1)}
                            title={`Rated ${spigotRating.average.toFixed(1)} out of 5 over ${spigotRating.count.toLocaleString()} reviews on SpigotMC`}
                            aria-label={`Rated ${spigotRating.average.toFixed(1)} out of 5 over ${spigotRating.count.toLocaleString()} reviews on SpigotMC`}
                            data-testid="spigot-rating"
                        />
                    ) : null}
                </Box>
            ) : null}

            <Box sx={pluginDetailsActionsStyle}>
                <LikeButton targetType="plugin" targetId={id} count={likeCount} liked={liked} token={token}/>
                <Box sx={{flexGrow: 1}}/>
                <Button
                    variant="contained"
                    size="small"
                    component={NextLinkComposed}
                    to={resourcePath(id)}
                >
                    Details
                </Button>
                {latestDownloadUrl ? (
                    // The jar itself, as DPM would fetch it — not the release
                    // page. Same-tab on purpose: a cross-origin file link
                    // downloads in place, and target="_blank" would leave an
                    // empty tab behind it in some browsers. nofollow because
                    // following it is what counts a download.
                    <Button
                        variant="outlined"
                        size="small"
                        startIcon={<DownloadIcon/>}
                        component={Link}
                        href={latestDownloadUrl}
                        rel="nofollow"
                        aria-label={`Download ${title}${latestVersion ? ` ${latestVersion}` : ''}`}
                    >
                        Download
                    </Button>
                ) : null}
                <Button
                    size="small"
                    startIcon={<MenuBookIcon/>}
                    component={NextLinkComposed}
                    to={`/guides/${id}`}
                >
                    Guide
                </Button>
                <Button
                    size="small"
                    startIcon={<GitHubIcon/>}
                    component={Link}
                    href={githubLink}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    GitHub
                </Button>
                {spigotmcLink ? (
                    <Button
                        variant="outlined"
                        size="small"
                        component={Link}
                        href={spigotmcLink}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        SpigotMC
                    </Button>
                ) : null}
            </Box>
        </Box>
    );
};

export default PluginDetails;
