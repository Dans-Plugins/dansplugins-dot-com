import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    Container,
    Skeleton,
    Snackbar,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Tooltip,
    Typography,
    useMediaQuery,
    useTheme,
} from '@mui/material'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import GroupIcon from '@mui/icons-material/Group'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline'
import type {NextPage} from 'next'
import React, {useCallback, useEffect, useState} from 'react'
import TopBar from '../components/TopBar'
import {friendlyHttpError} from '../utils/friendlyError'
import Seo from '../components/Seo'
import BottomBar from '../components/BottomBar'
import {pageStyle, sectionHeaderStyle, containerPaddingStyle} from '../styles/styles'
import {relativeTimeFrom} from '../utils/relativeTime'
import {getApiBaseUrl} from '../utils/apiBase'

const version = require('../package.json').version

const API_BASE = getApiBaseUrl()

interface Faction {
    id: string
    name: string
    serverId: string
    memberCount: number
    description: string | null
    serverIp: string | null
    discordLink: string | null
    active: boolean
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
    const [copied, setCopied] = useState(false)
    // On a phone the Server column moves under the faction's name, so rank,
    // name and member count fit the width instead of the table scrolling
    // sideways with the server address and member count out of view.
    const theme = useTheme()
    const compact = useMediaQuery(theme.breakpoints.down('sm'))

