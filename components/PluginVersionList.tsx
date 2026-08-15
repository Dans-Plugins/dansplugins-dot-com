import React from 'react';
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Box,
    Button,
    Chip,
    Link,
    Paper,
    Stack,
    Typography,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ScienceIcon from '@mui/icons-material/Science';
import Markdown from 'markdown-to-jsx';
import type {PluginVersion} from '../services/pluginVersionService';
import {formatFileSize} from '../utils/fileSize';
import {absoluteDateFrom} from '../utils/relativeTime';

interface PluginVersionListProps {
    versions: PluginVersion[];
    releasesUrl?: string;
}

// Changelogs are release bodies written by the plugin authors, so they are
// markdown in the same house style as a user guide — but rendered smaller,
// since a version's notes sit inside a list of versions rather than being the
// page. Headings in particular are flattened towards body size: a release note
// beginning "# 1.4.0" must not outrank the page's own headings.
const changelogStyle = {
    fontSize: '0.9rem',
    '& h1, & h2, & h3, & h4': {
        fontFamily: '"Space Grotesk", sans-serif',
        fontSize: '1rem',
        fontWeight: 600,
        mt: 2,
        mb: 1,
    },
    '& p': {mb: 1.5, lineHeight: 1.7},
    '& ul, & ol': {pl: 3, mb: 1.5},
    '& li': {mb: 0.5},
    '& a': {color: 'primary.main'},
    '& code': {
        bgcolor: 'action.hover',
        px: 0.6,
        py: 0.2,
        borderRadius: 0.5,
        fontFamily: 'monospace',
        fontSize: '0.9em',
    },
    '& pre': {bgcolor: 'action.hover', p: 1.5, borderRadius: 1, overflow: 'auto'},
    '& img': {maxWidth: '100%'},
};

// Raw HTML is disabled deliberately. markdown-to-jsx parses it by default, and
// these bodies are the first markdown on a resource page that this site does
// not fetch from a repository file it controls — a mirrored release note is
// whatever GitHub returned. components/GuideMarkdown.tsx disables it for the
// same reason, and reviews and comments will need this off too.
const Changelog: React.FC<{markdown: string}> = ({markdown}) => (
    <Box sx={changelogStyle}>
        <Markdown options={{disableParsingRawHTML: true}}>{markdown}</Markdown>
    </Box>
);

const AssetButtons: React.FC<{version: PluginVersion}> = ({version}) => (
    <Stack direction="row" spacing={1} sx={{flexWrap: 'wrap', rowGap: 1, mt: 2}}>
        {version.assets.map((asset) => (
            <Button
                key={asset.downloadUrl}
                size="small"
                variant="outlined"
                startIcon={<DownloadIcon/>}
                component={Link}
                href={asset.downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
            >
                {asset.name} ({formatFileSize(asset.sizeBytes)})
            </Button>
        ))}
    </Stack>
);

const VersionHeading: React.FC<{version: PluginVersion}> = ({version}) => (
    <Stack direction="row" spacing={1} alignItems="center" sx={{flexWrap: 'wrap', rowGap: 1}}>
        <Typography component="span" sx={{fontWeight: 600}}>
            {version.name || version.tag}
        </Typography>
        {version.prerelease ? (
            <Chip size="small" variant="outlined" color="warning" icon={<ScienceIcon/>} label="Pre-release"/>
        ) : null}
        <Typography component="span" variant="body2" color="text.secondary">
            {absoluteDateFrom(version.publishedAt)}
        </Typography>
    </Stack>
);

/**
 * A plugin's release history, mirrored from GitHub by dpc-api. The newest
 * release is shown expanded — it is the one almost every visitor came for —
 * and the rest collapse into accordions so the page stays a page rather than a
 * changelog archive.
 *
 * Renders nothing at all when there is nothing mirrored: a plugin that has
 * never cut a release should show no section, not an empty one, because an
 * empty version list reads as a broken feature rather than as an absence.
 */
const PluginVersionList: React.FC<PluginVersionListProps> = ({versions, releasesUrl}) => {
    if (versions.length === 0) {
        return null;
    }
    const [latest, ...older] = versions;

    return (
        <Box component="section" sx={{mb: 4}}>
            <Stack
                direction="row"
                spacing={2}
                alignItems="baseline"
                justifyContent="space-between"
                sx={{flexWrap: 'wrap', rowGap: 1, mb: 2}}
            >
                <Typography variant="h5" component="h2" sx={{fontWeight: 700}}>
                    Versions
                </Typography>
                {releasesUrl ? (
                    <Button
                        size="small"
                        endIcon={<OpenInNewIcon/>}
                        component={Link}
                        href={releasesUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        All releases on GitHub
                    </Button>
                ) : null}
            </Stack>

            <Paper variant="outlined" sx={{p: 2.5, mb: older.length > 0 ? 2 : 0}}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{flexWrap: 'wrap', rowGap: 1, mb: 1}}>
                    <Chip size="small" color="primary" label="Latest"/>
                    <VersionHeading version={latest}/>
                </Stack>
                {latest.changelog ? <Changelog markdown={latest.changelog}/> : (
                    <Typography variant="body2" color="text.secondary">
                        No release notes were published for this version.
                    </Typography>
                )}
                <AssetButtons version={latest}/>
            </Paper>

            {older.map((version) => (
                <Accordion key={version.tag} disableGutters variant="outlined">
                    <AccordionSummary expandIcon={<ExpandMoreIcon/>}>
                        <VersionHeading version={version}/>
                    </AccordionSummary>
                    <AccordionDetails>
                        {version.changelog ? <Changelog markdown={version.changelog}/> : (
                            <Typography variant="body2" color="text.secondary">
                                No release notes were published for this version.
                            </Typography>
                        )}
                        <AssetButtons version={version}/>
                    </AccordionDetails>
                </Accordion>
            ))}
        </Box>
    );
};

export default PluginVersionList;
