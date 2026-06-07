import {Box, Chip, Container, Link, Paper, Typography} from '@mui/material';
import type {NextPage} from 'next';
import TopBar from '../components/TopBar';
import React from 'react';
import BottomBar from '../components/BottomBar';

// Import styles
import {pageStyle, sectionHeaderStyle, containerPaddingStyle} from '../styles/styles';

// Pull version from package.json
const version = require('../package.json').version;

interface RoadmapItem {
    title: string;
    description: string;
    status: 'Completed' | 'In Progress' | 'Planned';
}

interface RoadmapData {
    items: RoadmapItem[];
}

const roadmapData = require('./data/roadmap.json') as RoadmapData;

// Display order and the MUI Chip colour used for each status.
const STATUS_ORDER: { status: RoadmapItem['status']; color: 'success' | 'warning' | 'info' }[] = [
    {status: 'In Progress', color: 'warning'},
    {status: 'Planned', color: 'info'},
    {status: 'Completed', color: 'success'}
];

const RoadmapCard: React.FC<{ item: RoadmapItem; color: 'success' | 'warning' | 'info' }> = ({item, color}) => (
    <Paper elevation={3} sx={{p: 2, mb: 2}}>
        <Box sx={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap'}}>
            <Typography variant="h6">{item.title}</Typography>
            <Chip label={item.status} color={color} size="small"/>
        </Box>
        <Typography variant="body2" sx={{mt: 1}}>{item.description}</Typography>
    </Paper>
);

const Roadmap: NextPage = () => (
    <Box sx={(theme) => pageStyle(theme)}>
        <TopBar/>
        <Container maxWidth="xl" sx={(theme) => containerPaddingStyle(theme)}>
            <Typography variant="h3" gutterBottom sx={(theme) => sectionHeaderStyle(theme)}>
                Road Map
            </Typography>
            <Typography variant="body1" gutterBottom>
                This page tracks where Dan&apos;s Plugins Community is headed. For the day-to-day detail,
                see the{' '}
                <Link href="https://github.com/Dans-Plugins/dansplugins-dot-com/issues" target="_blank" rel="noopener">
                    issue tracker on GitHub
                </Link>.
            </Typography>
            {STATUS_ORDER.map(({status, color}) => {
                const items = roadmapData.items.filter((item) => item.status === status);
                if (items.length === 0) {
                    return null;
                }
                return (
                    <Box key={status} sx={{mt: 4}}>
                        <Typography variant="h5" gutterBottom>{status}</Typography>
                        {items.map((item) => (
                            <RoadmapCard key={item.title} item={item} color={color}/>
                        ))}
                    </Box>
                );
            })}
        </Container>
        <BottomBar version={version}/>
    </Box>
);

export default Roadmap;
