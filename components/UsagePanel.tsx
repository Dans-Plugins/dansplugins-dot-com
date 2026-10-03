import React from 'react';
import {Box, Link, Paper, Stack, Typography} from '@mui/material';
import InsightsIcon from '@mui/icons-material/Insights';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import {NextLinkComposed} from './NextLinkComposed';
import StartsSparkline from './StartsSparkline';
import type {ProgramUsage} from '../utils/traceUsage';
import {
    TRACE_HOW_IT_WORKS_URL,
    percentLabel,
    usageHeadline,
    versionShares
} from '../utils/usageDisplay';

/** The "where these figures come from" line every usage view carries. */
export const TraceAttribution: React.FC = () => (
    <Typography variant="caption" color="text.secondary" component="p" sx={{m: 0}} data-testid="trace-attribution">
        Usage reported by trace —{' '}
        <Link href={TRACE_HOW_IT_WORKS_URL} target="_blank" rel="noopener noreferrer">
            how it works
            <OpenInNewIcon sx={{fontSize: '0.75rem', ml: 0.25, verticalAlign: 'middle'}} aria-hidden/>
        </Link>
        . CI and test servers are excluded.
    </Typography>
);

interface UsagePanelProps {
    usage: ProgramUsage;
    // The render's clock, fixed server side so relative dates hydrate identically.
    now: number;
}

/**
 * One plugin's usage on its resource page. What it may claim depends on what
 * trace could count — see utils/usageDisplay.ts for the rules.
 */
const UsagePanel: React.FC<UsagePanelProps> = ({usage, now}) => {
    const headline = usageHeadline(usage, now);
    const shares = versionShares(usage);
    return (
        <Paper
            component="section"
            aria-labelledby="usage-heading"
            variant="outlined"
            sx={{p: 2, mb: 3}}
            data-testid="usage-panel"
        >
            <Stack direction="row" spacing={1} alignItems="center" sx={{mb: 1}}>
                <InsightsIcon color="primary" fontSize="small"/>
                <Typography id="usage-heading" variant="h6" component="h2">Usage</Typography>
            </Stack>

            {headline.activeServers !== null ? (
                <Box sx={{mb: 1}} data-testid="usage-active-servers">
                    <Typography variant="h4" component="p" sx={{fontWeight: 700, lineHeight: 1.1, m: 0}}>
                        {headline.activeServers.toLocaleString('en-US')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">Active servers (30 days)</Typography>
                </Box>
            ) : null}

            {headline.lastReported ? (
                <Typography variant="body1" data-testid="usage-last-reported">{headline.lastReported}</Typography>
            ) : (
                <Typography variant="body1" data-testid="usage-last-reported">No use reported yet</Typography>
            )}
            {headline.starts ? (
                <Typography variant="body2" color="text.secondary" data-testid="usage-starts">
                    {headline.starts}
                </Typography>
            ) : null}

            {usage.startups30d > 0 && usage.days.length > 0 ? (
                <Box sx={{mt: 2}}>
                    <Typography variant="subtitle2" component="h3" gutterBottom>Server starts per day</Typography>
                    <StartsSparkline days={usage.days}/>
                </Box>
            ) : null}

            {shares ? (
                <Box sx={{mt: 2}} data-testid="usage-versions" data-basis={shares.basis}>
                    <Typography variant="subtitle2" component="h3" gutterBottom>{shares.heading}</Typography>
                    <Stack component="ul" spacing={0.75} sx={{listStyle: 'none', m: 0, p: 0}}>
                        {shares.rows.map((row) => (
                            <Box component="li" key={row.label}>
                                <Box sx={{display: 'flex', justifyContent: 'space-between', gap: 1}}>
                                    <Typography variant="body2" sx={{fontFamily: row.label.match(/^\d/) ? 'monospace' : undefined}}>
                                        {row.label}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" sx={{whiteSpace: 'nowrap'}}>
                                        {percentLabel(row.share)} · {shares.unit(row.count)}
                                    </Typography>
                                </Box>
                                <Box sx={{height: 6, borderRadius: 3, bgcolor: 'action.hover', overflow: 'hidden'}} aria-hidden>
                                    <Box sx={{height: '100%', width: `${Math.max(row.share * 100, 1)}%`, bgcolor: 'primary.main', borderRadius: 3}}/>
                                </Box>
                            </Box>
                        ))}
                    </Stack>
                </Box>
            ) : null}

            <Box sx={{mt: 2, display: 'flex', flexDirection: 'column', gap: 0.5}}>
                <TraceAttribution/>
                <Typography variant="caption" component="p" sx={{m: 0}}>
                    <Link component={NextLinkComposed} to="/usage">Usage of every plugin</Link>
                </Typography>
            </Box>
        </Paper>
    );
};

export default UsagePanel;
