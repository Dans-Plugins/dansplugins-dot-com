import React from 'react';
import {Avatar, Box, Button, Card, CardActions, CardContent, Chip, Link, Stack, Typography} from '@mui/material';
import GitHubIcon from '@mui/icons-material/GitHub';
import DnsIcon from '@mui/icons-material/Dns';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import LikeButton from './LikeButton';
import {
    pluginCardStyle,
    pluginCardContentStyle,
    pluginCardActionsStyle,
} from '../styles/styles';

interface PluginCardProps {
    id: string;
    title: string;
    description: string;
    githubLink: string;
    spigotmcLink?: string;
    bStatsId?: string;
    icon?: string;
    serverCount?: number | null;
    likeCount: number;
    liked: boolean;
    token: string | null;
}

// A small, fixed palette of muted brand-ish colours. Each plugin gets a stable
// colour derived from its title so cards have a bit of visual identity without
// being random on every render.
const AVATAR_COLORS = ['#4263eb', '#7048e8', '#1098ad', '#f59f00', '#e8590c', '#0ca678'];

const colorForTitle = (title: string): string => {
    let hash = 0;
    for (let i = 0; i < title.length; i++) {
        hash = (hash * 31 + title.charCodeAt(i)) >>> 0;
    }
    return AVATAR_COLORS[hash % AVATAR_COLORS.length];
};

const PluginCard: React.FC<PluginCardProps> = ({
    id,
    title,
    description,
    githubLink,
    spigotmcLink,
    icon,
    serverCount,
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
                        {title}
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

            {serverCount && serverCount > 0 ? (
                <Box sx={{px: 2, pb: 1}}>
                    <Chip
                        size="small"
                        variant="outlined"
                        icon={<DnsIcon/>}
                        label={`${serverCount.toLocaleString()} servers`}
                    />
                </Box>
            ) : null}

            <CardActions sx={pluginCardActionsStyle}>
                <LikeButton targetType="plugin" targetId={id} count={likeCount} liked={liked} token={token}/>
                <Box sx={{flexGrow: 1}}/>
                <Button
                    size="small"
                    startIcon={<MenuBookIcon/>}
                    component={Link}
                    href={`/guides/${id}`}
                >
                    Guide
                </Button>
                <Button
                    variant="contained"
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
