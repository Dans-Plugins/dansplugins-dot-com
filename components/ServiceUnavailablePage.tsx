import React from 'react';
import {Box, Container, Typography} from '@mui/material';
import TopBar from './TopBar';
import Seo from './Seo';
import BottomBar from './BottomBar';
import CatalogueUnavailable from './CatalogueUnavailable';
import {pageStyle, sectionHeaderStyle} from '../styles/styles';

const version = require('../package.json').version;

/**
 * What a plugin or guide page renders when it answered 503 because dpc-api
 * could not be reached (see utils/serviceUnavailable.ts). It says the page is
 * temporarily unavailable rather than missing, and reuses the catalogue
 * outage notice's next steps: try again, or the plugins on GitHub.
 */
const ServiceUnavailablePage: React.FC<{title: string}> = ({title}) => (
    <Box sx={(theme) => pageStyle(theme)}>
        {/* noindex and no canonical URL: a crawler must not file the outage
            notice in place of the real page. */}
        <Seo
            title="Temporarily unavailable"
            description="This page could not be loaded right now. Please try again shortly."
            path={null}
            noindex
        />
        <TopBar/>
        <Container component="main" id="main" maxWidth="sm" sx={{py: 8, textAlign: 'center'}} data-testid="service-unavailable">
            <Typography variant="h4" component="h1" gutterBottom sx={(theme) => sectionHeaderStyle(theme)}>
                {title}
            </Typography>
            <CatalogueUnavailable/>
        </Container>
        <BottomBar version={version}/>
    </Box>
);

export default ServiceUnavailablePage;
