import {
    Box,
    Button,
    Chip,
    Container,
    List,
    ListItem,
    ListItemIcon,
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
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import type {NextPage} from 'next';
import TopBar from '../components/TopBar';
import Seo from '../components/Seo';
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
            <Seo title="Commissions" description="Custom Minecraft plugin development by the creator of Dan's Plugins Community — pricing and availability."/>
            <TopBar/>
            <Container component="main" id="main" maxWidth="lg" sx={(theme) => containerPaddingStyle(theme)}>
                <Box sx={{display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap'}}>
                    <Typography variant="h3" component="h1" gutterBottom sx={(theme) => sectionHeaderStyle(theme)}>
                        Commissions
                    </Typography>
                    <Chip
                        label={isOpen ? 'Open for commissions' : 'Currently closed'}
                        color={isOpen ? 'success' : 'default'}
                        variant={isOpen ? 'filled' : 'outlined'}
                    />
                </Box>
                <Typography variant="body1" color="text.secondary" sx={{mb: 3, maxWidth: 760}}>
                    Custom Minecraft plugin development by the creator of the Dan&apos;s Plugins Community
                    catalogue. Whether you need an existing plugin fixed and extended or a brand-new plugin
                    built to your specification, the pricing options below cover one-time projects, monthly
                    retainers, and ad-hoc hourly work.
                </Typography>

                {/* Phones: one card per service with its three prices listed, since a
                    four-column price table at 360px pushes "Ad hoc" off-screen. The
                    table and the cards are switched by CSS so the page stays static. */}
                <Box sx={{display: {xs: 'flex', sm: 'none'}, flexDirection: 'column', gap: 2, mt: 3, mb: 4}}>
                    {commissionsData.tiers.map((tier) => (
                        <Paper key={tier.name} component="section" aria-label={`${tier.name} pricing`} sx={{p: 2}}>
                            <Typography variant="subtitle1" component="p" fontWeight={600}>{tier.name}</Typography>
                            <Typography variant="body2" color="text.secondary" sx={{mb: 1.5}}>
                                {tier.description}
                            </Typography>
                            <Box component="dl" sx={{display: 'grid', gridTemplateColumns: 'auto 1fr', columnGap: 2, rowGap: 0.75, m: 0}}>
                                {[['One-time', tier.oneTime], ['Monthly retainer', tier.retainer], ['Ad hoc', tier.adHoc]].map(([label, price]) => (
                                    <React.Fragment key={label}>
                                        <Typography component="dt" variant="body2" color="text.secondary">{label}</Typography>
                                        <Typography component="dd" variant="body2" fontWeight={600} sx={{m: 0, textAlign: 'right'}}>{price}</Typography>
                                    </React.Fragment>
                                ))}
                            </Box>
                        </Paper>
                    ))}
                </Box>

                <TableContainer component={Paper} sx={{mt: 3, mb: 4, display: {xs: 'none', sm: 'block'}}}>
                    <Table aria-label="commission pricing">
                        <TableHead>
                            <TableRow
                                sx={{
                                    '& th': {
                                        bgcolor: 'action.hover',
                                        borderBottom: 2,
                                        borderColor: 'divider',
                                        fontWeight: 600,
                                        fontSize: '0.72rem',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.07em',
                                        color: 'text.secondary',
                                    },
                                }}
                            >
                                <TableCell>Service</TableCell>
                                <TableCell align="right">One-time</TableCell>
                                <TableCell align="right">Monthly retainer</TableCell>
                                <TableCell align="right">Ad hoc</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {commissionsData.tiers.map((tier) => (
                                <TableRow key={tier.name} sx={{'&:hover': {bgcolor: 'action.hover'}}}>
                                    <TableCell component="th" scope="row">
                                        <Typography variant="subtitle1" component="div" fontWeight={600}>{tier.name}</Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            {tier.description}
                                        </Typography>
                                    </TableCell>
                                    <TableCell align="right">{tier.oneTime}</TableCell>
                                    <TableCell align="right">{tier.retainer}</TableCell>
                                    <TableCell align="right">{tier.adHoc}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>

                <Typography variant="h5" component="h2" gutterBottom>What&apos;s included</Typography>
                <List>
                    {commissionsData.included.map((item) => (
                        <ListItem key={item} disableGutters sx={{py: 0.25}}>
                            <ListItemIcon sx={{minWidth: 36}}>
                                <CheckCircleOutlineIcon color="primary" fontSize="small"/>
                            </ListItemIcon>
                            <ListItemText primary={item}/>
                        </ListItem>
                    ))}
                </List>

                <Typography variant="body1" color="text.secondary" sx={{mt: 3}} gutterBottom>
                    To discuss a commission, join the commissions Discord server:
                </Typography>
                <Box sx={pluginsBoxStyle}>
                    <Button
                        variant="contained"
                        color="primary"
                        size="large"
                        href={commissionsData.discordInvite}
                        target="_blank"
                        rel="noopener noreferrer"
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
