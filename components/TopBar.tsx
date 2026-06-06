import {AppBar, Box, Button, Toolbar, Typography, useTheme} from '@mui/material';
import React, {useContext} from 'react';
import {ColorModeToggleSwitch} from './ColorModeToggleSwitch';
import {ColorModeContext} from '../utils/ColorModeContext';

import {
    appBarStyle,
    navButtonStyle,
    brandNameStyle,
    toolbarStyle,
    toggleSwitchBoxStyle,
    flexContainerStyle
} from '../styles/styles';

const NavButton: React.FC<{ href: string; children: React.ReactNode }> = ({href, children}) => (
    <Button
        color="inherit"
        href={href}
        sx={(theme) => navButtonStyle(theme)}
    >
        {children}
    </Button>
);

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

    return (
        <AppBar
            position="static"
            sx={(theme) => appBarStyle(theme)}
        >
            <Toolbar sx={(theme) => toolbarStyle(theme)}>
                <Box sx={(theme) => flexContainerStyle(theme, {flexWrap: 'wrap'})}>
                    <BrandName/>

                    <Box sx={(theme) => flexContainerStyle(theme, {gap: 1})}>
                        <NavButton href="/">Home</NavButton>
                        <NavButton href="/guides">Guides</NavButton>
                        <NavButton href="/leaderboard">Leaderboard</NavButton>
                        <NavButton href="/about">About</NavButton>
                        <NavButton href="/roadmap">Road Map</NavButton>
                        <NavButton href="/commissions">Commissions</NavButton>
                        <NavButton href="/account">Account</NavButton>
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
                    />
                </Box>
            </Toolbar>
        </AppBar>
    );
}

export default TopBar;