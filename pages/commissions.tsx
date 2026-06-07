import {
    Box,
    Button,
    Chip,
    Container,
    List,
    ListItem,
    ListItemText,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography
} from '@mui/material';
import type {NextPage} from 'next';
import TopBar from '../components/TopBar';
import React from 'react';
import BottomBar from '../components/BottomBar';

// Import styles
import {pageStyle, sectionHeaderStyle, pluginsBoxStyle, containerPaddingStyle} from '../styles/styles';

// Pull version from package.json
const version = require('../package.json').version;

interface CommissionTier {
    name: string;
    description: string;
    oneTime: string;
    retainer: string;
    adHoc: string;
}

interface CommissionsData {
    availability: 'open' | 'closed';
    discordInvite: string;
    tiers: CommissionTier[];
    included: string[];
}

const commissionsData = require('./data/commissions.json') as CommissionsData;

const Commissions: NextPage = () => {
    const isOpen = commissionsData.availability === 'open';

    return (
        <Box sx={(theme) => pageStyle(theme)}>
            <TopBar/>
            <Container maxWidth="xl" sx={(theme) => containerPaddingStyle(theme)}>
                <Box sx={{display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap'}}>
                    <Typography variant="h3" gutterBottom sx={(theme) => sectionHeaderStyle(theme)}>
                        Commissions
                    </Typography>
                    <Chip
                        label={isOpen ? 'Open for commissions' : 'Currently closed'}
                        color={isOpen ? 'success' : 'default'}
                    />
                </Box>
                <Typography variant="body1" gutterBottom>
                    Custom Minecraft plugin development by the creator of the Dan&apos;s Plugins Community
                    catalogue. Whether you need an existing plugin fixed and extended or a brand-new plugin
                    built to your specification, the pricing options below cover one-time projects, monthly
                    retainers, and ad-hoc hourly work.
                </Typography>

                <TableContainer component={Paper} sx={{mt: 3, mb: 3}}>
                    <Table aria-label="commission pricing">
                        <TableHead>
                            <TableRow>
                                <TableCell>Service</TableCell>
                                <TableCell>One-time</TableCell>
                                <TableCell>Monthly retainer</TableCell>
                                <TableCell>Ad hoc</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {commissionsData.tiers.map((tier) => (
                                <TableRow key={tier.name}>
                                    <TableCell>
                                        <Typography variant="subtitle1">{tier.name}</Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            {tier.description}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>{tier.oneTime}</TableCell>
                                    <TableCell>{tier.retainer}</TableCell>
                                    <TableCell>{tier.adHoc}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>

                <Typography variant="h5" gutterBottom>What&apos;s included</Typography>
                <List dense>
                    {commissionsData.included.map((item) => (
                        <ListItem key={item} sx={{display: 'list-item', listStyleType: 'disc', ml: 3, py: 0}}>
                            <ListItemText primary={item}/>
                        </ListItem>
                    ))}
                </List>

                <Typography variant="body1" sx={{mt: 2}} gutterBottom>
                    To discuss a commission, join the commissions Discord server:
                </Typography>
                <Box sx={pluginsBoxStyle}>
                    <Button
                        variant="contained"
                        color="primary"
                        href={commissionsData.discordInvite}
                        target="_blank"
                        rel="noopener"
                    >
                        Join the Commissions Discord
                    </Button>
                </Box>
            </Container>
            <BottomBar version={version}/>
        </Box>
    );
};

export default Commissions;
