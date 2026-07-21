import {
    AppBar,
    Box,
    Button,
    Divider,
    Drawer,
    IconButton,
    Link,
    List,
    ListItemButton,
    ListItemText,
    Menu,
    MenuItem,
    Toolbar,
    Typography,
    useTheme
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import {useRouter} from 'next/router';
import React, {useContext, useEffect, useState} from 'react';
import {ColorModeToggleSwitch} from './ColorModeToggleSwitch';
import {NextLinkComposed} from './NextLinkComposed';
import {ColorModeContext} from '../utils/ColorModeContext';
import {isActiveNavLink} from '../utils/nav';
import {usernameFromToken} from '../utils/authToken';

import {
    appBarStyle,
    navButtonStyle,
    brandNameStyle,
    toolbarStyle,
    toggleSwitchBoxStyle,
    flexContainerStyle,
    navDrawerPaperStyle,
    navDrawerSectionLabelStyle,
    navDrawerDividerStyle
} from '../styles/styles';

interface NavLink {
    href: string;
    label: string;
}

// In-site destinations shown as top-level links at all sizes. "Account" is
// handled separately since its label depends on sign-in state.
const PRIMARY_LINKS: NavLink[] = [
    {href: '/', label: 'Home'},
    {href: '/news', label: 'News'},
    {href: '/guides', label: 'Guides'},
    {href: '/leaderboard', label: 'Leaderboard'},
    {href: '/about', label: 'About'},
    {href: '/roadmap', label: 'Road Map'},
    {href: '/commissions', label: 'Commissions'},
    {href: '/dev', label: 'Dev Portal'},
];

// Off-site community links, grouped behind a "Community" menu/section rather
// than sitting inline with the primary nav so the top-level item count stays
// scannable at every screen size.
const COMMUNITY_LINKS: NavLink[] = [
    {href: 'https://discord.gg/xXtuAQ2', label: 'Discord'},
    {href: 'https://www.patreon.com/danspluginscommunity', label: 'Patreon'},
    {href: 'https://www.linkedin.com/company/dansplugins', label: 'LinkedIn'},
    {href: 'https://github.com/RP-Kit/RPKit', label: 'RPKit'},
];

// Internal routes navigate in the same tab; off-site links open in a new tab
// (with rel="noopener noreferrer") and carry an external-link icon so they are
// visually distinguishable from the in-site navigation they sit beside.
const NavButton: React.FC<{ href: string; active?: boolean; children: React.ReactNode }> = ({href, active = false, children}) => {
    const isExternal = href.startsWith('http');
    return (
        <Button
            color="inherit"
            {...(isExternal
                ? {href, target: '_blank', rel: 'noopener noreferrer'}
                : {component: NextLinkComposed, to: href})}
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
    // The wordmark links home — the near-universal "click the logo to return to
    // the home page" convention.
    <Link
        component={NextLinkComposed}
        to="/"
        underline="none"
        color="inherit"
        sx={(theme) => ({...brandNameStyle(theme), display: 'inline-block'})}
    >
        <Typography variant="h6" color="inherit" component="span">
            Dan&apos;s Plugins Community
        </Typography>
    </Link>
);

// Desktop-only dropdown for the community links, so the always-visible nav
// stays to eight in-site destinations plus Account.
const CommunityMenu: React.FC = () => {
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
    return (
        <>
            <Button
                color="inherit"
                endIcon={<ExpandMoreIcon fontSize="small"/>}
                onClick={(event) => setAnchorEl(event.currentTarget)}
                sx={(theme) => navButtonStyle(theme)}
            >
                Community
            </Button>
            <Menu anchorEl={anchorEl} open={!!anchorEl} onClose={() => setAnchorEl(null)}>
                {COMMUNITY_LINKS.map((link) => (
                    <MenuItem
                        key={link.href}
                        component="a"
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setAnchorEl(null)}
                    >
                        {link.label}
                        <OpenInNewIcon fontSize="small" sx={{marginLeft: 1}}/>
                    </MenuItem>
                ))}
            </Menu>
        </>
    );
};

// Below the `md` breakpoint the inline nav is replaced by a hamburger button
// that opens this drawer, the conventional mobile navigation pattern.
const NavDrawer: React.FC<{
    open: boolean;
    onClose: () => void;
    pathname: string;
    accountLabel: string;
}> = ({open, onClose, pathname, accountLabel}) => (
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{sx: (theme) => navDrawerPaperStyle(theme)}}>
        <List sx={{width: 260}} onClick={onClose}>
            {PRIMARY_LINKS.map((link) => (
                <ListItemButton
                    key={link.href}
                    component={NextLinkComposed}
                    to={link.href}
                    selected={isActiveNavLink(pathname, link.href)}
                >
                    <ListItemText primary={link.label}/>
                </ListItemButton>
            ))}
            <ListItemButton component={NextLinkComposed} to="/account" selected={isActiveNavLink(pathname, '/account')}>
                <ListItemText primary={accountLabel}/>
            </ListItemButton>
            <Divider sx={navDrawerDividerStyle}/>
            <Typography variant="overline" sx={(theme) => navDrawerSectionLabelStyle(theme)} component="div">
                Community
            </Typography>
            {COMMUNITY_LINKS.map((link) => (
                <ListItemButton key={link.href} component="a" href={link.href} target="_blank" rel="noopener noreferrer">
                    <ListItemText primary={link.label}/>
                    <OpenInNewIcon fontSize="small"/>
                </ListItemButton>
            ))}
        </List>
    </Drawer>
);

