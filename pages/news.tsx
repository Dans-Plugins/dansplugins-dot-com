import {Box, Chip, Container, Link, Paper, Typography} from '@mui/material';
import type {NextPage} from 'next';
import TopBar from '../components/TopBar';
import Seo from '../components/Seo';
import React from 'react';
import BottomBar from '../components/BottomBar';
import {getNewsPosts, NewsPost, NewsSource} from '../utils/newsStorage';
// A date-only string (YYYY-MM-DD) is parsed as UTC, and this formats in UTC too:
// the displayed day matches the input regardless of timezone and is identical on
// the server and client (no hydration mismatch). Shared with the release dates on
// resource pages so the site prints a date one way.
import {absoluteDateFrom} from '../utils/relativeTime';

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

interface NewsProps {
    posts: NewsPost[];
}

export const getServerSideProps = async () => ({
    props: {posts: getNewsPosts()}
});

const NewsCard: React.FC<{ post: NewsPost }> = ({post}) => {
    const badge = SOURCE_BADGE[post.source];
    return (
        <Paper
            elevation={0}
            sx={{
                p: 2.5,
                mb: 2,
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                '&:hover': {transform: 'translateY(-2px)', boxShadow: '0 6px 20px rgba(0,0,0,0.12)'},
            }}
        >
            <Box sx={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap'}}>
                <Typography variant="h6">{post.title}</Typography>
                <Chip label={badge.label} color={badge.color} size="small"/>
            </Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
                {absoluteDateFrom(post.date)}{post.author ? ` · ${post.author}` : ''}
            </Typography>
            <Typography variant="body1">{post.body}</Typography>
            {post.sourceUrl && (
                <Typography variant="body2" sx={{mt: 1}}>
                    <Link href={post.sourceUrl} target="_blank" rel="noopener noreferrer">View source</Link>
                </Typography>
            )}
        </Paper>
    );
};

const News: NextPage<NewsProps> = ({posts}) => (
    <Box sx={(theme) => pageStyle(theme)}>
        <Seo title="News" description="Announcements and updates from Dan's Plugins Community."/>
        <TopBar/>
        <Container component="main" id="main" maxWidth="md" sx={(theme) => containerPaddingStyle(theme)}>
            <Typography variant="h3" component="h1" gutterBottom sx={(theme) => sectionHeaderStyle(theme)}>
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
