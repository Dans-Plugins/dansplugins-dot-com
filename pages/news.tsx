import {Box, Card, CardContent, Container, Typography} from '@mui/material';
import type {NextPage} from 'next';
import TopBar from '../components/TopBar';
import React from 'react';
import BottomBar from '../components/BottomBar';

// Import styles
import {
    pageStyle,
    sectionHeaderStyle,
    containerPaddingStyle,
    cardWrapperStyle
} from '../styles/styles';

// Pull version from package.json
const version = require('../package.json').version;

interface NewsPost {
    id: number;
    title: string;
    date: string;
    content: string;
}

// Hard-coded news posts
const newsPosts: NewsPost[] = [
    {
        id: 1,
        title: 'Welcome to Dan\'s Plugins Community',
        date: '2024-01-15',
        content: 'Welcome to the new Dan\'s Plugins Community website! Here you can find all of our Minecraft plugins, guides, and community resources.'
    },
    {
        id: 2,
        title: 'Medieval Factions Update',
        date: '2024-01-10',
        content: 'A new update for Medieval Factions has been released with improved performance and bug fixes. Check out the changelog on GitHub for more details.'
    },
    {
        id: 3,
        title: 'Join Our Discord',
        date: '2024-01-05',
        content: 'Don\'t forget to join our Discord server to stay up to date with the latest news, get support, and connect with other community members.'
    }
];

const NewsCard: React.FC<{ post: NewsPost }> = ({ post }) => (
    <Card sx={{
        marginBottom: 3,
        ...cardWrapperStyle
    }}>
        <CardContent>
            <Typography variant="h5" component="div" gutterBottom sx={{ fontWeight: 'bold' }}>
                {post.title}
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
                {post.date}
            </Typography>
            <Typography variant="body1" sx={{ marginTop: 2 }}>
                {post.content}
            </Typography>
        </CardContent>
    </Card>
);

const News: NextPage = () => (
    <Box sx={(theme) => pageStyle(theme)}>
        <TopBar/>
        <Container maxWidth="xl" sx={(theme) => containerPaddingStyle(theme)}>
            <Typography variant="h3" gutterBottom sx={(theme) => sectionHeaderStyle(theme)}>
                News
            </Typography>
            <Typography variant="body1" gutterBottom sx={{ marginBottom: 4 }}>
                Stay up to date with the latest news and updates from Dan&apos;s Plugins Community.
            </Typography>
            <Box>
                {newsPosts.map((post) => (
                    <NewsCard key={post.id} post={post} />
                ))}
            </Box>
        </Container>
        <BottomBar version={version}/>
    </Box>
);

export default News;
