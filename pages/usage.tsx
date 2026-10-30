import {Alert, Avatar, Box, Container, Link, Paper, Stack, Typography} from '@mui/material';
import type {GetServerSideProps, NextPage} from 'next';
import React from 'react';
import TopBar from '../components/TopBar';
import Seo from '../components/Seo';
import BottomBar from '../components/BottomBar';
import TrendSparkline from '../components/TrendSparkline';
import {TraceAttribution} from '../components/UsagePanel';
import {NextLinkComposed} from '../components/NextLinkComposed';
import {pageStyle, sectionHeaderStyle, containerPaddingStyle} from '../styles/styles';
import {getCatalogue} from '../services/pluginCatalogueService';
import {colorForTitle} from '../utils/pluginAvatar';
import {resourcePath} from '../utils/resources';
import {TRACE_PROGRAM_NAMES, traceReportingSlugs} from '../utils/traceNames';
import {getProgramUsage, getUsageSummary, ProgramUsage} from '../utils/traceUsage';
import {
    SERVERS_COUNTED_NOTE,
    activeServersLabel,
    rankUsage,
    serversSeenLabel,
    usageHeadline
} from '../utils/usageDisplay';
import {usageTrends} from '../utils/usageTrends';

const version = require('../package.json').version;

interface UsageRow {
    slug: string;
    title: string;
    icon: string | null;
    // Null when trace has no figures for the plugin, or can't be reached.
    usage: ProgramUsage | null;
    // Distinct servers over about the past year, from trace's summary; null
    // until trace sends the field, or for a plugin no newer version reported.
    serversYear: number | null;
}

interface UsagePageProps {
    rows: UsageRow[];
    // Fixes the clock relative dates use, so server markup and hydration agree.
    renderedAt: number;
}

export const getServerSideProps: GetServerSideProps<UsagePageProps> = async () => {
    // One summary call says which programs trace has heard from at all, so a
    // plugin that has never reported costs no request of its own. If the
    // summary itself is unavailable every plugin is asked; each answer is
    // cached (utils/traceUsage.ts) and a failure is just a row without figures.
    // The summary's distinct-server count (`installs`) is used; its raw event
    // counts are dropped in utils/traceUsage.ts and never shown.
    const [catalogue, summary] = await Promise.all([getCatalogue(), getUsageSummary()]);
    const known = summary ? new Set(summary.map((row) => row.application)) : null;
    const installsByName = new Map((summary ?? []).map((row) => [row.application, row.installs]));
    const slugs = traceReportingSlugs();
    const usages = await Promise.all(slugs.map((slug) => {
        const name = TRACE_PROGRAM_NAMES[slug];
        return known && !known.has(name) ? Promise.resolve(undefined) : getProgramUsage(name);
    }));
    const rows: UsageRow[] = slugs.map((slug, i) => {
        const plugin = catalogue.find((p) => p.id === slug);
        return {
            slug,
            title: plugin?.title ?? TRACE_PROGRAM_NAMES[slug],
            icon: plugin?.icon ?? null,
            usage: usages[i] ?? null,
            serversYear: installsByName.get(TRACE_PROGRAM_NAMES[slug]) ?? null,
        };
    });
    return {props: {rows: rankUsage(rows), renderedAt: Date.now()}};
};

