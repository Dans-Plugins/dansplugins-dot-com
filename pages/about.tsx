import {Box, Button, Container, Typography} from '@mui/material';
import type {NextPage} from 'next';
import TopBar from '../components/TopBar';
import React from 'react';
import BottomBar from '../components/BottomBar';

// Import styles
import {pageStyle, sectionHeaderStyle, pluginsBoxStyle, containerPaddingStyle} from '../styles/styles';

// Pull version from package.json
const version = require('../package.json').version;

const About: NextPage = () => (
    <Box sx={(theme) => pageStyle(theme)}>
        <TopBar/>
        <Container maxWidth="xl" sx={(theme) => containerPaddingStyle(theme)}>
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
            <Box sx={pluginsBoxStyle}>
                <Button
                    variant="contained"
                    color="primary"
                    href="https://github.com/Dans-Plugins"
                    sx={{mr: 1, mb: 1}}
                >
                    GitHub
                </Button>
                <Button
                    variant="contained"
                    color="primary"
                    href="https://discord.gg/xXtuAQ2"
                    sx={{mr: 1, mb: 1}}
                >
                    Discord
                </Button>
                <Button
                    variant="contained"
                    color="primary"
                    href="https://www.patreon.com/danspluginscommunity"
                    sx={{mr: 1, mb: 1}}
                >
                    Patreon
                </Button>
            </Box>
        </Container>
        <BottomBar version={version}/>
    </Box>
);

export default About;
