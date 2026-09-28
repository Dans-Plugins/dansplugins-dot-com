import {Box, Container, Link, Paper, Stack, Typography} from '@mui/material';
import type {NextPage} from 'next';
import React from 'react';
import TopBar from '../components/TopBar';
import Seo from '../components/Seo';
import BottomBar from '../components/BottomBar';
import {pageStyle, sectionHeaderStyle, containerPaddingStyle} from '../styles/styles';

const version = require('../package.json').version;

const RELEASE_GATES = 'https://github.com/Dans-Plugins/release-gates';
const RELEASE_CHANNELS = 'https://github.com/Dans-Plugins/dpc-conventions/blob/main/docs/RELEASE_CHANNELS.md';

interface Gate {
    id: string;
    name: string;
    when: string;
    checks: string;
}

// What each gate checks, in plain words. The authoritative list of assertions is the
// release-gates README; keep this in step with it.
const GATES: Gate[] = [
    {
        id: 'api-compatibility',
        name: 'API-compatibility check',
        when: 'Every build of every plugin, including every proposed change.',
        checks: 'Every Bukkit class, field and method the plugin uses must exist on each Minecraft version the plugin supports, ' +
            'and the plugin must be compiled for a Java those versions run on. This is what would have caught a plugin ' +
            'that worked on the newest Minecraft but failed to start on an older one.',
    },
    {
        id: 'boot',
        name: 'Boot gate',
        when: 'Every release, once per supported Minecraft version.',
        checks: 'The exact jar that will be published is put on a fresh server of that version. It must enable cleanly, ' +
            'answer help for every command it declares, stop cleanly, and start a second time on the data it wrote.',
    },
    {
        id: 'save-compatibility',
        name: 'Save-compatibility gate',
        when: 'Every release of a plugin that keeps data, once per storage backend it supports.',
        checks: 'The current release writes data first, sometimes an anonymised copy of a real community server, with ' +
            'bot players adding more. The new release then loads that data through several restarts, and every count ' +
            '(players, factions, claims and so on) must match. Where a plugin can move data between storage types, ' +
            'the move is tested both ways.',
    },
    {
        id: 'dependents',
        name: 'Dependents gate',
        when: 'Every release of a plugin that other plugins build on, such as Medieval Factions.',
        checks: 'The current release of every plugin that depends on it must still start against the new one. A plugin ' +
            'that was already broken is reported, not blamed on the release being checked.',
    },
];

const Releases: NextPage = () => (
    <Box sx={(theme) => pageStyle(theme)}>
        <Seo
            title="How releases work"
            description="Every stable release of Dan's Plugins is started on real Minecraft servers and checked against the data its previous release wrote before it is published."
            path="/releases"
        />
        <TopBar/>
        <Container component="main" id="main" maxWidth="md" sx={(theme) => containerPaddingStyle(theme)}>
            <Typography variant="h3" component="h1" gutterBottom sx={(theme) => sectionHeaderStyle(theme)}>
                How releases work
            </Typography>
            <Typography variant="body1" gutterBottom>
                A stable release of one of our plugins is not published because someone decided it looked ready. It is
                published because it passed a set of automated checks, the <em>release gates</em>, on real Minecraft
                servers. The jar you download is the exact file that passed. If any check fails, nothing is published,
                and the failure is recorded in public on the plugin&apos;s issue tracker.
            </Typography>
            <Typography variant="body1" gutterBottom>
                Every plugin page on this site shows the checks its current release passed, under{' '}
                <strong>Verified before release</strong>, with a link to each run.
            </Typography>

            <Typography variant="h5" component="h2" sx={{mt: 4, mb: 1}}>Two channels</Typography>
            <Stack spacing={1.5}>
                <Typography variant="body1">
                    <strong>Stable</strong> is what this site, SpigotMC, and{' '}
                    <span style={{fontFamily: 'monospace'}}>/dpm get</span> give you. Stable releases are made only
                    through the gates.
                </Typography>
                <Typography variant="body1">
                    <strong>Dev</strong> is a pre-release rebuilt from every change, for anyone who wants to test what
                    is coming (<span style={{fontFamily: 'monospace'}}>/dpm get --experimental</span>). It has not been
                    through the release gates.
                </Typography>
            </Stack>

            <Typography variant="h5" component="h2" sx={{mt: 4, mb: 1}}>The gates</Typography>
            <Stack spacing={2}>
                {GATES.map((gate) => (
                    <Paper key={gate.id} id={gate.id} variant="outlined" sx={{p: 2}}>
                        <Typography variant="h6" component="h3">{gate.name}</Typography>
                        <Typography variant="body2" color="text.secondary" gutterBottom>{gate.when}</Typography>
                        <Typography variant="body1">{gate.checks}</Typography>
                    </Paper>
                ))}
            </Stack>

            <Typography variant="h5" component="h2" sx={{mt: 4, mb: 1}}>Supported Minecraft versions</Typography>
            <Typography variant="body1" gutterBottom>
                Each plugin lists the Minecraft versions it supports in a <span style={{fontFamily: 'monospace'}}>minecraft-versions.json</span>{' '}
                file in its repository, and the gates check every version on that list. Most plugins currently support
                1.19.4, 1.21.11 and 26.2.
            </Typography>

            <Typography variant="h5" component="h2" sx={{mt: 4, mb: 1}}>When something goes wrong</Typography>
            <Stack spacing={1.5}>
                <Typography variant="body1">
                    <strong>A failed check blocks the release.</strong> A check on saved data is never waived: losing a
                    server&apos;s data is the one thing a release must not do.
                </Typography>
                <Typography variant="body1">
                    <strong>A bad release can be pulled.</strong> If a problem is found after publication, the release is
                    withdrawn from the stable channel, and the previous one becomes what everyone gets again.
                </Typography>
            </Stack>

            <Typography variant="h5" component="h2" sx={{mt: 4, mb: 1}}>See for yourself</Typography>
            <Typography variant="body1" gutterBottom>
                The gates are open source, and every run is public:{' '}
                <Link href={RELEASE_GATES} target="_blank" rel="noopener noreferrer">release gates on GitHub</Link>.
                The rules for releases are written down in{' '}
                <Link href={RELEASE_CHANNELS} target="_blank" rel="noopener noreferrer">Release channels</Link>.
                Releases made before the gates existed carry no such record; their plugin pages show no verification.
            </Typography>
        </Container>
        <BottomBar version={version}/>
    </Box>
);

export default Releases;