    const copyServerIp = useCallback(async (ip: string) => {
        try {
            await navigator.clipboard.writeText(ip)
            setCopied(true)
        } catch {
            // Clipboard can be unavailable (older browsers, insecure origin); the
            // address is still visible on the chip for manual copying.
        }
    }, [])

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
                setError(friendlyHttpError(res.status, 'Loading the leaderboard'))
            }
        } catch (e) {
            console.error('Failed to fetch factions:', e)
            setError('We couldn’t load the leaderboard right now. Please try again.')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchFactions()
    }, [fetchFactions])

    return (
        <Box sx={(theme) => pageStyle(theme)}>
            <Seo title="Faction Leaderboard" description="Medieval Factions ranked by member count across all servers."/>
            <TopBar/>
            <Container component="main" id="main" maxWidth="md" sx={(theme) => containerPaddingStyle(theme)}>
                <Typography variant="h3" component="h1" gutterBottom sx={(theme) => sectionHeaderStyle(theme)}>
                    Faction Leaderboard
                </Typography>
                <Typography variant="body1" gutterBottom color="text.secondary" sx={{mb: 3}}>
                    Factions ranked by number of members across all servers.
                </Typography>

                {error && (
                    <Alert
                        severity="error"
                        sx={{mb: 2}}
                        onClose={() => setError(null)}
                        action={
                            <Button color="inherit" size="small" onClick={fetchFactions}>
                                Retry
                            </Button>
                        }
                    >
                        {error}
                    </Alert>
                )}

                <Card>
                    <CardContent sx={{p: 0, '&:last-child': {pb: 0}}}>
                        <TableContainer>
                            {/* Fixed layout on a phone: the columns keep their set
                                widths and a long server address wraps inside the
                                faction cell instead of widening the table. */}
                            <Table aria-label="Faction leaderboard" aria-busy={loading} sx={compact ? {tableLayout: 'fixed'} : undefined}>
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
                                        <TableCell sx={{width: compact ? 44 : 60, px: compact ? 1 : undefined}} align="center">
                                            Rank
                                        </TableCell>
                                        <TableCell>Faction</TableCell>
                                        {!compact && <TableCell>Server</TableCell>}
                                        <TableCell align="right" sx={compact ? {width: 56, pl: 0} : undefined}>
                                            <Box sx={{display: 'inline-flex', alignItems: 'center', gap: 0.5}}>
                                                <GroupIcon fontSize="small" aria-hidden/>
                                                {/* Icon only on a phone, where the word costs the
                                                    faction column its width; screen readers still
                                                    hear the column's name. */}
                                                <Box
                                                    component="span"
                                                    sx={compact ? {
                                                        position: 'absolute',
                                                        width: '1px',
                                                        height: '1px',
                                                        overflow: 'hidden',
                                                        clip: 'rect(0 0 0 0)',
                                                        whiteSpace: 'nowrap',
                                                    } : undefined}
                                                >
                                                    Members
                                                </Box>
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
                                                {!compact && <TableCell><Skeleton width={100}/></TableCell>}
                                                <TableCell align="right"><Skeleton width={40}/></TableCell>
                                            </TableRow>
                                        ))
                                    ) : factions.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={compact ? 3 : 4} align="center" sx={{py: 4}}>
                                                <Typography color="text.secondary">
                                                    No factions have been synced yet. Once Minecraft servers
                                                    start posting faction data, they will appear here.
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        factions.map((faction, index) => {
                                            const serverInfo = (
                                                <Stack spacing={0.5} alignItems="flex-start" sx={{maxWidth: '100%'}}>
                                                    <Chip
                                                        label={faction.serverId}
                                                        size="small"
                                                        variant="outlined"
                                                    />
                                                    {faction.serverIp && (
                                                        <Tooltip title="Click to copy server address">
                                                            <Chip
                                                                label={faction.serverIp}
                                                                // A full-size chip on a phone: it is the tap target for copying.
                                                                size={compact ? 'medium' : 'small'}
                                                                color="primary"
                                                                variant="outlined"
                                                                icon={<ContentCopyIcon/>}
                                                                onClick={() => copyServerIp(faction.serverIp as string)}
                                                                sx={{
                                                                    fontFamily: 'monospace',
                                                                    cursor: 'pointer',
                                                                    maxWidth: '100%',
                                                                    ...(compact && {
                                                                        height: 'auto',
                                                                        minHeight: 32,
                                                                        '& .MuiChip-label': {whiteSpace: 'normal', overflowWrap: 'anywhere', py: 0.5},
                                                                    }),
                                                                }}
                                                            />
                                                        </Tooltip>
                                                    )}
                                                    {faction.discordLink && (
                                                        <Button
                                                            size="small"
                                                            startIcon={<ChatBubbleOutlineIcon/>}
                                                            href={faction.discordLink}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                        >
                                                            Discord
                                                        </Button>
                                                    )}
                                                </Stack>
                                            )
                                            return (
                                            <TableRow
                                                key={faction.id}
                                                sx={{
                                                    '&:hover': {bgcolor: 'action.hover'},
                                                    ...(index < 3 && {
                                                        bgcolor: `${MEDAL_COLORS[index]}08`,
                                                    }),
                                                }}
                                            >
                                                <TableCell align="center" sx={{px: compact ? 1 : undefined}}>
                                                    {index < 3 ? (
                                                        // The trophy replaced the number for the top
                                                        // three, leaving their rank unannounced.
                                                        <EmojiEventsIcon
                                                            titleAccess={`Rank ${index + 1}`}
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
                                                                    sx={{maxWidth: compact ? '100%' : 250}}>
                                                            {faction.description}
                                                        </Typography>
                                                    )}
                                                    <Typography variant="caption" color="text.secondary" display="block">
                                                        Updated {relativeTimeFrom(faction.updatedAt, Date.now())}
                                                    </Typography>
                                                    {compact && <Box sx={{mt: 1}}>{serverInfo}</Box>}
                                                </TableCell>
                                                {!compact && <TableCell>{serverInfo}</TableCell>}
                                                <TableCell align="right" sx={compact ? {pl: 0} : undefined}>
                                                    <Typography
                                                        fontWeight="bold"
                                                        color={index < 3 ? 'primary' : 'text.primary'}
                                                    >
                                                        {faction.memberCount.toLocaleString()}
                                                    </Typography>
                                                </TableCell>
                                            </TableRow>
                                            )
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </CardContent>
                </Card>
            </Container>
            <Snackbar
                open={copied}
                autoHideDuration={2000}
                onClose={() => setCopied(false)}
                message="Server address copied to clipboard"
                anchorOrigin={{vertical: 'bottom', horizontal: 'center'}}
            />
            <BottomBar version={version}/>
        </Box>
    )
}

export default LeaderboardPage