const TopBar: React.FC = () => {
    const colorMode = useContext(ColorModeContext);
    const theme = useTheme();
    const {pathname} = useRouter();
    const [drawerOpen, setDrawerOpen] = useState(false);

    // Reflect the signed-in state in the nav. Read on the client only (after
    // mount) so the server-rendered markup and the first client paint match —
    // until then we show the neutral "Account" default (no hydration mismatch).
    const [signedIn, setSignedIn] = useState<boolean | null>(null);
    const [username, setUsername] = useState<string | null>(null);
    useEffect(() => {
        const token = window.localStorage.getItem('dpc-token');
        setSignedIn(!!token);
        setUsername(usernameFromToken(token));
    }, []);
    const accountLabel = signedIn === false ? 'Sign in' : (username ?? 'Account');

    return (
        <AppBar
            position="static"
            sx={(theme) => appBarStyle(theme)}
        >
            <Toolbar sx={(theme) => toolbarStyle(theme)}>
                <Box sx={(theme) => flexContainerStyle(theme, {flexWrap: 'wrap'})}>
                    <BrandName/>

                    {/* Desktop / tablet: inline nav, hidden below the `md` breakpoint. */}
                    <Box sx={(theme) => ({...flexContainerStyle(theme, {gap: 1}), display: {xs: 'none', md: 'flex'}})}>
                        {PRIMARY_LINKS.map((link) => (
                            <NavButton key={link.href} href={link.href} active={isActiveNavLink(pathname, link.href)}>
                                {link.label}
                            </NavButton>
                        ))}
                        <NavButton href="/account" active={isActiveNavLink(pathname, '/account')}>{accountLabel}</NavButton>
                        <CommunityMenu/>
                    </Box>
                </Box>

                <Box sx={(theme) => flexContainerStyle(theme, {gap: 1})}>
                    <Box sx={toggleSwitchBoxStyle}>
                        <ColorModeToggleSwitch
                            checked={theme.palette.mode === 'dark'}
                            onChange={colorMode.toggleColorMode}
                            inputProps={{'aria-label': 'Toggle dark mode'}}
                        />
                    </Box>

                    {/* Mobile: hamburger button, hidden at `md` and above. */}
                    <IconButton
                        color="inherit"
                        aria-label="Open navigation menu"
                        onClick={() => setDrawerOpen(true)}
                        sx={{display: {xs: 'inline-flex', md: 'none'}}}
                    >
                        <MenuIcon/>
                    </IconButton>
                </Box>
            </Toolbar>

            <NavDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} pathname={pathname} accountLabel={accountLabel}/>
        </AppBar>
    );
}

export default TopBar;
