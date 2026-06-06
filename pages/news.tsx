import {Box, Chip, Container, Link, Paper, Typography} from '@mui/material';
import type {NextPage} from 'next';
import TopBar from '../components/TopBar';
import React from 'react';
import BottomBar from '../components/BottomBar';
import {getNewsPosts, mergeNewsPosts, NewsPost, NewsSource} from '../utils/newsStorage';
import {getApiNewsPosts} from '../services/discordNewsService';

// Import styles
import {pageStyle, sectionHeaderStyle, containerPaddingStyle} from '../styles/styles';

// Pull version from package.json
const version = require('../package.json').version;

// How each post source is labelled and coloured in its badge.
const SOURCE_BADGE: Record<NewsSource, { label: string; color: 'primary' | 'info' | 'default' }> = {
    direct: {label: 'Announcement', color: 'primary'},
    discord: {label: 'From Discord', color: 'info'},
    external: {label: 'Reposted', color: 'default'}
};

// A date-only string (YYYY-MM-DD) is parsed as UTC, so format in UTC too: the
// displayed day matches the input regardless of timezone and is identical on
// the server and client (no hydration mismatch).
const formatDate = (date: string): string =>
    new Date(date).toLocaleDateString('en-US', {year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC'});

interface NewsProps {
    posts: NewsPost[];
}

export const getServerSideProps = async () => {
    // Merge locally-authored posts (data/news.json) with community posts from the
    // DPC API (Discord announcements). The API fetch degrades to an empty list on
    // failure, so the page always renders at least the local posts.
    const [localPosts, apiPosts] = await Promise.all([
        Promise.resolve(getNewsPosts()),
        getApiNewsPosts()
    ]);
    return {props: {posts: mergeNewsPosts(localPosts, apiPosts)}};
};

const NewsCard: React.FC<{ post: NewsPost }> = ({post}) => {
    const badge = SOURCE_BADGE[post.source];
    return (
        <Paper elevation={3} sx={{p: 2, mb: 2}}>
            <Box sx={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap'}}>
                <Typography variant="h6">{post.title}</Typography>
                <Chip label={badge.label} color={badge.color} size="small"/>
            </Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
                {formatDate(post.date)}{post.author ? ` · ${post.author}` : ''}
            </Typography>
            <Typography variant="body1">{post.body}</Typography>
            {post.sourceUrl && (
                <Typography variant="body2" sx={{mt: 1}}>
                    <Link href={post.sourceUrl} target="_blank" rel="noopener">View source</Link>
                </Typography>
            )}
        </Paper>
    );
};

const News: NextPage<NewsProps> = ({posts}) => (
    <Box sx={(theme) => pageStyle(theme)}>
        <TopBar/>
        <Container maxWidth="xl" sx={(theme) => containerPaddingStyle(theme)}>
            <Typography variant="h3" gutterBottom sx={(theme) => sectionHeaderStyle(theme)}>
                News
            </Typography>
            {posts.length > 0 ? (
                posts.map((post) => <NewsCard key={post.id} post={post}/>)
            ) : (
                <Typography variant="body1">No news yet. Check back soon!</Typography>
            )}
        </Container>
        <BottomBar version={version}/>
    </Box>
);

export default News;
