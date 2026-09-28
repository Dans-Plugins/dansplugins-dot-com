import React from 'react';
import {Avatar, Box, Link, Paper, Popper} from '@mui/material';
import PluginDetails, {type PluginDetailsProps} from './PluginDetails';
import {NextLinkComposed} from './NextLinkComposed';
import {iconGridStyle, iconTileStyle, pluginDetailsPanelStyle} from '../styles/styles';
import {colorForTitle} from '../utils/pluginAvatar';
import {resourcePath} from '../utils/resources';

// The home page catalogue: one icon per plugin and nothing else. Everything the
// old cards carried — description, figures, actions — lives in a panel that
// opens under a tile on hover or keyboard focus. Clicking a tile goes to the
// plugin's page, which is also what a tap does on a touch screen, where there
// is no hover to open the panel.

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

interface IconTileProps {
    plugin: IconGridPlugin;
    open: boolean;
    onPointerEnter: () => void;
    onPointerLeave: () => void;
    onOpenNow: () => void;
    onClose: () => void;
    details: React.ReactNode;
}

const IconTile: React.FC<IconTileProps> = ({plugin, open, onPointerEnter, onPointerLeave, onOpenNow, onClose, details}) => {
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
            onMouseEnter={onPointerEnter}
            onMouseLeave={onPointerLeave}
            onFocus={() => {
                if (!returningFocus.current) {
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
        </Box>
    );
};

export default PluginIconGrid;
