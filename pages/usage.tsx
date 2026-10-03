import {Alert, Avatar, Box, Container, Link, Paper, Stack, Typography} from '@mui/material';
import type {GetServerSideProps, NextPage} from 'next';
import React from 'react';
import TopBar from '../components/TopBar';
import Seo from '../components/Seo';
import BottomBar from '../components/BottomBar';
import StartsSparkline from '../components/StartsSparkline';
import {TraceAttribution} from '../components/UsagePanel';
import {NextLinkComposed} from '../components/NextLinkComposed';
import {pageStyle, sectionHeaderStyle, containerPaddingStyle} from '../styles/styles';
import {getCatalogue} from '../services/pluginCatalogueService';
import {colorForTitle} from '../utils/pluginAvatar';
import {resourcePath} from '../utils/resources';
import {TRACE_PROGRAM_NAMES, traceReportingSlugs} from '../utils/traceNames';
import {getProgramUsage, getUsageSummary, ProgramUsage} from '../utils/traceUsage';
import {activeServersLabel, rankUsage, usageHeadline} from '../utils/usageDisplay';

const version = require('../package.json').version;

interface UsageRow {
    slug: string;
    title: string;
    icon: string | null;
    // Null when trace has no figures for the plugin, or can't be reached.
    usage: ProgramUsage | null;
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
    // The summary's own counts are raw events, CI runs included, and are
    // deliberately not shown.
    const [catalogue, summary] = await Promise.all([getCatalogue(), getUsageSummary()]);
    const known = summary ? new Set(summary.map((row) => row.application)) : null;
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
        };
    });
    return {props: {rows: rankUsage(rows), renderedAt: Date.now()}};
};

const UsageListRow: React.FC<{row: UsageRow; now: number}> = ({row, now}) => {
    const headline = row.usage ? usageHeadline(row.usage, now) : null;
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
                {headline ? (
                    <>
                        {headline.activeServers !== null ? (
                            <Typography variant="body2" sx={{fontWeight: 600}} data-testid="usage-row-servers">
                                {activeServersLabel(headline.activeServers)} (30 days)
                            </Typography>
                        ) : null}
                        <Typography variant="body2" data-testid="usage-row-last-reported">
                            {headline.lastReported ?? 'No use reported yet'}
                        </Typography>
                        {headline.starts ? (
                            <Typography variant="body2" color="text.secondary" data-testid="usage-row-starts">
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
            {row.usage && row.usage.startups30d > 0 && row.usage.days.length > 0 ? (
                <Box sx={{flex: '1 1 8rem', maxWidth: {xs: '100%', sm: 180}}}>
                    <StartsSparkline days={row.usage.days} height={32} showLabels={false}/>
                </Box>
            ) : null}
        </Paper>
    );
};

const Usage: NextPage<UsagePageProps> = ({rows, renderedAt}) => {
    const anyFigures = rows.some((row) => row.usage !== null);
    const anyServerCounts = rows.some((row) => typeof row.usage?.activeInstalls30d === 'number');
    return (
        <Box sx={(theme) => pageStyle(theme)}>
            <Seo
                title="Plugin usage"
                description="Which Dan's Plugins are in use on real servers, as reported by trace over the last 30 days. CI and test servers are excluded."
                path="/usage"
            />
            <TopBar/>
            <Container component="main" id="main" maxWidth="md" sx={(theme) => containerPaddingStyle(theme)}>
                <Typography variant="h3" component="h1" gutterBottom sx={(theme) => sectionHeaderStyle(theme)}>
                    Plugin usage
                </Typography>
                <Typography variant="body1" gutterBottom>
                    Servers running our plugins report when they start, through{' '}
                    <Link href="https://github.com/Stephenson-Software/trace" target="_blank" rel="noopener noreferrer">trace</Link>.
                    These are the last 30 days of those reports.
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                    A server start is not a server: one server restarting every night counts thirty times. Plugins that
                    report a server ID are counted as active servers; for the rest, this page says only when the plugin
                    was last reported in use and how many starts were seen.
                    {anyServerCounts
                        ? ' Plugins are listed by active servers, then by how recently they were reported.'
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
