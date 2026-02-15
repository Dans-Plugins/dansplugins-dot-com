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

async function getServerCount(bStatsId: string) {
    const functionName = 'getServerCount()';
    const response = await fetch(
        'https://bstats.org/api/v1/plugins/' + bStatsId + '/charts/servers/data?maxElements=1'
    );
    const data = await response.json();
    if (!Array.isArray(data)) {
        console.log(functionName + ' returned data that is not an array');
        return;
    }
    if (data.length < 1) {
        console.log(functionName + ' returned data that has less than one element');
        return;
    }
    const firstElement = data[0];
    if (!Array.isArray(firstElement)) {
        console.log(functionName + ' returned data that has a first element that is not an array');
        return;
    }
    if (firstElement.length < 2) {
        console.log(functionName + ' returned data that has a first element that has less than 2 elements');
        return;
    }
    const secondElementOfFirstElement = firstElement[1];
    if (typeof secondElementOfFirstElement !== 'number') {
        console.log(functionName + ' returned data that has a first element that has a second element that is not a number');
        return;
    }
    return secondElementOfFirstElement;
}

const PluginCard: React.FC<PluginCardProps> = ({ title, description, githubLink, spigotmcLink, bStatsId, serverCount: initialServerCount }) => {
    const [serverCount, setServerCount] = React.useState<number | undefined>(initialServerCount);

    React.useEffect(() => {
        // Only fetch if we don't have a serverCount prop and we have a bStatsId
        if (initialServerCount === undefined && bStatsId) {
            const fetchServerCount = async () => {
                const count = await getServerCount(bStatsId);
                setServerCount(count);
            };
            fetchServerCount();
        } else {
            setServerCount(initialServerCount);
        }
    }, [bStatsId, initialServerCount]);

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