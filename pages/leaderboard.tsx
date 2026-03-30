import {
    Alert,
    Box,
    Card,
    CardContent,
    Chip,
    Container,
    Skeleton,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
} from '@mui/material'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import GroupIcon from '@mui/icons-material/Group'
import type {NextPage} from 'next'
import React, {useCallback, useEffect, useState} from 'react'
import TopBar from '../components/TopBar'
import BottomBar from '../components/BottomBar'
import {pageStyle, sectionHeaderStyle, containerPaddingStyle} from '../styles/styles'

const version = require('../package.json').version

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:45345'

interface Faction {
    id: string
    name: string
    serverId: string
    memberCount: number
    description: string | null
    serverIp: string | null
    discordLink: string | null
    createdAt: string
    updatedAt: string
}

interface PagedResponse {
    content: Faction[]
    totalElements: number
    totalPages: number
    number: number
}

const MEDAL_COLORS: Record<number, string> = {
    0: '#FFD700', // Gold
    1: '#C0C0C0', // Silver
    2: '#CD7F32', // Bronze
}

const LeaderboardPage: NextPage = () => {
    const [factions, setFactions] = useState<Faction[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchFactions = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const res = await fetch(
                `${API_BASE}/api/v1/factions?sort=memberCount,desc&size=50`
            )
            if (res.ok) {
                const data: PagedResponse = await res.json()
                setFactions(data.content)
            } else {
                setError(`Failed to load factions (HTTP ${res.status}).`)
            }
        } catch {
            setError('Failed to connect to API. Is the server running?')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchFactions()
    }, [fetchFactions])

    return (
        <Box sx={(theme) => pageStyle(theme)}>
            <TopBar/>
            <Container maxWidth="md" sx={(theme) => containerPaddingStyle(theme)}>
                <Typography variant="h3" gutterBottom sx={(theme) => sectionHeaderStyle(theme)}>
                    Faction Leaderboard
                </Typography>
                <Typography variant="body1" gutterBottom color="text.secondary" sx={{mb: 3}}>
                    Factions ranked by number of members across all servers.
                </Typography>

                {error && (
                    <Alert severity="error" sx={{mb: 2}} onClose={() => setError(null)}>
                        {error}
                    </Alert>
                )}

                <Card>
                    <CardContent sx={{p: 0, '&:last-child': {pb: 0}}}>
                        <TableContainer>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{fontWeight: 'bold', width: 60}} align="center">
                                            Rank
                                        </TableCell>
                                        <TableCell sx={{fontWeight: 'bold'}}>Faction</TableCell>
                                        <TableCell sx={{fontWeight: 'bold'}}>Server</TableCell>
                                        <TableCell sx={{fontWeight: 'bold'}} align="right">
                                            <Box sx={{display: 'inline-flex', alignItems: 'center', gap: 0.5}}>
                                                <GroupIcon fontSize="small"/>
                                                Members
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {loading ? (
                                        Array.from({length: 5}).map((_, i) => (
                                            <TableRow key={i}>
                                                <TableCell align="center"><Skeleton width={30}/></TableCell>
                                                <TableCell><Skeleton width={120}/></TableCell>
                                                <TableCell><Skeleton width={100}/></TableCell>
                                                <TableCell align="right"><Skeleton width={40}/></TableCell>
                                            </TableRow>
                                        ))
                                    ) : factions.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} align="center" sx={{py: 4}}>
                                                <Typography color="text.secondary">
                                                    No factions have been synced yet. Once Minecraft servers
                                                    start posting faction data, they will appear here.
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        factions.map((faction, index) => (
                                            <TableRow
                                                key={faction.id}
                                                sx={{
                                                    '&:hover': {bgcolor: 'action.hover'},
                                                    ...(index < 3 && {
                                                        bgcolor: `${MEDAL_COLORS[index]}08`,
                                                    }),
                                                }}
                                            >
                                                <TableCell align="center">
                                                    {index < 3 ? (
                                                        <EmojiEventsIcon
                                                            sx={{color: MEDAL_COLORS[index], fontSize: 28}}
                                                        />
                                                    ) : (
                                                        <Typography color="text.secondary">
                                                            {index + 1}
                                                        </Typography>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <Typography fontWeight={index < 3 ? 'bold' : 'normal'}>
                                                        {faction.name}
                                                    </Typography>
                                                    {faction.description && (
                                                        <Typography variant="body2" color="text.secondary" noWrap
                                                                    sx={{maxWidth: 250}}>
                                                            {faction.description}
                                                        </Typography>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={faction.serverId}
                                                        size="small"
                                                        variant="outlined"
                                                    />
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Typography
                                                        fontWeight="bold"
                                                        color={index < 3 ? 'primary' : 'text.primary'}
                                                    >
                                                        {faction.memberCount.toLocaleString()}
                                                    </Typography>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </CardContent>
                </Card>
            </Container>
            <BottomBar version={version}/>
        </Box>
    )
}

export default LeaderboardPage
