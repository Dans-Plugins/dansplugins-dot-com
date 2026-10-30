import React from 'react';
import {Box, Typography} from '@mui/material';
import {changeShort, shortDay, type Trend} from '../utils/usageTrends';

const WIDTH = 300;

interface TrendSparklineProps {
    trend: Trend;
    height?: number;
    // Full: first/peak/last labels and the change in words under the line
    // (the resource page). Compact: one short caption above it (the /usage
    // list, where space is tight).
    variant?: 'full' | 'compact';
}

/**
 * One per-day series over trace's 30-day window, as an inline SVG line.
 * Servers draw in the theme's primary colour and starts in its secondary text
 * colour, both through currentColor, so they follow the light/dark toggle and
 * keep at least 3:1 against the page in either. Everything the chart shows is
 * in its accessible name and in visible text — nothing is behind a hover, so
 * a phone reads it the same as a desktop.
 */
const TrendSparkline: React.FC<TrendSparklineProps> = ({trend, height = 48, variant = 'full'}) => {
    const {points, peak} = trend;
    const max = peak.value;
    const pad = 2;
    const step = points.length > 1 ? WIDTH / (points.length - 1) : 0;
    const y = (n: number) => (max === 0 ? height - pad : pad + (height - 2 * pad) * (1 - n / max));
    const coords = points.map((p, i) => `${(i * step).toFixed(1)},${y(p.value).toFixed(1)}`);
    const line = `M${coords.join(' L')}`;
    const area = `${line} L${WIDTH},${height} L0,${height} Z`;
    const first = shortDay(points[0].day);
    const last = shortDay(points[points.length - 1].day);
    const color = trend.kind === 'servers' ? 'primary.main' : 'text.secondary';
    const short = changeShort(trend.change);

    return (
        <Box data-testid={`trend-${trend.kind}`} data-direction={trend.change?.direction ?? 'none'}>
            {variant === 'compact' ? (
                <Typography variant="caption" color="text.secondary" component="p" sx={{m: 0, lineHeight: 1.3}} aria-hidden>
                    {trend.shortName}/day{short ? `: ${short}` : ''}
                </Typography>
            ) : null}
            <Box sx={{color}}>
                <svg
                    role="img"
                    aria-label={trend.summary}
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
            </Box>
            {variant === 'full' ? (
                <Box aria-hidden>
                    <Box sx={{display: 'flex', justifyContent: 'space-between', gap: 1, mt: 0.5}}>
                        <Typography variant="caption" color="text.secondary">{first}</Typography>
                        {max > 0 ? (
                            <Typography variant="caption" color="text.secondary" sx={{textAlign: 'center'}}>
                                Peak {peak.value.toLocaleString('en-US')} on {shortDay(peak.day)}
                            </Typography>
                        ) : null}
                        <Typography variant="caption" color="text.secondary">{last}</Typography>
                    </Box>
                    {trend.changeLabel ? (
                        <Typography variant="body2" component="p" sx={{m: 0, mt: 0.25}} data-testid={`trend-${trend.kind}-change`}>
                            {trend.changeLabel}
                        </Typography>
                    ) : null}
                </Box>
            ) : null}
        </Box>
    );
};

export default TrendSparkline;
