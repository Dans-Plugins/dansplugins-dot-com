import {Box, Button, Container, Stack, Typography} from '@mui/material';
import GitHubIcon from '@mui/icons-material/GitHub';
import type {NextPage} from 'next';
import TopBar from '../components/TopBar';
import Seo from '../components/Seo';
import React from 'react';
import BottomBar from '../components/BottomBar';

// Import styles
import {pageStyle, sectionHeaderStyle, containerPaddingStyle} from '../styles/styles';

// Pull version from package.json
const version = require('../package.json').version;

const About: NextPage = () => (
    <Box sx={(theme) => pageStyle(theme)}>
        <Seo title="About Us" description="Learn about Dan's Plugins Community, an open-source community building plugins for Minecraft servers."/>
        <TopBar/>
        <Container maxWidth="md" sx={(theme) => containerPaddingStyle(theme)}>
            <Typography variant="h3" gutterBottom sx={(theme) => sectionHeaderStyle(theme)}>
                About Us
            </Typography>
            <Typography variant="body1" gutterBottom>
                Dan&apos;s Plugins Community (DPC) is an open-source community that builds plugins for
                Minecraft servers. It is best known for Medieval Factions and a catalogue of
                complementary plugins, all developed in the open and free to use.
            </Typography>
            <Typography variant="body1" gutterBottom>
                Our goal is to give server owners and players reliable, well-documented plugins, and to
                grow a welcoming community around them. Every project is open source, so anyone can
                read the code, report issues, or contribute improvements.
            </Typography>
            <Typography variant="body1" gutterBottom>
                Want to get involved? Join the conversation on Discord, support development on Patreon,
                or browse the source on GitHub.
            </Typography>
            <Stack direction="row" spacing={2} sx={{mt: 3, flexWrap: 'wrap', rowGap: 1}}>
                <Button
                    variant="contained"
                    color="primary"
                    startIcon={<GitHubIcon/>}
                    href="https://github.com/Dans-Plugins"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    GitHub
                </Button>
                <Button
                    variant="outlined"
                    color="primary"
                    href="https://discord.gg/xXtuAQ2"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    Discord
                </Button>
                <Button
                    variant="outlined"
                    color="primary"
                    href="https://www.patreon.com/danspluginscommunity"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    Patreon
                </Button>
            </Stack>
        </Container>
        <BottomBar version={version}/>
    </Box>
);

export default About;
