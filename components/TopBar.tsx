import {AppBar, Box, Button, Toolbar, Typography, useTheme} from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import {useRouter} from 'next/router';
import React, {useContext} from 'react';
import {ColorModeToggleSwitch} from './ColorModeToggleSwitch';
import {ColorModeContext} from '../utils/ColorModeContext';
import {isActiveNavLink} from '../utils/nav';

import {
    appBarStyle,
    navButtonStyle,
    brandNameStyle,
    toolbarStyle,
    toggleSwitchBoxStyle,
    flexContainerStyle
} from '../styles/styles';

// Internal routes navigate in the same tab; off-site links open in a new tab
// (with rel="noopener noreferrer") and carry an external-link icon so they are
// visually distinguishable from the in-site navigation they sit beside.
const NavButton: React.FC<{ href: string; active?: boolean; children: React.ReactNode }> = ({href, active = false, children}) => {
    const isExternal = href.startsWith('http');
    return (
        <Button
            color="inherit"
            href={href}
            target={isExternal ? '_blank' : undefined}
            rel={isExternal ? 'noopener noreferrer' : undefined}
            endIcon={isExternal ? <OpenInNewIcon fontSize="small"/> : undefined}
            aria-current={active ? 'page' : undefined}
            sx={(theme) => ({
                ...navButtonStyle(theme),
                // "You are here": highlight the link for the current page so the
                // user can tell where they are within the site.
                ...(active && {
                    fontWeight: 'bold',
                    textDecoration: 'underline',
                    textUnderlineOffset: '6px',
                }),
            })}
        >
            {children}
        </Button>
    );
};

const BrandName: React.FC = () => (
    <Typography
        variant="h6"
        color="inherit"
        component="div"
        sx={(theme) => brandNameStyle(theme)}
    >
        Dan&apos;s Plugins Community
    </Typography>
);

const TopBar: React.FC = () => {
    const colorMode = useContext(ColorModeContext);
    const theme = useTheme();
    const {pathname} = useRouter();

    return (
        <AppBar
            position="static"
            sx={(theme) => appBarStyle(theme)}
        >
            <Toolbar sx={(theme) => toolbarStyle(theme)}>
                <Box sx={(theme) => flexContainerStyle(theme, {flexWrap: 'wrap'})}>
                    <BrandName/>

                    <Box sx={(theme) => flexContainerStyle(theme, {gap: 1})}>
                        <NavButton href="/" active={isActiveNavLink(pathname, '/')}>Home</NavButton>
                        <NavButton href="/news" active={isActiveNavLink(pathname, '/news')}>News</NavButton>
                        <NavButton href="/guides" active={isActiveNavLink(pathname, '/guides')}>Guides</NavButton>
                        <NavButton href="/leaderboard" active={isActiveNavLink(pathname, '/leaderboard')}>Leaderboard</NavButton>
                        <NavButton href="/about" active={isActiveNavLink(pathname, '/about')}>About</NavButton>
                        <NavButton href="/roadmap" active={isActiveNavLink(pathname, '/roadmap')}>Road Map</NavButton>
                        <NavButton href="/commissions" active={isActiveNavLink(pathname, '/commissions')}>Commissions</NavButton>
                        <NavButton href="/account" active={isActiveNavLink(pathname, '/account')}>Account</NavButton>
                        <NavButton href="https://discord.gg/xXtuAQ2">Discord</NavButton>
                        <NavButton href="https://www.patreon.com/danspluginscommunity">Patreon</NavButton>
                        <NavButton href="https://www.linkedin.com/company/dansplugins">LinkedIn</NavButton>
                        <NavButton href="https://github.com/RP-Kit/RPKit">RPKit</NavButton>
                    </Box>
                </Box>

                <Box sx={toggleSwitchBoxStyle}>
                    <ColorModeToggleSwitch
                        checked={theme.palette.mode === 'dark'}
                        onChange={colorMode.toggleColorMode}
                        inputProps={{'aria-label': 'Toggle dark mode'}}
                    />
                </Box>
            </Toolbar>
        </AppBar>
    );
}

export default TopBar;