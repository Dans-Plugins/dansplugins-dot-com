import React from 'react';
import {Avatar, Box, Button, Card, CardActions, CardContent, Chip, Link, Stack, Typography} from '@mui/material';
import GitHubIcon from '@mui/icons-material/GitHub';
import DownloadIcon from '@mui/icons-material/Download';
import DnsIcon from '@mui/icons-material/Dns';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import NewReleasesIcon from '@mui/icons-material/NewReleases';
import LikeButton from './LikeButton';
import {NextLinkComposed} from './NextLinkComposed';
import {
    pluginCardStyle,
    pluginCardContentStyle,
    pluginCardActionsStyle,
} from '../styles/styles';
import {colorForTitle} from '../utils/pluginAvatar';
import {resourcePath} from '../utils/resources';
import {downloadsLabel} from '../services/pluginVersionService';

interface PluginCardProps {
    id: string;
    title: string;
    description: string;
    githubLink: string;
    spigotmcLink?: string;
    bStatsId?: string;
    icon?: string;
    serverCount?: number | null;
    latestVersion?: string | null;
    // Where Download sends the visitor — dpc-api's counting link for the
    // latest release's plugin jar, from the same mirror row as latestVersion;
    // absent when the plugin has no release or it attaches no jar.
    latestDownloadUrl?: string | null;
    // Downloads made through this site, every release summed — the figure a
    // SpigotMC listing shows per resource. Absent or zero hides the chip.
    downloadCount?: number | null;
    likeCount: number;
    liked: boolean;
    token: string | null;
}

const PluginCard: React.FC<PluginCardProps> = ({
    id,
    title,
    description,
    githubLink,
    spigotmcLink,
    icon,
    serverCount,
    latestVersion,
    latestDownloadUrl,
    downloadCount,
    likeCount,
    liked,
    token
}) => {
    return (
        <Card sx={pluginCardStyle}>
            <CardContent sx={pluginCardContentStyle}>
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{mb: 1.5}}>
                    <Avatar
                        variant="rounded"
                        {...(icon ? {src: icon, alt: `${title} icon`} : {'aria-hidden': true})}
                        sx={{
                            bgcolor: colorForTitle(title),
                            width: 40,
                            height: 40,
                            fontFamily: '"Space Grotesk", sans-serif',
                            fontWeight: 700,
                        }}
                    >
                        {title.charAt(0).toUpperCase()}
                    </Avatar>
                    <Typography variant="h6" component="div" sx={{fontWeight: 600, lineHeight: 1.2}}>
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
                </Stack>
                <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                        // Clamp to keep every card the same height regardless of
                        // how long the plugin's description is.
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                    }}
                >
                    {description}
                </Typography>
            </CardContent>

            {(serverCount && serverCount > 0) || latestVersion || (downloadCount && downloadCount > 0) ? (
                <Box sx={{px: 2, pb: 1}}>
                    <Stack direction="row" spacing={1} sx={{flexWrap: 'wrap', rowGap: 1}}>
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
                    </Stack>
                </Box>
            ) : null}

            <CardActions sx={pluginCardActionsStyle}>
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
            </CardActions>
        </Card>
    );
};

export default PluginCard;
