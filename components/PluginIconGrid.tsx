import React from 'react';
import {Avatar, Box, IconButton, Link, Paper, Popper, SwipeableDrawer, useMediaQuery} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PluginDetails, {type PluginDetailsProps} from './PluginDetails';
import {NextLinkComposed} from './NextLinkComposed';
import {
    iconGridStyle,
    iconTileStyle,
    pluginDetailsPanelStyle,
    pluginDetailsSheetStyle,
    sheetHandleStyle,
} from '../styles/styles';
import {colorForTitle} from '../utils/pluginAvatar';
import {resourcePath} from '../utils/resources';

// The home page catalogue: one icon per plugin and nothing else. Everything the
// old cards carried — description, figures, actions — lives in a panel that
// opens under a tile on hover or keyboard focus, and clicking a tile goes to
// the plugin's page. A touch screen has no hover, so there a tap opens the same
// details in a bottom sheet instead, whose Details button goes on to the page.

export type IconGridPlugin = Omit<PluginDetailsProps, 'likeCount' | 'liked' | 'token' | 'onTagClick' | 'descriptionId'>;

interface PluginIconGridProps {
    plugins: IconGridPlugin[];
    likeCounts: Record<string, number>;
    likedSet: Set<string>;
    token: string | null;
    onTagClick: (tag: string) => void;
}

// MUI 5.8's Popper typings predate @types/react 18.3, which added three DOM
// props that they then mark required; this alias drops them again.
const PanelPopper = Popper as unknown as React.FC<
    Omit<React.ComponentProps<typeof Popper>, 'placeholder' | 'onPointerEnterCapture' | 'onPointerLeaveCapture'>
>;

// Short enough to feel immediate, long enough that sweeping the pointer across
// the grid does not flash a panel under every icon it passes.
export const OPEN_DELAY_MS = 120;
// Grace period for the pointer to cross the gap between a tile and its panel.
export const CLOSE_DELAY_MS = 150;

// A device whose only pointer cannot hover: a phone or tablet. False during
// server rendering, so the page is rendered for a desktop first.
export const TOUCH_ONLY_QUERY = '(hover: none)';

interface IconTileProps {
    plugin: IconGridPlugin;
    open: boolean;
    onPointerEnter: () => void;
    onPointerLeave: () => void;
    onOpenNow: () => void;
    onClose: () => void;
    // Set on a touch screen: the tile opens the bottom sheet instead of
    // following its link, and hover and focus open nothing.
    onTap?: (tile: HTMLAnchorElement) => void;
    details: React.ReactNode;
}

const IconTile: React.FC<IconTileProps> = ({plugin, open, onPointerEnter, onPointerLeave, onOpenNow, onClose, onTap, details}) => {
    const wrapperRef = React.useRef<HTMLDivElement>(null);
    const tileRef = React.useRef<HTMLAnchorElement | null>(null);
    // The Popper's anchor is kept in state as well as the ref: it is mounted
    // (keepMounted) on the first render, before a ref would be set.
    const [anchor, setAnchor] = React.useState<HTMLAnchorElement | null>(null);
    const setTile = React.useCallback((node: HTMLAnchorElement | null) => {
        tileRef.current = node;
        setAnchor(node);
    }, []);
    // Set while Escape hands focus back to the tile, so that focus does not
    // reopen the panel it just closed.
    const returningFocus = React.useRef(false);
    const panelId = `plugin-panel-${plugin.id}`;
    const descriptionId = `plugin-description-${plugin.id}`;

    return (
        <Box
            ref={wrapperRef}
            onMouseEnter={onTap ? undefined : onPointerEnter}
            onMouseLeave={onTap ? undefined : onPointerLeave}
            onFocus={() => {
                if (!onTap && !returningFocus.current) {
                    onOpenNow();
                }
            }}
            onBlur={(e: React.FocusEvent) => {
                const next = e.relatedTarget as Node | null;
                if (!next || !wrapperRef.current?.contains(next)) {
                    onClose();
                }
            }}
            onKeyDown={(e: React.KeyboardEvent) => {
                if (e.key === 'Escape' && open) {
                    e.stopPropagation();
                    onClose();
                    returningFocus.current = true;
                    tileRef.current?.focus();
                    returningFocus.current = false;
                }
            }}
            sx={{minWidth: 0}}
        >
            <Link
                ref={setTile}
                component={NextLinkComposed}
                to={resourcePath(plugin.id)}
                underline="none"
                aria-describedby={descriptionId}
                // The href stays for crawlers and for a page without script;
                // with it, a tap shows the details where the pointer is.
                onClick={onTap ? (e: React.MouseEvent<HTMLAnchorElement>) => {
                    e.preventDefault();
                    onTap(e.currentTarget);
                } : undefined}
                sx={iconTileStyle}
                data-testid="plugin-tile"
            >
                <Avatar
                    variant="rounded"
                    className="icon-tile-image"
                    {...(plugin.icon ? {src: plugin.icon, alt: ''} : {'aria-hidden': true})}
                    // The tint is for the initial only; an icon carries its own background.
                    sx={{bgcolor: plugin.icon ? 'transparent' : colorForTitle(plugin.title)}}
                >
                    {plugin.title.charAt(0).toUpperCase()}
                </Avatar>
                <Box component="span" className="icon-tile-caption">{plugin.title}</Box>
            </Link>
            {/* disablePortal keeps the panel in DOM order straight after its
                tile, so Tab moves from the icon into the panel's actions, and
                the pointer moving onto the panel is still inside the wrapper.
                keepMounted keeps a Like's state (and its sign-in notice) alive
                between openings; a closed panel is display:none, so it is out
                of the accessibility tree while its description still serves
                the tile's aria-describedby. */}
            <PanelPopper
                id={panelId}
                open={open}
                anchorEl={anchor}
                placement="bottom"
                disablePortal
                keepMounted
                modifiers={[
                    {name: 'flip', enabled: true},
                    {name: 'preventOverflow', options: {padding: 16}},
                    {name: 'offset', options: {offset: [0, 8]}},
                ]}
                sx={{zIndex: (theme) => theme.zIndex.tooltip}}
                data-testid="plugin-panel"
            >
                <Paper elevation={8} sx={pluginDetailsPanelStyle}>
                    {details}
                </Paper>
            </PanelPopper>
        </Box>
    );
};