const UsageListRow: React.FC<{row: UsageRow; now: number}> = ({row, now}) => {
    const headline = row.usage ? usageHeadline(row.usage, now) : null;
    const trends = row.usage ? usageTrends(row.usage, now) : null;
    return (
        <Paper
            component="li"
            variant="outlined"
            sx={{p: 1.5, display: 'flex', flexWrap: 'wrap', alignItems: 'center', columnGap: 1.5, rowGap: 1}}
            data-testid="usage-row"
        >
            <Avatar
                variant="rounded"
                {...(row.icon ? {src: row.icon, alt: ''} : {'aria-hidden': true})}
                sx={{bgcolor: colorForTitle(row.title), width: 36, height: 36, fontSize: '1rem'}}
            >
                {row.title.charAt(0).toUpperCase()}
            </Avatar>
            <Box sx={{minWidth: 0, flex: '1 1 12rem'}}>
                <Link component={NextLinkComposed} to={resourcePath(row.slug)} variant="subtitle1" sx={{fontWeight: 600}}>
                    {row.title}
                </Link>
                {headline || row.serversYear !== null ? (
                    <>
                        {headline?.activeServers != null ? (
                            <Typography variant="body1" sx={{fontWeight: 700}} data-testid="usage-row-servers">
                                {activeServersLabel(headline.activeServers)} (30 days)
                            </Typography>
                        ) : null}
                        {row.serversYear !== null ? (
                            <Typography
                                variant={headline?.activeServers != null ? 'body2' : 'body1'}
                                sx={{fontWeight: headline?.activeServers != null ? 400 : 700}}
                                data-testid="usage-row-servers-year"
                            >
                                {serversSeenLabel(row.serversYear)}
                            </Typography>
                        ) : null}
                        {headline ? (
                            <Typography variant="body2" data-testid="usage-row-last-reported">
                                {headline.lastReported ?? 'No use reported yet'}
                            </Typography>
                        ) : null}
                        {headline?.starts ? (
                            <Typography variant="caption" color="text.secondary" component="p" sx={{m: 0}} data-testid="usage-row-starts">
                                {headline.starts}
                            </Typography>
                        ) : null}
                    </>
                ) : (
                    <Typography variant="body2" color="text.secondary" data-testid="usage-row-none">
                        No usage figures available
                    </Typography>
                )}
            </Box>
            {trends && (trends.servers || trends.starts) ? (
                // Full width under the text on a phone; a narrow column beside it from sm up.
                <Box
                    sx={{flex: '1 1 8rem', maxWidth: {xs: '100%', sm: 180}, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 0.75}}
                    data-testid="usage-row-trends"
                >
                    {[trends.servers, trends.starts].map((trend) => (trend
                        ? <TrendSparkline key={trend.kind} trend={trend} height={28} variant="compact"/>
                        : null))}
                </Box>
            ) : null}
        </Paper>
    );
};

const Usage: NextPage<UsagePageProps> = ({rows, renderedAt}) => {
    const anyFigures = rows.some((row) => row.usage !== null || row.serversYear !== null);
    const anyServerCounts = rows.some((row) =>
        typeof row.usage?.activeInstalls30d === 'number' || row.serversYear !== null);
    return (
        <Box sx={(theme) => pageStyle(theme)}>
            <Seo
                title="Plugin usage"
                description="How many servers run each of Dan's Plugins, as reported by trace: active servers in the last 30 days and servers seen in the past year. CI and test servers are excluded."
                path="/usage"
            />
            <TopBar/>
            <Container component="main" id="main" maxWidth="md" sx={(theme) => containerPaddingStyle(theme)}>
                <Typography variant="h3" component="h1" gutterBottom sx={(theme) => sectionHeaderStyle(theme)}>
                    Plugin usage
                </Typography>
                <Typography variant="body1" gutterBottom>
                    How many servers run each plugin, as the plugins report to{' '}
                    <Link href="https://trace.danielstephenson.dev" target="_blank" rel="noopener noreferrer">trace</Link>:
                    active servers in the last 30 days, and servers seen in the past year.
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom data-testid="usage-servers-note">
                    {SERVERS_COUNTED_NOTE} A plugin with no newer version in use shows only when it was last reported
                    in use. Server starts are shown in small print: one server restarting every night counts thirty
                    times, so starts are not servers. Each row&apos;s small chart shows server starts per day over the
                    last 30 days, and whether its later half is up or down on its earlier half (today, still
                    under way, is left out of that comparison).
                    {anyServerCounts
                        ? ' Plugins are listed by active servers, then by servers seen in the past year, then by how recently they were reported.'
                        : ' Plugins are listed by how recently they were reported in use.'}
                </Typography>
                <Box sx={{mb: 3}}>
                    <TraceAttribution/>
                </Box>

                {anyFigures ? null : (
                    <Alert severity="info" sx={{mb: 3}} data-testid="usage-unavailable">
                        Usage figures are not available right now. Each plugin&apos;s page will show them once trace
                        reports them.
                    </Alert>
                )}

                <Stack component="ol" spacing={1} sx={{listStyle: 'none', m: 0, p: 0, mb: 4}} aria-label="Plugins by usage">
                    {rows.map((row) => <UsageListRow key={row.slug} row={row} now={renderedAt}/>)}
                </Stack>
            </Container>
            <BottomBar version={version}/>
        </Box>
    );
};

export default Usage;
