import {
    Alert,
    Box,
    Card,
    CardContent,
    Chip,
    Container,
    MenuItem,
    Skeleton,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography,
} from '@mui/material'
import BugReportIcon from '@mui/icons-material/BugReport'
import type {NextPage} from 'next'
import React, {useCallback, useEffect, useMemo, useState} from 'react'
import TopBar from '../../components/TopBar'
import Seo from '../../components/Seo'
import BottomBar from '../../components/BottomBar'
import LikeButton from '../../components/LikeButton'
import ClaimButton from '../../components/ClaimButton'
import FeatureRequestSection from '../../components/FeatureRequestSection'
import {pageStyle, sectionHeaderStyle, containerPaddingStyle} from '../../styles/styles'
import {relativeTimeFrom} from '../../utils/relativeTime'
import {getBacklogItems, getBacklogSummary, BacklogItem, RepoSummary} from '../../services/backlogService'
import {getLikeCounts, getMyLikes} from '../../services/likeService'
import {getActiveClaims} from '../../services/claimService'

const version = require('../../package.json').version

const signalFor = (summary: RepoSummary): { label: string; color: 'success' | 'warning' | 'error' | 'default' } => {
    const total = summary.openIssueCount + summary.openPrCount
    if (total === 0) {
        return {label: 'Quiet', color: 'default'}
    }
    const ageDays = summary.oldestOpenItemAt
        ? (Date.now() - new Date(summary.oldestOpenItemAt).getTime()) / 86_400_000
        : 0
    if (ageDays > 365 * 2) {
        return {label: 'Stale', color: 'error'}
    }
    if (summary.openPrCount > 0 && summary.draftPrCount === summary.openPrCount) {
        return {label: 'Automation backlog', color: 'warning'}
    }
    if (summary.openIssueCount > 0 && summary.openPrCount === 0) {
        return {label: 'Needs triage', color: 'warning'}
    }
    return {label: 'Active', color: 'success'}
}

