import {Box, Container, Grid, Typography, ToggleButton, ToggleButtonGroup} from '@mui/material'
import type {NextPage} from 'next'
import TopBar from '../components/TopBar'
import Blurb from '../components/Blurb'
import PluginCard from '../components/PluginCard'
import React from 'react';
import BottomBar from '../components/BottomBar'
import { getVisits, incrementVisits } from '../services/visitService';
import { getServerCountsWithRateLimit } from '../utils/bstats';

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

interface PluginWithServerCount extends Plugin {
    serverCount?: number | null;
}

const PluginSection: React.FC<{ plugins: PluginWithServerCount[] }> = ({ plugins }) => (
    <Grid container {...gridContainerStyle}>
        {plugins.map((plugin) => (
            <Grid item {...gridItemStyle} key={plugin.id}>
                <PluginCard
                    title={plugin.title}
                    description={plugin.description}
                    githubLink={plugin.githubLink}
                    spigotmcLink={plugin.spigotmcLink}
                    bStatsId={plugin.bStatsId}
                    serverCount={plugin.serverCount}
                />
            </Grid>
        ))}
    </Grid>
)

type SortOption = 'popularity' | 'alphabetical';

interface PluginsSectionProps {
    initialPlugins: PluginWithServerCount[];
}

const PluginsSection: React.FC<PluginsSectionProps> = ({ initialPlugins }) => {
    const [sortBy, setSortBy] = React.useState<SortOption>('popularity');

    const handleSortChange = (
        event: React.MouseEvent<HTMLElement>,
        newSortBy: SortOption | null,
    ) => {
        if (newSortBy !== null) {
            setSortBy(newSortBy);
        }
    };

    const getSortedPlugins = (): PluginWithServerCount[] => {
        if (sortBy === 'popularity') {
            // Sort by server count (descending), with plugins without counts at the end
            return [...initialPlugins].sort((a, b) => {
                const hasCountA = a.serverCount != null;
                const hasCountB = b.serverCount != null;
                
                // If both have counts, sort by count descending
                if (hasCountA && hasCountB) {
                    return (b.serverCount as number) - (a.serverCount as number);
                }
                // If only one has a count, prioritize it
                if (hasCountA) return -1;
                if (hasCountB) return 1;
                // If neither has a count, sort alphabetically
                return a.title.localeCompare(b.title);
            });
        } else {
            // Sort all plugins alphabetically
            return [...initialPlugins].sort((a, b) => a.title.localeCompare(b.title));
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
    visits: number | null;
    startDate: string | null;
    pluginsWithCounts: PluginWithServerCount[];
}

export const getServerSideProps = async () => {
    // The visit counter is a non-essential cosmetic feature, so a failure of
    // the visits API must never take down the entire home page. Fall back to
    // nulls (hidden by BottomBar) if incrementing or reading visits fails.
    let visits: number | null = null;
    let startDate: string | null = null;
    try {
        await incrementVisits();
        const data = await getVisits();
        visits = data.visits;
        startDate = data.startDate;
    } catch (error) {
        console.error('Failed to load visit data; hiding the visit counter.', error);
    }

    // Fetch server counts for all plugins with rate limiting
    const bStatsIds = pluginData.plugins
        .filter(plugin => plugin.bStatsId)
        .map(plugin => plugin.bStatsId as string);
    
    const serverCountsMap = await getServerCountsWithRateLimit(bStatsIds, 5);
    
    // Create plugins with server counts
    const pluginsWithCounts: PluginWithServerCount[] = pluginData.plugins.map(plugin => ({
        ...plugin,
        serverCount: (plugin.bStatsId ? serverCountsMap.get(plugin.bStatsId) : undefined) ?? null
    }));

    return {
        props: {
            visits,
            startDate,
            pluginsWithCounts
        }
    };
};

const Home: NextPage<HomeProps> = ({ visits, startDate, pluginsWithCounts }) => {
    return (
        <Box sx={pageStyle}>
            <TopBar/>
            <Container maxWidth="xl" sx={{py: 4}}>
                <Blurb/>
                <SectionDivider/>
                <PluginsSection initialPlugins={pluginsWithCounts} />
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