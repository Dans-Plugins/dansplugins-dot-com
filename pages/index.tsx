import {Box, Button, Container, Typography} from '@mui/material'
import {CatalogueFilterBar} from '@kingdom-community/community-site-kit'
import {filterCatalogue, sortCatalogue, type CatalogueQuery} from '@kingdom-community/community-site-kit/catalogue'
import type {NextPage} from 'next'
import {useRouter} from 'next/router'
import TopBar from '../components/TopBar'
import Seo from '../components/Seo'
import Blurb from '../components/Blurb'
import PluginIconGrid from '../components/PluginIconGrid'
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
import { PLUGIN_FACETS, TAG_FACET, VERSION_FACET, pluginSortOptions } from '../utils/catalogueFilter';
import { EXPERIENCE_CHOSEN_KEY, hasChosenExperience } from '../utils/experience';


// Import styles
import {
    sectionDividerStyle,
    pageStyle,
    pluginsBoxStyle,
    visuallyHiddenStyle
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

interface PluginsSectionProps {
    initialPlugins: PluginWithServerCount[];
}

export const PluginsSection: React.FC<PluginsSectionProps> = ({ initialPlugins }) => {
    const [sortKey, setSortKey] = React.useState('popularity');
    const [query, setQuery] = React.useState<CatalogueQuery>({});
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

    const sortOptions = pluginSortOptions(likeCounts);
    const sort = sortOptions.find((option) => option.key === sortKey) ?? sortOptions[0];
    const visiblePlugins = filterCatalogue(sortCatalogue(initialPlugins, sort), PLUGIN_FACETS, query);
    // A tag clicked in a plugin's panel filters the grid; the filter bar
    // unfolds by itself, so what is narrowing the grid is on screen.
    const filterByTag = (tag: string) => setQuery((current) => ({...current, facets: {...current.facets, tag}}));

    if (initialPlugins.length === 0) {
        return (
            <Box id="plugins" component="section" aria-labelledby="plugins-heading" sx={pluginsBoxStyle}>
                <Typography id="plugins-heading" variant="h3" component="h2" sx={visuallyHiddenStyle}>
                    Plugins
                </Typography>
                <Typography color="text.secondary" align="center" sx={{ py: 4 }} data-testid="catalogue-unavailable">
                    The plugin catalogue could not be loaded right now. Please try again shortly.
                </Typography>
            </Box>
        );
    }

    return (
        <PluginIconGrid
            plugins={visiblePlugins}
            likeCounts={likeCounts}
            likedSet={likedSet}
            token={token}
            onTagClick={filterByTag}
            toolbar={
                <CatalogueFilterBar
                    items={initialPlugins}
                    shownCount={visiblePlugins.length}
                    noun="plugins"
                    facets={[
                        { facet: TAG_FACET, display: 'chips', anyLabel: 'All' },
                        { facet: VERSION_FACET, display: 'menu', anyLabel: 'Any version' },
                    ]}
                    query={query}
                    onQueryChange={setQuery}
                    sortOptions={sortOptions}
                    sortKey={sortKey}
                    onSortChange={setSortKey}
                    idPrefix="plugin"
                />
            }
            empty={
                <Box sx={{ py: 4, textAlign: 'center' }}>
                    <Typography color="text.secondary" gutterBottom>
                        No plugins match your filters.
                    </Typography>
                    <Button size="small" onClick={() => setQuery({})}>Clear filters</Button>
                </Box>
            }
        />
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
                {/* The page's title, for assistive technology and the heading
                    outline; the visible wordmark is in the Blurb below the grid. */}
                <Typography variant="h2" component="h1" sx={visuallyHiddenStyle}>
                    Dan&apos;s Plugins Community
                </Typography>
                <PluginsSection initialPlugins={pluginsWithCounts} />
                <SectionDivider/>
                <Blurb/>
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