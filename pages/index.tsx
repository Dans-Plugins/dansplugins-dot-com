import {Box, Container, Grid, IconButton, InputAdornment, TextField, Typography, ToggleButton, ToggleButtonGroup} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import ClearIcon from '@mui/icons-material/Clear'
import type {NextPage} from 'next'
import TopBar from '../components/TopBar'
import Seo from '../components/Seo'
import Blurb from '../components/Blurb'
import PluginCard from '../components/PluginCard'
import React from 'react';
import BottomBar from '../components/BottomBar'
import { getVisits, incrementVisits } from '../services/visitService';
import { getServerCountsWithRateLimit } from '../utils/bstats';
import { getLikeCounts, getMyLikes } from '../services/likeService';
import { sortPlugins, type SortOption } from '../utils/sortPlugins';

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

interface PluginSectionProps {
    plugins: PluginWithServerCount[];
    likeCounts: Record<string, number>;
    likedSet: Set<string>;
    token: string | null;
}

const PluginSection: React.FC<PluginSectionProps> = ({ plugins, likeCounts, likedSet, token }) => (
    <Grid container {...gridContainerStyle}>
        {plugins.map((plugin) => (
            <Grid item {...gridItemStyle} key={plugin.id}>
                <PluginCard
                    id={plugin.id}
                    title={plugin.title}
                    description={plugin.description}
                    githubLink={plugin.githubLink}
                    spigotmcLink={plugin.spigotmcLink}
                    bStatsId={plugin.bStatsId}
                    serverCount={plugin.serverCount}
                    likeCount={likeCounts[plugin.id] || 0}
                    liked={likedSet.has(plugin.id)}
                    token={token}
                />
            </Grid>
        ))}
    </Grid>
)

interface PluginsSectionProps {
    initialPlugins: PluginWithServerCount[];
}

const PluginsSection: React.FC<PluginsSectionProps> = ({ initialPlugins }) => {
    const [sortBy, setSortBy] = React.useState<SortOption>('popularity');
    const [query, setQuery] = React.useState('');
    const [likeCounts, setLikeCounts] = React.useState<Record<string, number>>({});
    const [likedSet, setLikedSet] = React.useState<Set<string>>(new Set());
    const [token, setToken] = React.useState<string | null>(null);

    React.useEffect(() => {
        getLikeCounts('plugin').then(setLikeCounts);
        const saved = typeof window !== 'undefined' ? window.localStorage.getItem('dpc-token') : null;
        setToken(saved);
        if (saved) {
            getMyLikes(saved).then((likes) =>
                setLikedSet(new Set(likes.filter((l) => l.targetType === 'plugin').map((l) => l.targetId))));
        }
    }, []);

    const handleSortChange = (
        event: React.MouseEvent<HTMLElement>,
        newSortBy: SortOption | null,
    ) => {
        if (newSortBy !== null) {
            setSortBy(newSortBy);
        }
    };

    const sortedPlugins = sortPlugins(initialPlugins, sortBy, likeCounts);

    const normalizedQuery = query.trim().toLowerCase();
    const visiblePlugins = normalizedQuery
        ? sortedPlugins.filter((plugin) =>
            plugin.title.toLowerCase().includes(normalizedQuery) ||
            plugin.description.toLowerCase().includes(normalizedQuery))
        : sortedPlugins;

    return (
        <Box id="plugins" sx={pluginsBoxStyle}>
            <Typography variant="h3" component="div" gutterBottom sx={sectionHeaderStyle}>
                Plugins
            </Typography>

            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2, flexWrap: 'wrap', marginBottom: 3 }}>
                <TextField
                    size="small"
                    placeholder="Search plugins…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    aria-label="Search plugins"
                    sx={{ minWidth: 240 }}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon fontSize="small" />
                            </InputAdornment>
                        ),
                        endAdornment: query ? (
                            <InputAdornment position="end">
                                <IconButton size="small" aria-label="Clear search" onClick={() => setQuery('')}>
                                    <ClearIcon fontSize="small" />
                                </IconButton>
                            </InputAdornment>
                        ) : undefined,
                    }}
                />
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
                    <ToggleButton value="most-liked" aria-label="sort by most liked">
                        Most Liked
                    </ToggleButton>
                    <ToggleButton value="alphabetical" aria-label="sort alphabetically">
                        Alphabetical
                    </ToggleButton>
                </ToggleButtonGroup>
            </Box>

            {normalizedQuery && (
                <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 2 }}>
                    Showing {visiblePlugins.length} of {initialPlugins.length} plugins
                </Typography>
            )}

            {visiblePlugins.length > 0 ? (
                <PluginSection plugins={visiblePlugins} likeCounts={likeCounts} likedSet={likedSet} token={token} />
            ) : (
                <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
                    No plugins match your search.
                </Typography>
            )}
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
            <Seo/>
            <TopBar/>
            <Container component="main" id="main" maxWidth="xl" sx={{py: 4}}>
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