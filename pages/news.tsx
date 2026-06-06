import {Box, Container, Paper, Typography} from '@mui/material';
import type {NextPage} from 'next';
import TopBar from '../components/TopBar';
import React from 'react';
import BottomBar from '../components/BottomBar';

// Import styles
import {pageStyle, sectionHeaderStyle, containerPaddingStyle} from '../styles/styles';

// Pull version from package.json
const version = require('../package.json').version;

interface NewsPost {
    id: string;
    title: string;
    date: string;
    body: string;
}

interface NewsData {
    posts: NewsPost[];
}

const newsData = require('./data/news.json') as NewsData;

// Newest first.
const sortedPosts = [...newsData.posts].sort((a, b) => b.date.localeCompare(a.date));

// A date-only string (YYYY-MM-DD) is parsed as UTC, so format in UTC too. This
// keeps the displayed day matching the input regardless of timezone, and keeps
// it identical on the server and client (avoiding a hydration mismatch).
const formatDate = (date: string): string =>
    new Date(date).toLocaleDateString('en-US', {year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC'});

const NewsCard: React.FC<{ post: NewsPost }> = ({post}) => (
    <Paper elevation={3} sx={{p: 2, mb: 2}}>
        <Typography variant="h6">{post.title}</Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
            {formatDate(post.date)}
        </Typography>
        <Typography variant="body1">{post.body}</Typography>
    </Paper>
);

const News: NextPage = () => (
    <Box sx={(theme) => pageStyle(theme)}>
        <TopBar/>
        <Container maxWidth="xl" sx={(theme) => containerPaddingStyle(theme)}>
            <Typography variant="h3" gutterBottom sx={(theme) => sectionHeaderStyle(theme)}>
                News
            </Typography>
            {sortedPosts.length > 0 ? (
                sortedPosts.map((post) => <NewsCard key={post.id} post={post}/>)
            ) : (
                <Typography variant="body1">No news yet. Check back soon!</Typography>
            )}
        </Container>
        <BottomBar version={version}/>
    </Box>
);

export default News;
