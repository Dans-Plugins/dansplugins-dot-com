import {Box, Button, Chip, Container, FormControl, Grid, IconButton, InputAdornment, InputLabel, MenuItem, Select, Stack, TextField, Typography, ToggleButton, ToggleButtonGroup} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import ClearIcon from '@mui/icons-material/Clear'
import type {NextPage} from 'next'
import {useRouter} from 'next/router'
import TopBar from '../components/TopBar'
import Seo from '../components/Seo'
import Blurb from '../components/Blurb'
import PluginCard from '../components/PluginCard'
import ExperienceSplash from '../components/ExperienceSplash'
import React from 'react';
import BottomBar from '../components/BottomBar'
import { getVisits, incrementVisits } from '../services/visitService';
import { getServerCountsWithRateLimit } from '../utils/bstats';
import { getSpigotListingsWithRateLimit, shownRating, spigotResourceId } from '../utils/spigot';
import { getLatestVersionsBySlug } from '../services/pluginVersionService';
import { getCatalogue, type CataloguePlugin } from '../services/pluginCatalogueService';
import { getLikeCounts, getMyLikes } from '../services/likeService';
import { getSessionToken } from '../utils/session';
import { sortPlugins, type SortOption } from '../utils/sortPlugins';
import { allTags, allTestedVersions, filterPlugins, isFilterActive } from '../utils/catalogueFilter';
import { EXPERIENCE_CHOSEN_KEY, hasChosenExperience } from '../utils/experience';


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

interface PluginWithServerCount extends CataloguePlugin {
    serverCount?: number | null;
    testedVersions?: string[] | null;
    spigotRating?: { average: number; count: number } | null;
    latestVersion?: string | null;
    latestDownloadUrl?: string | null;
    downloadCount?: number | null;
}

interface PluginSectionProps {
    plugins: PluginWithServerCount[];
    likeCounts: Record<string, number>;
    likedSet: Set<string>;
    token: string | null;
    onTagClick: (tag: string) => void;
}

