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

interface PluginWithServerCount extends Plugin {
    serverCount?: number;
}

async function getServerCount(bStatsId: string): Promise<number | undefined> {
    try {
        const response = await fetch(
            'https://bstats.org/api/v1/plugins/' + bStatsId + '/charts/servers/data?maxElements=1'
        );
        const data = await response.json();
        if (!Array.isArray(data) || data.length < 1) {
            return undefined;
        }
        const firstElement = data[0];
        if (!Array.isArray(firstElement) || firstElement.length < 2) {
            return undefined;
        }
        const serverCount = firstElement[1];
        if (typeof serverCount !== 'number') {
            return undefined;
        }
        return serverCount;
    } catch (error) {
        console.error('Error fetching server count for bStatsId ' + bStatsId, error);
        return undefined;
    }
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

const PluginsSection: React.FC = () => {
    const [sortBy, setSortBy] = React.useState<SortOption>('popularity');
    const [pluginsWithCounts, setPluginsWithCounts] = React.useState<PluginWithServerCount[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);

    React.useEffect(() => {
        const fetchServerCounts = async () => {
            setIsLoading(true);
            const pluginsWithServerCounts = await Promise.all(
                pluginData.plugins.map(async (plugin) => {
                    if (plugin.bStatsId) {
                        const serverCount = await getServerCount(plugin.bStatsId);
                        return { ...plugin, serverCount };
                    }
                    return { ...plugin, serverCount: undefined };
                })
            );
            setPluginsWithCounts(pluginsWithServerCounts);
            setIsLoading(false);
        };

        fetchServerCounts();
    }, []);

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
            return [...pluginsWithCounts].sort((a, b) => {
                const countA = a.serverCount ?? -1;
                const countB = b.serverCount ?? -1;
                
                // If both have counts, sort by count descending
                if (countA >= 0 && countB >= 0) {
                    return countB - countA;
                }
                // If only one has a count, prioritize it
                if (countA >= 0) return -1;
                if (countB >= 0) return 1;
                // If neither has a count, sort alphabetically
                return a.title.localeCompare(b.title);
            });
        } else {
            // Sort all plugins alphabetically
            return [...pluginsWithCounts].sort((a, b) => a.title.localeCompare(b.title));
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
            
            {isLoading ? (
                <Typography variant="body1" sx={{ textAlign: 'center', marginY: 4 }}>
                    Loading plugin data...
                </Typography>
            ) : (
                <PluginSection plugins={getSortedPlugins()} />
            )}
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