import React from 'react';
import { Button, Card, CardActions, CardContent, Link, Typography } from '@mui/material';
import {
    pluginCardStyle,
    pluginCardContentStyle,
    pluginCardActionsStyle,
    pluginCardButtonStyle,
    pluginCardTitleStyle,
    pluginCardDescriptionStyle,
    pluginCardServerCountStyle,
} from '../styles/styles';

interface PluginCardProps {
    title: string;
    description: string;
    githubLink: string;
    spigotmcLink?: string;
    bStatsId?: string;
    serverCount?: number;
}

const PluginCard: React.FC<PluginCardProps> = ({ 
    title, 
    description, 
    githubLink, 
    spigotmcLink, 
    bStatsId, 
    serverCount 
}) => {
    return (
        <Card sx={pluginCardStyle}>
            <CardContent sx={pluginCardContentStyle}>
                <Typography {...pluginCardTitleStyle} component="div" variant="h5">{title}</Typography>
                <Typography {...pluginCardDescriptionStyle} component="p" variant="body1">{description}</Typography>
                {serverCount && serverCount > 0 ? (
                    <Typography {...pluginCardServerCountStyle} component="span" variant="body2">
                        <br />
                        {serverCount} servers running
                    </Typography>
                ) : null}
            </CardContent>
            <CardActions sx={pluginCardActionsStyle}>
                <Button sx={(theme) => pluginCardButtonStyle()} component={Link} href={githubLink}>
                    GitHub
                </Button>
                {spigotmcLink ? (
                    <Button sx={(theme) => pluginCardButtonStyle()} component={Link} href={spigotmcLink}>
                        SpigotMC
                    </Button>
                ) : null}
            </CardActions>
        </Card>
    );
};

export default PluginCard;