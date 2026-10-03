import React from 'react';
import {Box, Typography} from '@mui/material';
import type {DailyStarts} from '../utils/traceUsage';

// Month and day, pinned to en-US and UTC like utils/relativeTime.ts so the
// server-rendered text matches hydration. trace's days are UTC calendar days.
const shortDay = (day: string): string => {
    const date = new Date(`${day}T00:00:00Z`);
    return Number.isNaN(date.getTime())
        ? day
        : date.toLocaleDateString('en-US', {month: 'short', day: 'numeric', timeZone: 'UTC'});
};

const WIDTH = 300;

interface StartsSparklineProps {
    days: DailyStarts[];
    height?: number;
    // Show the first/peak/last labels under the line (the resource page does;
    // the /usage list, where space is tight, does not).
    showLabels?: boolean;
}

/**
 * Daily server starts over trace's 30-day window, as an inline SVG line.
 * Drawn in the theme's primary colour through currentColor, so it follows the
 * light/dark toggle. Everything it says is in its accessible name and, when
 * labelled, in visible text — nothing is behind a hover.
 */
const StartsSparkline: React.FC<StartsSparklineProps> = ({days, height = 48, showLabels = true}) => {
    if (days.length === 0) {
        return null;
    }
    const max = Math.max(...days.map((d) => d.startups));
    const total = days.reduce((sum, d) => sum + d.startups, 0);
    const peak = days.reduce((best, d) => (d.startups > best.startups ? d : best), days[0]);
    const pad = 2;
    const step = days.length > 1 ? WIDTH / (days.length - 1) : 0;
    const y = (n: number) => (max === 0 ? height - pad : pad + (height - 2 * pad) * (1 - n / max));
    const points = days.map((d, i) => `${(i * step).toFixed(1)},${y(d.startups).toFixed(1)}`);
    const line = `M${points.join(' L')}`;
    const area = `${line} L${WIDTH},${height} L0,${height} Z`;
    const first = shortDay(days[0].day);
    const last = shortDay(days[days.length - 1].day);
    const summary = `Server starts per day from ${first} to ${last}: ${total.toLocaleString('en-US')} in total`
        + (max > 0 ? `, peaking at ${peak.startups.toLocaleString('en-US')} on ${shortDay(peak.day)}.` : '.');

    return (
        <Box sx={{color: 'primary.main'}} data-testid="starts-sparkline">
            <svg
                role="img"
                aria-label={summary}
                viewBox={`0 0 ${WIDTH} ${height}`}
                preserveAspectRatio="none"
                width="100%"
                height={height}
                style={{display: 'block'}}
            >
                <path d={area} fill="currentColor" fillOpacity={0.12} stroke="none"/>
                <path d={line} fill="none" stroke="currentColor" strokeWidth={2} vectorEffect="non-scaling-stroke"
                      strokeLinejoin="round" strokeLinecap="round"/>
            </svg>
            {showLabels ? (
                <Box sx={{display: 'flex', justifyContent: 'space-between', gap: 1, mt: 0.5}} aria-hidden>
                    <Typography variant="caption" color="text.secondary">{first}</Typography>
                    {max > 0 ? (
                        <Typography variant="caption" color="text.secondary">
                            Peak {peak.startups.toLocaleString('en-US')} on {shortDay(peak.day)}
                        </Typography>
                    ) : null}
                    <Typography variant="caption" color="text.secondary">{last}</Typography>
                </Box>
            ) : null}
        </Box>
    );
};

export default StartsSparkline;
