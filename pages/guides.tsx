import {Box, Container, List, ListItem, ListItemButton, ListItemText, Typography} from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import type {NextPage} from 'next';
import TopBar from '../components/TopBar';
import React from 'react';
import BottomBar from '../components/BottomBar';
import {userGuideUrl} from '../utils/guides';

// Import styles
import {pageStyle, sectionHeaderStyle, containerPaddingStyle} from '../styles/styles';

// Pull version from package.json
const version = require('../package.json').version;

// The guide list is driven by the same plugin catalogue rendered on the home
// page, so adding a plugin there automatically lists its guide here.
interface GuidePlugin {
    id: string;
    title: string;
    githubLink: string;
}

const pluginData = require('./data/plugins.json') as { plugins: GuidePlugin[] };

const guides = [...pluginData.plugins].sort((a, b) => a.title.localeCompare(b.title));

const Guides: NextPage = () => (
    <Box sx={(theme) => pageStyle(theme)}>
        <TopBar/>
        <Container maxWidth="xl" sx={(theme) => containerPaddingStyle(theme)}>
            <Typography variant="h3" gutterBottom sx={(theme) => sectionHeaderStyle(theme)}>
                Guides
            </Typography>
            <Typography variant="body1" gutterBottom>
                Each plugin&apos;s guide (its <code>USER_GUIDE.md</code>) lives in the plugin&apos;s
                repository. Select a plugin below to open its guide in a new tab.
            </Typography>
            <List sx={{maxWidth: 600}}>
                {guides.map((plugin) => (
                    <ListItem key={plugin.id} disablePadding>
                        <ListItemButton
                            component="a"
                            href={userGuideUrl(plugin.githubLink)}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <ListItemText primary={`${plugin.title} Guide`}/>
                            <OpenInNewIcon fontSize="small"/>
                        </ListItemButton>
                    </ListItem>
                ))}
            </List>
        </Container>
        <BottomBar version={version}/>
    </Box>
);

export default Guides;
