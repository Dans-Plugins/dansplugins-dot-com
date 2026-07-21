import React from 'react';
import {Box, Button, Container, Typography} from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import TopBar from './TopBar';
import Seo from './Seo';
import BottomBar from './BottomBar';
import {NextLinkComposed} from './NextLinkComposed';
import {pageStyle, sectionHeaderStyle} from '../styles/styles';

const version = require('../package.json').version;

/**
 * Shared layout for the site's error pages (404 / 500). Renders the standard
 * page chrome (TopBar/BottomBar) around a centred message and a link home, so a
 * thrown or missing route still looks like the rest of the MUI-themed site
 * instead of Next.js's unstyled default.
 */
const ErrorPage: React.FC<{code: string; title: string; message: string}> = ({code, title, message}) => (
    <Box sx={(theme) => pageStyle(theme)}>
        <Seo title={`${code} — ${title}`} description={message}/>
        <TopBar/>
        <Container component="main" id="main" maxWidth="sm" sx={{py: 8, textAlign: 'center'}}>
            <Typography variant="h1" color="primary" sx={{fontWeight: 700}}>
                {code}
            </Typography>
            <Typography variant="h4" gutterBottom sx={(theme) => sectionHeaderStyle(theme)}>
                {title}
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{mb: 3}}>
                {message}
            </Typography>
            <Button variant="contained" startIcon={<HomeIcon/>} component={NextLinkComposed} to="/">
                Back to home
            </Button>
        </Container>
        <BottomBar version={version}/>
    </Box>
);

export default ErrorPage;
