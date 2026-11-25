import React from 'react';
import {Box, Button, Stack, Typography} from '@mui/material';
import GitHubIcon from '@mui/icons-material/GitHub';
import RefreshIcon from '@mui/icons-material/Refresh';

/**
 * What the home and guides pages show when the plugin catalogue could not be
 * read from dpc-api. A message alone is a dead end, so it offers two next
 * steps: try again, or go straight to the plugins' source on GitHub, which
 * does not depend on this site's API being up.
 */
const CatalogueUnavailable: React.FC<{align?: 'center' | 'left'}> = ({align = 'center'}) => (
    <Box sx={{py: 4, textAlign: align}} data-testid="catalogue-unavailable">
        <Typography color="text.secondary" gutterBottom>
            The plugin catalogue could not be loaded right now. Please try again shortly.
        </Typography>
        <Stack
            direction={{xs: 'column', sm: 'row'}}
            spacing={1}
            justifyContent={align === 'center' ? 'center' : 'flex-start'}
            alignItems={align === 'center' ? 'center' : 'flex-start'}
            sx={{mt: 1}}
        >
            <Button variant="outlined" size="small" startIcon={<RefreshIcon/>} onClick={() => window.location.reload()}>
                Try again
            </Button>
            <Button
                size="small"
                startIcon={<GitHubIcon/>}
                href="https://github.com/Dans-Plugins"
                target="_blank"
                rel="noopener noreferrer"
            >
                Browse the plugins on GitHub
            </Button>
        </Stack>
    </Box>
);

export default CatalogueUnavailable;