const DevPortalPage: NextPage = () => {
    const [summary, setSummary] = useState<RepoSummary[]>([])
    const [items, setItems] = useState<BacklogItem[]>([])
    const [repoFilter, setRepoFilter] = useState('')
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [interestCounts, setInterestCounts] = useState<Record<string, number>>({})
    const [interestedSet, setInterestedSet] = useState<Set<string>>(new Set())
    const [claimants, setClaimants] = useState<Record<string, string>>({})
    const [token, setToken] = useState<string | null>(null)

    const load = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const [summaryData, itemData] = await Promise.all([getBacklogSummary(), getBacklogItems()])
            setSummary(summaryData)
            setItems(itemData)
            if (summaryData.length === 0 && itemData.length === 0) {
                setError('No backlog data yet — the sync runs on a schedule and may not have completed its first pass.')
            }
        } catch (e) {
            console.error('Failed to load backlog data:', e)
            setError('We couldn’t load the backlog right now. Please try again later.')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        load()
    }, [load])

    useEffect(() => {
        getLikeCounts('issue').then(setInterestCounts)
        const saved = window.localStorage.getItem('dpc-token')
        setToken(saved)
        if (saved) {
            getMyLikes(saved).then((likes) =>
                setInterestedSet(new Set(likes.filter((l) => l.targetType === 'issue').map((l) => l.targetId))))
        }
        getActiveClaims().then((claims) =>
            setClaimants(Object.fromEntries(claims.map((c) => [c.targetId, c.claimantUsername]))))
    }, [])

    const setClaimant = (targetId: string, claimantUsername: string | null) => {
        setClaimants((prev) => {
            const next = {...prev}
            if (claimantUsername) {
                next[targetId] = claimantUsername
            } else {
                delete next[targetId]
            }
            return next
        })
    }

    const visibleItems = useMemo(
        () => (repoFilter ? items.filter((item) => item.repo === repoFilter) : items),
        [items, repoFilter]
    )

    return (
        <Box sx={(theme) => pageStyle(theme)}>
            <Seo title="Developer Portal" description="Cross-repo GitHub issue/PR backlog for everyone building on Dan's Plugins."/>
            <TopBar/>
            <Container component="main" id="main" maxWidth="lg" sx={(theme) => containerPaddingStyle(theme)}>
                <Typography variant="h3" component="h1" gutterBottom sx={(theme) => sectionHeaderStyle(theme)}>
                    Developer Portal
                </Typography>
                <Typography variant="body1" gutterBottom color="text.secondary" sx={{mb: 3}}>
                    Every open issue and pull request across the Dans-Plugins GitHub org, mirrored here so the
                    state of each plugin is a glance instead of a dozen tabs. GitHub stays the source of truth —
                    this view refreshes on a schedule and never writes back.
                </Typography>

                {error && (
                    <Alert severity="info" sx={{mb: 2}}>
                        {error}
                    </Alert>
                )}

                <Typography variant="h6" component="h2" gutterBottom>
                    By repository
                </Typography>
                <Card sx={{mb: 4}}>
                    <CardContent sx={{p: 0, '&:last-child': {pb: 0}}}>
                        <TableContainer>
                            <Table size="small">
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
                                        <TableCell>Repo</TableCell>
                                        <TableCell align="right">Issues</TableCell>
                                        <TableCell align="right">PRs (draft)</TableCell>
                                        <TableCell>Oldest open item</TableCell>
                                        <TableCell>Signal</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {loading ? (
                                        Array.from({length: 5}).map((_, i) => (
                                            <TableRow key={i}>
                                                <TableCell><Skeleton width={140}/></TableCell>
                                                <TableCell align="right"><Skeleton width={30}/></TableCell>
                                                <TableCell align="right"><Skeleton width={50}/></TableCell>
                                                <TableCell><Skeleton width={100}/></TableCell>
                                                <TableCell><Skeleton width={90}/></TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        summary.map((row) => {
                                            const signal = signalFor(row)
                                            return (
                                                <TableRow
                                                    key={row.repo}
                                                    hover
                                                    selected={repoFilter === row.repo}
                                                    onClick={() => setRepoFilter(repoFilter === row.repo ? '' : row.repo)}
                                                    sx={{cursor: 'pointer'}}
                                                >
                                                    <TableCell>
                                                        <Typography fontWeight={600}>{row.repo}</Typography>
                                                    </TableCell>
                                                    <TableCell align="right">{row.openIssueCount}</TableCell>
                                                    <TableCell align="right">
                                                        {row.openPrCount}
                                                        {row.draftPrCount > 0 && (
                                                            <Typography component="span" color="text.secondary">
                                                                {' '}({row.draftPrCount})
                                                            </Typography>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        {row.oldestOpenItemAt
                                                            ? relativeTimeFrom(row.oldestOpenItemAt, Date.now())
                                                            : '—'}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Chip label={signal.label} size="small" color={signal.color}/>
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

                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{mb: 2}}>
                    <Typography variant="h6" component="h2">
                        Open items {repoFilter && `— ${repoFilter}`}
                    </Typography>
                    <TextField
                        select
                        size="small"
                        label="Repo"
                        value={repoFilter}
                        onChange={(e) => setRepoFilter(e.target.value)}
                        sx={{minWidth: 220}}
                    >
                        <MenuItem value="">All repos</MenuItem>
                        {summary.map((row) => (
                            <MenuItem key={row.repo} value={row.repo}>{row.repo}</MenuItem>
                        ))}
                    </TextField>
                </Stack>

                <Card>
                    <CardContent sx={{p: 0, '&:last-child': {pb: 0}}}>
                        <TableContainer>
                            <Table size="small">
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
                                        <TableCell>Item</TableCell>
                                        <TableCell>Type</TableCell>
                                        <TableCell>Opened</TableCell>
                                        <TableCell align="center">Interested</TableCell>
                                        <TableCell>Claimed</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {loading ? (
                                        Array.from({length: 6}).map((_, i) => (
                                            <TableRow key={i}>
                                                <TableCell><Skeleton width={320}/></TableCell>
                                                <TableCell><Skeleton width={80}/></TableCell>
                                                <TableCell><Skeleton width={90}/></TableCell>
                                                <TableCell><Skeleton width={50}/></TableCell>
                                                <TableCell><Skeleton width={100}/></TableCell>
                                            </TableRow>
                                        ))
                                    ) : visibleItems.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} align="center" sx={{py: 4}}>
                                                <Typography color="text.secondary">
                                                    Nothing open here right now.
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        visibleItems.map((item) => (
                                            <TableRow key={item.targetId} hover>
                                                <TableCell>
                                                    <Typography
                                                        component="a"
                                                        href={item.htmlUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        color="inherit"
                                                    >
                                                        {item.repo} #{item.number} — {item.title}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Chip
                                                        size="small"
                                                        variant="outlined"
                                                        icon={item.itemType === 'ISSUE' ? <BugReportIcon/> : undefined}
                                                        label={
                                                            item.itemType === 'ISSUE'
                                                                ? 'Issue'
                                                                : item.draft ? 'Draft PR' : 'PR'
                                                        }
                                                        color={item.itemType === 'PULL_REQUEST' && item.draft ? 'warning' : 'default'}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    {relativeTimeFrom(item.githubCreatedAt, Date.now())}
                                                </TableCell>
                                                <TableCell align="center">
                                                    <LikeButton
                                                        targetType="issue"
                                                        targetId={item.targetId}
                                                        count={interestCounts[item.targetId] || 0}
                                                        liked={interestedSet.has(item.targetId)}
                                                        token={token}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <ClaimButton
                                                        repo={item.repo}
                                                        number={item.number}
                                                        claimantUsername={claimants[item.targetId] ?? null}
                                                        token={token}
                                                        onChange={(claimantUsername) => setClaimant(item.targetId, claimantUsername)}
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </CardContent>
                </Card>

                <FeatureRequestSection
                    repos={summary.map((row) => row.repo)}
                    repoFilter={repoFilter}
                    token={token}
                />
            </Container>
            <BottomBar version={version}/>
        </Box>
    )
}

export default DevPortalPage
