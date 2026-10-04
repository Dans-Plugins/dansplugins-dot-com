import React from 'react';
import {Avatar} from '@mui/material';
import {CatalogueGrid} from '@kingdom-community/community-site-kit';
import PluginDetails, {type PluginDetailsProps} from './PluginDetails';
import {pluginsBoxStyle} from '../styles/styles';
import {colorForTitle} from '../utils/pluginAvatar';
import {resourcePath} from '../utils/resources';
import {trailerFor} from '../utils/pluginTrailers';

// The home page catalogue: one icon per plugin and nothing else. Everything the
// old cards carried — description, figures, actions — lives in a panel that
// opens under a tile on hover or keyboard focus, and clicking a tile goes to
// the plugin's page. A touch screen has no hover, so there a tap opens the same
// details in a bottom sheet instead, whose Details button goes on to the page.
// A plugin with a preview clip plays it in the desktop panel while the panel is
// open; the sheet shows no clip (a phone never autoplays a grid clip, and the
// sheet's buttons stay in view), and the clip plays on the plugin's page.
//
// The grid itself — tiles, panels, sheet, timings — is community-site-kit's
// CatalogueGrid, shared with preponderous.org and danielstephenson.dev; this
// file says what a plugin's icon and details look like.

export type IconGridPlugin = Omit<PluginDetailsProps, 'likeCount' | 'liked' | 'token' | 'onTagClick' | 'descriptionId' | 'titleId'>;

interface PluginIconGridProps {
    plugins: IconGridPlugin[];
    likeCounts: Record<string, number>;
    likedSet: Set<string>;
    token: string | null;
    onTagClick: (tag: string) => void;
    // Controls shown above the grid, inside its section (search and filters).
    toolbar?: React.ReactNode;
    // Shown in place of the grid when there are no plugins to lay out.
    empty?: React.ReactNode;
}

const PluginIcon: React.FC<{plugin: IconGridPlugin}> = ({plugin}) => (
    <Avatar
        variant="rounded"
        className="icon-tile-image"
        {...(plugin.icon ? {src: plugin.icon, alt: ''} : {})}
        // The tint is for the initial only; an icon carries its own background.
        sx={{
            width: '100%',
            height: '100%',
            borderRadius: 'inherit',
            bgcolor: plugin.icon ? 'transparent' : colorForTitle(plugin.title),
        }}
    >
        {plugin.title.charAt(0).toUpperCase()}
    </Avatar>
);

const PluginIconGrid: React.FC<PluginIconGridProps> = ({plugins, likeCounts, likedSet, token, onTagClick, toolbar, empty}) => (
    <CatalogueGrid
        items={plugins}
        heading="Plugins"
        sectionId="plugins"
        idPrefix="plugin"
        getHref={(plugin) => resourcePath(plugin.id)}
        // A Like keeps its state (and its sign-in notice) between openings,
        // and every tile stays described by its plugin's description.
        keepPanelsMounted
        renderIcon={(plugin) => <PluginIcon plugin={plugin}/>}
        renderDetails={(plugin, {titleId, descriptionId, inSheet, close}) => (
            <PluginDetails
                {...plugin}
                titleId={titleId}
                descriptionId={descriptionId}
                likeCount={likeCounts[plugin.id] || 0}
                liked={likedSet.has(plugin.id)}
                token={token}
                trailer={inSheet ? null : trailerFor(plugin.id)}
                // In the sheet, a tag filters the grid behind it, so get the
                // sheet out of the way of the result first.
                onTagClick={inSheet ? (tag) => {
                    close();
                    onTagClick(tag);
                } : onTagClick}
            />
        )}
        toolbar={toolbar}
        empty={empty}
        sx={pluginsBoxStyle}
    />
);

export default PluginIconGrid;
