import React from 'react';
import {Box, Button, Typography, Paper, Grid, Stack} from '@mui/material';
import GitHubIcon from '@mui/icons-material/GitHub';
import DownloadIcon from '@mui/icons-material/Download';
import GamesIcon from '@mui/icons-material/Games';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

import {
    blurbBoxStyle,
    blurbTitleStyle,
    blurbGridContainerStyle,
    infoCardStyle,
    infoCardIconStyle,
    infoCardTitleStyle,
    infoCardIconSizeStyle
} from '../styles/styles';

const InfoCard: React.FC<{
    icon: React.ReactNode;
    title: string;
    content: string;
    href?: string
}> = ({icon, title, content, href}) => (
    <Grid item xs={12} md={4}>
        <Paper
            elevation={0}
            // When the card links somewhere, expose it as a focusable, keyboard-
            // operable control: a mouse-only onClick left keyboard and screen-
            // reader users unable to reach or activate these cards.
            role={href ? 'link' : undefined}
            tabIndex={href ? 0 : undefined}
            sx={(theme) => ({
                ...infoCardStyle(theme),
                cursor: href ? 'pointer' : 'default',
                '&:hover': href ? {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 6px 20px rgba(0,0,0,0.12)',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                } : {}
            })}
            onClick={() => href && window.open(href, '_blank', 'noopener,noreferrer')}
            onKeyDown={(e) => {
                if (href && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    window.open(href, '_blank', 'noopener,noreferrer');
                }
            }}
        >
            <Box sx={(theme) => infoCardIconStyle(theme)}>
                {icon}
            </Box>
            <Typography variant="h6" gutterBottom sx={(theme) => infoCardTitleStyle()}>
                {title}
            </Typography>
            <Typography variant="body1" color="text.secondary">{content}</Typography>
        </Paper>
    </Grid>
);

const Blurb: React.FC = () => (
    <Box sx={(theme) => blurbBoxStyle(theme)}>
        <Box sx={{textAlign: 'center', py: {xs: 4, md: 8}}}>
            <Typography
                variant="h2"
                gutterBottom
                sx={(theme) => ({...blurbTitleStyle(theme), marginBottom: theme.spacing(2)})}
            >
                Dan&apos;s Plugins Community
            </Typography>
            <Typography
                variant="h6"
                color="text.secondary"
                sx={{maxWidth: 640, mx: 'auto', fontWeight: 400}}
            >
                Free, open-source plugins for Minecraft servers — built in the open,
                and easy to run, extend, and contribute to.
            </Typography>
            <Stack
                direction={{xs: 'column', sm: 'row'}}
                spacing={2}
                justifyContent="center"
                sx={{mt: 4}}
            >
                <Button variant="contained" size="large" href="#plugins">
                    Browse Plugins
                </Button>
                <Button
                    variant="outlined"
                    size="large"
                    href="https://github.com/Dans-Plugins"
                    target="_blank"
                    rel="noopener noreferrer"
                    endIcon={<OpenInNewIcon fontSize="small"/>}
                >
                    View on GitHub
                </Button>
            </Stack>
        </Box>

        <Typography
            variant="overline"
            color="text.secondary"
            sx={{display: 'block', textAlign: 'center', letterSpacing: '0.1em'}}
        >
            Get involved
        </Typography>

        <Grid container spacing={4} sx={(theme) => blurbGridContainerStyle(theme)}>
            <InfoCard
                icon={<GitHubIcon sx={infoCardIconSizeStyle}/>}
                title="Contribute"
                content="Join our open-source community on GitHub. Check out the CONTRIBUTING.md in each project to get started."
                href="https://github.com/Dans-Plugins"
            />
            <InfoCard
                icon={<DownloadIcon sx={infoCardIconSizeStyle}/>}
                title="Download"
                content="Get our plugins from SpigotMC. Each plugin page contains detailed installation instructions and documentation."
                href="https://www.spigotmc.org/resources/authors/danthetechman.659208/"
            />
            <InfoCard
                icon={<GamesIcon sx={infoCardIconSizeStyle}/>}
                title="Try it Out"
                content="Clone our playtest server repository and spin it up locally to experience our plugins in action!"
                href="https://github.com/Dans-Plugins/dpc-mc-server"
            />
        </Grid>
    </Box>
);

export default Blurb;