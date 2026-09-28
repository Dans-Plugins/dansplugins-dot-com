import React from 'react';
import {Box, Link, Paper, Stack, Typography} from '@mui/material';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import {NextLinkComposed} from './NextLinkComposed';
import type {PluginVersion} from '../services/pluginVersionService';
import {describeGateRun, parseReleaseVerification} from '../utils/releaseVerification';

// "1.19.4", "1.19.4 and 26.2", "1.19.4, 1.21.11 and 26.2"
const listOf = (items: string[]): string =>
    items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;

interface ReleaseVerificationProps {
    versions: PluginVersion[];
}

/**
 * The release gates the current stable release passed, read from its notes. Renders nothing
 * when the release records none (a hand-made or older release): the page never claims a
 * check that did not happen.
 */
const ReleaseVerification: React.FC<ReleaseVerificationProps> = ({versions}) => {
    const stable = versions.find((version) => !version.prerelease);
    const verification = stable ? parseReleaseVerification(stable.changelog) : null;
    if (!stable || !verification) {
        return null;
    }
    const tag = stable.tag.replace(/^v/, '');
    return (
        <Paper
            component="section"
            aria-labelledby="verification-heading"
            variant="outlined"
            sx={{p: 2, mb: 4}}
            data-testid="release-verification"
        >
            <Stack direction="row" spacing={1} alignItems="center" sx={{mb: 1}}>
                <VerifiedUserIcon color="success" fontSize="small"/>
                <Typography id="verification-heading" variant="h6" component="h2">
                    Verified before release
                </Typography>
            </Stack>
            <Typography variant="body2" gutterBottom>
                {verification.minecraftVersions.length > 0
                    ? `Version ${tag} was started on real servers running Minecraft ${listOf(verification.minecraftVersions)} before it was published.`
                    : `Version ${tag} was started on a real server before it was published.`}
                {' '}The jar you download is the exact one that passed.{' '}
                <Link component={NextLinkComposed} to="/releases">How releases work</Link>
            </Typography>
            <Box component="ul" sx={{m: 0, pl: 3}}>
                {verification.runs.map((run) => (
                    <li key={run.url}>
                        <Link href={run.url} target="_blank" rel="noopener noreferrer" variant="body2">
                            {describeGateRun(run)}
                            <OpenInNewIcon sx={{fontSize: '0.8rem', ml: 0.5, verticalAlign: 'middle'}} aria-hidden/>
                        </Link>
                    </li>
                ))}
            </Box>
        </Paper>
    );
};

export default ReleaseVerification;
