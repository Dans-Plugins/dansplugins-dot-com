import {Box, Container, List, ListItem, ListItemButton, ListItemText, Paper, Typography} from '@mui/material';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import type {GetServerSideProps, NextPage} from 'next';
import TopBar from '../components/TopBar';
import Seo from '../components/Seo';
import React from 'react';
import BottomBar from '../components/BottomBar';
import {NextLinkComposed} from '../components/NextLinkComposed';
import {getCatalogue} from '../services/pluginCatalogueService';

// Import styles
import {pageStyle, sectionHeaderStyle, containerPaddingStyle} from '../styles/styles';

// Pull version from package.json
const version = require('../package.json').version;

// The guide list is driven by the same plugin catalogue rendered on the home
// page, so adding a plugin there automatically lists its guide here.
interface GuidesProps {
    // Title-sorted, as the catalogue API serves it. Empty when the catalogue
    // could not be read, which the page says rather than showing nothing.
    guides: {id: string; title: string}[];
}

export const getServerSideProps: GetServerSideProps<GuidesProps> = async () => ({
    props: {
        guides: (await getCatalogue())
            .map(({id, title}) => ({id, title}))
            .sort((a, b) => a.title.localeCompare(b.title))
    }
});

const Guides: NextPage<GuidesProps> = ({guides}) => (
    <Box sx={(theme) => pageStyle(theme)}>
        <Seo title="Guides" description="User guides for every Dan's Plugins Community plugin."/>
        <TopBar/>
        <Container component="main" id="main" maxWidth="md" sx={(theme) => containerPaddingStyle(theme)}>
            <Typography variant="h3" component="h1" gutterBottom sx={(theme) => sectionHeaderStyle(theme)}>
                Guides
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{mb: 3}}>
                Each plugin&apos;s guide (its <code>USER_GUIDE.md</code>) lives in the plugin&apos;s
                repository. Select a plugin below to read its guide.
            </Typography>
            {guides.length === 0 ? (
                <Typography color="text.secondary">
                    The plugin catalogue could not be loaded right now. Please try again shortly.
                </Typography>
            ) : null}
            <Paper elevation={0} sx={{maxWidth: 600, overflow: 'hidden'}}>
                <List disablePadding>
                    {guides.map((plugin, index) => (
                        <ListItem key={plugin.id} disablePadding divider={index < guides.length - 1}>
                            <ListItemButton
                                component={NextLinkComposed}
                                to={`/guides/${plugin.id}`}
                            >
                                <ListItemText primary={`${plugin.title} Guide`}/>
                                <ChevronRightIcon fontSize="small" color="action"/>
                            </ListItemButton>
                        </ListItem>
                    ))}
                </List>
            </Paper>
        </Container>
        <BottomBar version={version}/>
    </Box>
);

export default Guides;