const PluginIconGrid: React.FC<PluginIconGridProps> = ({plugins, likeCounts, likedSet, token, onTagClick}) => {
    // One panel at a time: the open plugin's id, or null.
    const [openId, setOpenId] = React.useState<string | null>(null);
    const touchOnly = useMediaQuery(TOUCH_ONLY_QUERY);
    // The plugin shown in the touch screen's bottom sheet, and the tile that
    // opened it, which gets focus back when the sheet closes.
    const [sheetId, setSheetId] = React.useState<string | null>(null);
    const sheetTile = React.useRef<HTMLAnchorElement | null>(null);
    const sheetPlugin = plugins.find((plugin) => plugin.id === sheetId) ?? null;
    // Kept after the sheet closes, so it slides away with its content in it.
    const shownPlugin = React.useRef<IconGridPlugin | null>(null);
    if (sheetPlugin) {
        shownPlugin.current = sheetPlugin;
    }
    const sheetContent = shownPlugin.current;
    const closeSheet = () => setSheetId(null);
    const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    const clearTimer = () => {
        if (timer.current) {
            clearTimeout(timer.current);
            timer.current = null;
        }
    };
    React.useEffect(() => clearTimer, []);

    const openLater = (id: string) => {
        clearTimer();
        timer.current = setTimeout(() => setOpenId(id), OPEN_DELAY_MS);
    };
    const closeLater = (id: string) => {
        clearTimer();
        timer.current = setTimeout(() => setOpenId((current) => (current === id ? null : current)), CLOSE_DELAY_MS);
    };
    const openNow = (id: string) => {
        clearTimer();
        setOpenId(id);
    };
    const close = (id: string) => {
        clearTimer();
        setOpenId((current) => (current === id ? null : current));
    };

    return (
        <Box sx={iconGridStyle} data-testid="plugin-grid">
            {plugins.map((plugin) => (
                <IconTile
                    key={plugin.id}
                    plugin={plugin}
                    open={openId === plugin.id}
                    onPointerEnter={() => openLater(plugin.id)}
                    onPointerLeave={() => closeLater(plugin.id)}
                    onOpenNow={() => openNow(plugin.id)}
                    onClose={() => close(plugin.id)}
                    onTap={touchOnly ? (tile) => {
                        sheetTile.current = tile;
                        setSheetId(plugin.id);
                    } : undefined}
                    details={
                        <PluginDetails
                            {...plugin}
                            descriptionId={`plugin-description-${plugin.id}`}
                            likeCount={likeCounts[plugin.id] || 0}
                            liked={likedSet.has(plugin.id)}
                            token={token}
                            onTagClick={onTagClick}
                        />
                    }
                />
            ))}
            <SwipeableDrawer
                anchor="bottom"
                open={sheetPlugin !== null}
                onClose={closeSheet}
                // Opened by a tap on a tile only, never by a swipe up from
                // the bottom edge, which the browser uses for itself.
                onOpen={() => undefined}
                disableSwipeToOpen
                disableRestoreFocus
                SlideProps={{onExited: () => sheetTile.current?.focus()}}
                PaperProps={{
                    role: 'dialog',
                    'aria-modal': true,
                    'aria-labelledby': 'plugin-sheet-title',
                    sx: pluginDetailsSheetStyle,
                    'data-testid': 'plugin-sheet',
                } as React.ComponentProps<typeof Paper>}
            >
                <Box sx={sheetHandleStyle} aria-hidden/>
                <IconButton
                    aria-label="Close"
                    onClick={closeSheet}
                    size="small"
                    sx={{position: 'absolute', top: 8, right: 8}}
                >
                    <CloseIcon fontSize="small"/>
                </IconButton>
                {sheetContent ? (
                    <PluginDetails
                        {...sheetContent}
                        titleId="plugin-sheet-title"
                        likeCount={likeCounts[sheetContent.id] || 0}
                        liked={likedSet.has(sheetContent.id)}
                        token={token}
                        // A tag filters the grid behind the sheet, so get the
                        // sheet out of the way of the result.
                        onTagClick={(tag) => {
                            closeSheet();
                            onTagClick(tag);
                        }}
                    />
                ) : null}
            </SwipeableDrawer>
        </Box>
    );
};

export default PluginIconGrid;
