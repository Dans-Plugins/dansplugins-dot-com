import {Box, Container, Grid, Typography, ToggleButton, ToggleButtonGroup} from '@mui/material'
import type {NextPage} from 'next'
import TopBar from '../components/TopBar'
import Blurb from '../components/Blurb'
import PluginCard from '../components/PluginCard'
import React from 'react';
import BottomBar from '../components/BottomBar'
import { getVisits, incrementVisits } from '../services/visitService';

interface PluginData {
    mostPopular: string[];
    plugins: Plugin[];
}

// Add type assertion for your imported data
const pluginData = require('./data/plugins.json') as PluginData;

// Import styles
import {
    sectionHeaderStyle,
    gridContainerStyle,
    sectionDividerStyle,
    pageStyle,
    pluginsBoxStyle,
    gridItemStyle
} from '../styles/styles';

const SectionDivider: React.FC = () => (
    <Box sx={(theme) => sectionDividerStyle(theme)}/>
);

// pull version from package.json
const version = require('../package.json').version

interface Plugin {
    id: string;
    title: string;
    description: string;
    githubLink: string;
    spigotmcLink?: string;
    bStatsId?: string;
}

const PluginSection: React.FC<{ plugins: Plugin[] }> = ({ plugins }) => (
    <Grid container {...gridContainerStyle}>
        {plugins.map((plugin) => (
            <Grid item {...gridItemStyle} key={plugin.id}>
                <PluginCard
                    title={plugin.title}
                    description={plugin.description}
                    githubLink={plugin.githubLink}
                    spigotmcLink={plugin.spigotmcLink}
                    bStatsId={plugin.bStatsId}
                />
            </Grid>
        ))}
    </Grid>
)

type SortOption = 'popularity' | 'alphabetical';

const PluginsSection: React.FC = () => {
    const [sortBy, setSortBy] = React.useState<SortOption>('popularity');

    const handleSortChange = (
        event: React.MouseEvent<HTMLElement>,
        newSortBy: SortOption | null,
    ) => {
        if (newSortBy !== null) {
            setSortBy(newSortBy);
        }
    };

    const getSortedPlugins = (): Plugin[] => {
        if (sortBy === 'popularity') {
            // First show most popular plugins in order, then remaining plugins alphabetically
            const popularPlugins = pluginData.mostPopular
                .map((id: string) => pluginData.plugins.find(p => p.id === id))
                .filter((plugin): plugin is NonNullable<typeof plugin> => plugin !== undefined);
            
            const remainingPlugins = pluginData.plugins
                .filter(plugin => !pluginData.mostPopular.includes(plugin.id))
                .sort((a, b) => a.title.localeCompare(b.title));
            
            return [...popularPlugins, ...remainingPlugins];
        } else {
            // Sort all plugins alphabetically
            return [...pluginData.plugins].sort((a, b) => a.title.localeCompare(b.title));
        }
    };

    return (
        <Box sx={pluginsBoxStyle}>
            <Typography variant="h3" component="div" gutterBottom sx={sectionHeaderStyle}>
                Plugins
            </Typography>
            
            <Box sx={{ display: 'flex', justifyContent: 'center', marginBottom: 3 }}>
                <ToggleButtonGroup
                    value={sortBy}
                    exclusive
                    onChange={handleSortChange}
                    aria-label="sorting option"
                    size="small"
                >
                    <ToggleButton value="popularity" aria-label="sort by popularity">
                        By Popularity
                    </ToggleButton>
                    <ToggleButton value="alphabetical" aria-label="sort alphabetically">
                        Alphabetical
                    </ToggleButton>
                </ToggleButtonGroup>
            </Box>
            
            <PluginSection plugins={getSortedPlugins()} />
        </Box>
    );
};

interface HomeProps {
    visits: number;
    startDate: string;
}

export const getServerSideProps = async () => {
    await incrementVisits();
    const data = await getVisits();

    return {
        props: {
            visits: data.visits,
            startDate: data.startDate
        }
    };
};

const Home: NextPage<HomeProps> = ({ visits, startDate }) => {
    return (
        <Box sx={pageStyle}>
            <TopBar/>
            <Container maxWidth="xl" sx={{py: 4}}>
                <Blurb/>
                <SectionDivider/>
                <PluginsSection/>
            </Container>
            <BottomBar
                version={version}
                visits={visits}
                startDate={startDate}
            />
        </Box>
    );
};

export default Home