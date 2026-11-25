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
import {getStoredToken} from '../utils/session';

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

// Id of the phone drawer's panel, for the menu button's aria-controls.
const NAV_DRAWER_ID = 'nav-drawer';

interface NavLink {
    href: string;
    label: string;
}

// In-site destinations shown as top-level links in the desktop bar. "Account"
// is handled separately since its label depends on sign-in state.
const INLINE_LINKS: NavLink[] = [
    {href: '/', label: 'Home'},
    {href: '/news', label: 'News'},
    {href: '/guides', label: 'Guides'},
    {href: '/leaderboard', label: 'Leaderboard'},
    {href: '/about', label: 'About'},
];

// In-site destinations visited less often. In the desktop bar they sit at the
// top of the Community menu, so the bar fits one row at 1200–1440px; with all
// eight inline it wrapped to three rows at 1280px.
const MENU_LINKS: NavLink[] = [
    {href: '/roadmap', label: 'Roadmap'},
    {href: '/commissions', label: 'Commissions'},
    {href: '/dev', label: 'Dev Portal'},
];

// Every in-site destination, in order, for the drawer.
const PRIMARY_LINKS: NavLink[] = [...INLINE_LINKS, ...MENU_LINKS];

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
        // A full-height tap target on touch screens, not just the text's line box.
        sx={(theme) => ({
            ...brandNameStyle(theme),
            // No gap after the wordmark until the inline nav sits beside it,
            // so the bar keeps one row at 360–390px.
            marginRight: {xs: 0, lg: 2},
            display: 'inline-flex',
            alignItems: 'center',
            '@media (pointer: coarse)': {minHeight: 44},
        })}
    >
        {/* Scaled down on phones so the wordmark, the dark-mode toggle and the
            menu button share one row instead of the bar wrapping to two. */}
        <Typography variant="h6" color="inherit" component="span" sx={{fontSize: {xs: '1.05rem', sm: '1.25rem'}, whiteSpace: 'nowrap'}}>
            Dan&apos;s Plugins Community
        </Typography>
    </Link>
);

// Desktop-only dropdown: the less-visited in-site pages, then the off-site
// community links, so the always-visible nav stays to five in-site
// destinations plus Account. The button is marked current while on one of
// the in-site pages it holds, so "you are here" still shows in the bar.
const CommunityMenu: React.FC<{pathname: string}> = ({pathname}) => {
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
    const holdsCurrentPage = MENU_LINKS.some((link) => isActiveNavLink(pathname, link.href));
    return (
        <>
            <Button
                color="inherit"
                id="community-menu-button"
                aria-haspopup="true"
                aria-controls={anchorEl ? 'community-menu' : undefined}
                aria-expanded={anchorEl ? 'true' : undefined}
                endIcon={<ExpandMoreIcon fontSize="small"/>}
                onClick={(event) => setAnchorEl(event.currentTarget)}
                sx={(theme) => ({
                    ...navButtonStyle(theme),
                    ...(holdsCurrentPage && {
                        fontWeight: 'bold',
                        textDecoration: 'underline',
                        textUnderlineOffset: '6px',
                    }),
                })}
            >
                Community
            </Button>
            <Menu
                id="community-menu"
                anchorEl={anchorEl}
                open={!!anchorEl}
                onClose={() => setAnchorEl(null)}
                MenuListProps={{'aria-labelledby': 'community-menu-button'}}
            >
                {MENU_LINKS.map((link) => (
                    <MenuItem
                        key={link.href}
                        component={NextLinkComposed}
                        to={link.href}
                        selected={isActiveNavLink(pathname, link.href)}
                        aria-current={isActiveNavLink(pathname, link.href) ? 'page' : undefined}
                        onClick={() => setAnchorEl(null)}
                    >
                        {link.label}
                    </MenuItem>
                ))}
                <Divider/>
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

// Below the `lg` breakpoint (1200px) the inline nav is replaced by a hamburger
// button that opens this drawer, the conventional mobile navigation pattern.
// A tablet or small laptop gets the drawer too: the wordmark, six links and
// the menu need about 1150px on one row.
const NavDrawer: React.FC<{
    open: boolean;
    onClose: () => void;
    pathname: string;
    accountLabel: string;
}> = ({open, onClose, pathname, accountLabel}) => (
    <Drawer
        anchor="right"
        open={open}
        onClose={onClose}
        // MUI's modal Drawer traps focus like a dialog but does not say so;
        // naming the panel as one tells assistive technology what opened.
        PaperProps={{id: NAV_DRAWER_ID, role: 'dialog', 'aria-label': 'Navigation menu', sx: (theme) => navDrawerPaperStyle(theme)}}
    >
        <List component="nav" aria-label="Site" sx={{width: 260}} onClick={onClose}>
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
        // Display only: the stored token as it is. Pages that send it go
        // through getSessionToken(), which renews it first.
        const token = getStoredToken();
        setSignedIn(!!token);
        setUsername(usernameFromToken(token));
    }, []);
    const accountLabel = signedIn === false ? 'Sign in' : (username ?? 'Account');

    return (
        <AppBar
            position="static"
            sx={(theme) => appBarStyle(theme)}
        >
            {/* One row at every width: the drawer takes over before the inline
                nav would need to wrap. */}
            <Toolbar sx={(theme) => ({...toolbarStyle(theme), flexWrap: 'nowrap'})}>
                <Box sx={(theme) => ({...flexContainerStyle(theme, {flexWrap: 'nowrap'}), minWidth: 0})}>
                    <BrandName/>

                    {/* Desktop: inline nav, hidden below the `lg` breakpoint. */}
                    <Box component="nav" aria-label="Site" sx={(theme) => ({...flexContainerStyle(theme, {gap: 1, flexWrap: 'nowrap'}), display: {xs: 'none', lg: 'flex'}})}>
                        {INLINE_LINKS.map((link) => (
                            <NavButton key={link.href} href={link.href} active={isActiveNavLink(pathname, link.href)}>
                                {link.label}
                            </NavButton>
                        ))}
                        <NavButton href="/account" active={isActiveNavLink(pathname, '/account')}>{accountLabel}</NavButton>
                        <CommunityMenu pathname={pathname}/>
                    </Box>
                </Box>

                <Box sx={(theme) => ({...flexContainerStyle(theme, {gap: 1}), flexShrink: 0, flexWrap: 'nowrap'})}>
                    <Box sx={toggleSwitchBoxStyle}>
                        <ColorModeToggleSwitch
                            checked={theme.palette.mode === 'dark'}
                            onChange={colorMode.toggleColorMode}
                            // role="switch": announced as an on/off control, not a checkbox.
                            inputProps={{'aria-label': 'Toggle dark mode', role: 'switch'}}
                        />
                    </Box>

                    {/* Below `lg`: hamburger button, hidden at `lg` and above. */}
                    <IconButton
                        color="inherit"
                        aria-label="Open navigation menu"
                        aria-haspopup="dialog"
                        aria-expanded={drawerOpen ? 'true' : 'false'}
                        // The drawer is only mounted while open, so point at it
                        // only then rather than at an id that is not there.
                        aria-controls={drawerOpen ? NAV_DRAWER_ID : undefined}
                        onClick={() => setDrawerOpen(true)}
                        sx={{display: {xs: 'inline-flex', lg: 'none'}}}
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