const PluginSection: React.FC<PluginSectionProps> = ({ plugins, likeCounts, likedSet, token, onTagClick }) => (
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
                    icon={plugin.icon}
                    serverCount={plugin.serverCount}
                    testedVersions={plugin.testedVersions}
                    spigotRating={plugin.spigotRating}
                    tags={plugin.tags}
                    onTagClick={onTagClick}
                    latestVersion={plugin.latestVersion}
                    latestDownloadUrl={plugin.latestDownloadUrl}
                    downloadCount={plugin.downloadCount}
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
    const [tag, setTag] = React.useState<string | null>(null);
    const [version, setVersion] = React.useState<string | null>(null);
    const [likeCounts, setLikeCounts] = React.useState<Record<string, number>>({});
    const [likedSet, setLikedSet] = React.useState<Set<string>>(new Set());
    const [token, setToken] = React.useState<string | null>(null);

    React.useEffect(() => {
        getLikeCounts('plugin').then(setLikeCounts);
        getSessionToken().then((saved) => {
            setToken(saved);
            if (saved) {
                getMyLikes(saved).then((likes) =>
                    setLikedSet(new Set(likes.filter((l) => l.targetType === 'plugin').map((l) => l.targetId))));
            }
        });
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

    // The facets are computed from the catalogue rather than hard-coded, so
    // the tag row and the version menu offer only choices that match something.
    const tags = allTags(initialPlugins);
    const versions = allTestedVersions(initialPlugins);
    const filter = { query, tag, version };
    const filtering = isFilterActive(filter);
    const visiblePlugins = filterPlugins(sortedPlugins, filter);
    const clearFilters = () => {
        setQuery('');
        setTag(null);
        setVersion(null);
    };

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
                    <ToggleButton value="most-downloaded" aria-label="sort by most downloaded">
                        Most Downloaded
                    </ToggleButton>
                    <ToggleButton value="alphabetical" aria-label="sort alphabetically">
                        Alphabetical
                    </ToggleButton>
                </ToggleButtonGroup>
            </Box>

            <Stack
                direction="row"
                spacing={1}
               
                sx={{ justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', rowGap: 1, marginBottom: 3 }}
                role="group"
                aria-label="Filter plugins"
            >
                <Chip
                    label="All"
                    size="small"
                    clickable
                    color={tag === null ? 'primary' : 'default'}
                    variant={tag === null ? 'filled' : 'outlined'}
                    onClick={() => setTag(null)}
                    aria-pressed={tag === null}
                />
                {tags.map((t) => (
                    <Chip
                        key={t}
                        label={t}
                        size="small"
                        clickable
                        color={tag === t ? 'primary' : 'default'}
                        variant={tag === t ? 'filled' : 'outlined'}
                        onClick={() => setTag(tag === t ? null : t)}
                        aria-pressed={tag === t}
                        data-testid={`tag-filter-${t}`}
                    />
                ))}
                {versions.length > 0 ? (
                    <FormControl size="small" sx={{ minWidth: 200, ml: { sm: 1 } }}>
                        <InputLabel id="version-filter-label">Minecraft version</InputLabel>
                        <Select
                            labelId="version-filter-label"
                            label="Minecraft version"
                            value={version ?? ''}
                            onChange={(e) => setVersion(e.target.value === '' ? null : String(e.target.value))}
                            inputProps={{ 'aria-label': 'Filter by tested Minecraft version' }}
                        >
                            <MenuItem value="">Any version</MenuItem>
                            {versions.map((v) => (
                                <MenuItem key={v} value={v}>{v}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                ) : null}
            </Stack>

            {filtering && (
                <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 2 }}>
                    Showing {visiblePlugins.length} of {initialPlugins.length} plugins
                    {version ? ` tested on Minecraft ${version}` : ''}
                </Typography>
            )}

            {initialPlugins.length === 0 ? (
                <Typography color="text.secondary" align="center" sx={{ py: 4 }} data-testid="catalogue-unavailable">
                    The plugin catalogue could not be loaded right now. Please try again shortly.
                </Typography>
            ) : visiblePlugins.length > 0 ? (
                <PluginSection
                    plugins={visiblePlugins}
                    likeCounts={likeCounts}
                    likedSet={likedSet}
                    token={token}
                    onTagClick={setTag}
                />
            ) : (
                <Box sx={{ py: 4, textAlign: 'center' }}>
                    <Typography color="text.secondary" gutterBottom>
                        No plugins match your filters.
                    </Typography>
                    <Button size="small" onClick={clearFilters}>Clear filters</Button>
                </Box>
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

    // The catalogue itself comes from dpc-api. An empty list here means it
    // could not be read (the service keeps the last good copy through an
    // outage, so this is a process that has never reached the API), and the
    // page says so rather than showing an empty grid.
    const catalogue = await getCatalogue();

    const bStatsIds = catalogue
        .map(plugin => plugin.bStatsId)
        .filter((id): id is string => id !== null);

    const spigotIds = catalogue
        .map(plugin => spigotResourceId(plugin.spigotmcLink))
        .filter((id): id is string => id !== undefined);

    // Three independent lookups, so they run together: server counts from
    // bStats and the SpigotMC listing (tested versions, rating) from Spiget,
    // one call per plugin with a listing there; and every card's release tag
    // from the mirror dpc-api keeps, in a single call. Asking GitHub for those tags
    // instead cost one call per plugin per render — sixteen against an
    // unauthenticated budget of sixty an hour, which four page loads exhaust.
    // Neither figure is load-bearing: both helpers swallow their own errors, and
    // a missing one hides a chip rather than failing the page.
    const [serverCountsMap, spigotListings, latestVersionsMap] = await Promise.all([
        getServerCountsWithRateLimit(bStatsIds, 5),
        getSpigotListingsWithRateLimit(spigotIds, 5),
        getLatestVersionsBySlug()
    ]);

    // Create plugins with server counts and latest release versions
    const pluginsWithCounts: PluginWithServerCount[] = catalogue.map(plugin => ({
        ...plugin,
        serverCount: (plugin.bStatsId ? serverCountsMap.get(plugin.bStatsId) : undefined) ?? null,
        testedVersions: spigotListings.get(spigotResourceId(plugin.spigotmcLink) ?? '')?.testedVersions ?? null,
        // Already past the review threshold, so the card shows what it is given.
        spigotRating: shownRating(spigotListings.get(spigotResourceId(plugin.spigotmcLink) ?? '')?.rating),
        latestVersion: latestVersionsMap.get(plugin.id)?.tag ?? null,
        latestDownloadUrl: latestVersionsMap.get(plugin.id)?.downloadUrl ?? null,
        downloadCount: latestVersionsMap.get(plugin.id)?.downloadCount ?? null
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
    const router = useRouter();
    // Starts closed on both server and first client render (no hydration
    // mismatch — same pattern TopBar uses for its signed-in state), then opens
    // after mount if this visitor hasn't made a choice yet.
    const [showSplash, setShowSplash] = React.useState(false);

    React.useEffect(() => {
        const stored = window.localStorage.getItem(EXPERIENCE_CHOSEN_KEY);
        setShowSplash(!hasChosenExperience(stored));
    }, []);

    const dismissSplash = () => {
        window.localStorage.setItem(EXPERIENCE_CHOSEN_KEY, 'true');
        setShowSplash(false);
    };

    const chooseDeveloper = () => {
        window.localStorage.setItem(EXPERIENCE_CHOSEN_KEY, 'true');
        setShowSplash(false);
        router.push('/dev');
    };

    return (
        <Box sx={pageStyle}>
            <Seo/>
            <TopBar/>
            <ExperienceSplash open={showSplash} onChoosePlayer={dismissSplash} onChooseDeveloper={chooseDeveloper}/>
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