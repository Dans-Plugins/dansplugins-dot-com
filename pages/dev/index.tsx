import {
    Alert,
    Box,
    Card,
    CardContent,
    Chip,
    Container,
    Link as MuiLink,
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
    ToggleButton,
    ToggleButtonGroup,
    Tooltip,
    Typography,
} from '@mui/material'
import BugReportIcon from '@mui/icons-material/BugReport'
import type {NextPage} from 'next'
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react'
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
import {getFeatureRequests} from '../../services/featureRequestService'

const version = require('../../package.json').version

type SignalKey = 'active' | 'needs-triage' | 'automation-backlog' | 'stale' | 'quiet'

interface Signal {
    key: SignalKey
    label: string
    color: 'success' | 'warning' | 'error' | 'default'
    description: string
}

const SIGNALS: Record<SignalKey, Omit<Signal, 'key'>> = {
    active: {label: 'Active', color: 'success', description: 'Recent PRs, not stuck in draft — moving.'},
    'needs-triage': {label: 'Needs triage', color: 'warning', description: 'Issues piling up with no PR started yet.'},
    'automation-backlog': {label: 'Automation backlog', color: 'warning', description: 'Every open PR is stuck in draft.'},
    stale: {label: 'Stale', color: 'error', description: 'Nothing here has been touched in 2+ years.'},
    quiet: {label: 'Quiet', color: 'default', description: 'Nothing open right now.'},
}

const signalFor = (summary: RepoSummary): Signal => {
    const total = summary.openIssueCount + summary.openPrCount
    const ageDays = summary.oldestOpenItemAt
        ? (Date.now() - new Date(summary.oldestOpenItemAt).getTime()) / 86_400_000
        : 0
    let key: SignalKey
    if (total === 0) {
        key = 'quiet'
    } else if (ageDays > 365 * 2) {
        key = 'stale'
    } else if (summary.openPrCount > 0 && summary.draftPrCount === summary.openPrCount) {
        key = 'automation-backlog'
    } else if (summary.openIssueCount > 0 && summary.openPrCount === 0) {
        key = 'needs-triage'
    } else {
        key = 'active'
    }
    return {key, ...SIGNALS[key]}
}

type ItemTypeFilter = 'all' | 'issue' | 'pr' | 'draft'
type SortOrder = 'oldest' | 'newest' | 'most-interested'

const StatTile: React.FC<{value: React.ReactNode; label: string; tone?: 'warn' | 'crit'}> = ({value, label, tone}) => (
    <Card variant="outlined" sx={{flex: '1 1 160px', textAlign: 'center', py: 1.5}}>
        <Typography
            variant="h4"
            component="div"
            fontWeight={700}
            color={tone === 'crit' ? 'error.main' : tone === 'warn' ? 'warning.main' : 'text.primary'}
        >
            {value}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{textTransform: 'uppercase', letterSpacing: '0.06em'}}>
            {label}
        </Typography>
    </Card>
)

const DevPortalPage: NextPage = () => {
    const [summary, setSummary] = useState<RepoSummary[]>([])
    const [items, setItems] = useState<BacklogItem[]>([])
    const [repoFilter, setRepoFilter] = useState('')
    const [signalFilter, setSignalFilter] = useState<SignalKey | 'all'>('all')
    const [typeFilter, setTypeFilter] = useState<ItemTypeFilter>('all')
    const [sortOrder, setSortOrder] = useState<SortOrder>('oldest')
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [interestCounts, setInterestCounts] = useState<Record<string, number>>({})
    const [interestedSet, setInterestedSet] = useState<Set<string>>(new Set())
    const [claimants, setClaimants] = useState<Record<string, string>>({})
    const [ideaCounts, setIdeaCounts] = useState<Record<string, number>>({})
    const [token, setToken] = useState<string | null>(null)

    const repoSectionRef = useRef<HTMLDivElement>(null)
    const itemsSectionRef = useRef<HTMLDivElement>(null)
    const ideasSectionRef = useRef<HTMLDivElement>(null)
    const scrollTo = (ref: React.RefObject<HTMLDivElement>) =>
        ref.current?.scrollIntoView({behavior: 'smooth', block: 'start'})

    const load = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const [summaryData, itemData, featureRequests] = await Promise.all([
                getBacklogSummary(),
                getBacklogItems(),
                getFeatureRequests(),
            ])
            setSummary(summaryData)
            setItems(itemData)
            const counts: Record<string, number> = {}
            featureRequests.forEach((fr) => {
                counts[fr.repo] = (counts[fr.repo] || 0) + 1
            })
            setIdeaCounts(counts)
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

    const signalByRepo = useMemo(
        () => Object.fromEntries(summary.map((row) => [row.repo, signalFor(row)])),
        [summary]
    )

    const visibleSummary = useMemo(
        () => (signalFilter === 'all' ? summary : summary.filter((row) => signalByRepo[row.repo]?.key === signalFilter)),
        [summary, signalFilter, signalByRepo]
    )

    const totals = useMemo(() => {
        const openIssues = summary.reduce((sum, r) => sum + r.openIssueCount, 0)
        const openPrs = summary.reduce((sum, r) => sum + r.openPrCount, 0)
        const draftPrs = summary.reduce((sum, r) => sum + r.draftPrCount, 0)
        const oldest = summary
            .map((r) => r.oldestOpenItemAt)
            .filter((d): d is string => !!d)
            .sort()[0]
        return {openIssues, openPrs, draftPrs, oldest}
    }, [summary])

    const visibleItems = useMemo(() => {
        let list = items
        if (repoFilter) {
            list = list.filter((item) => item.repo === repoFilter)
        }
        if (signalFilter !== 'all') {
            list = list.filter((item) => signalByRepo[item.repo]?.key === signalFilter)
        }
        if (typeFilter === 'issue') {
            list = list.filter((item) => item.itemType === 'ISSUE')
        } else if (typeFilter === 'pr') {
            list = list.filter((item) => item.itemType === 'PULL_REQUEST')
        } else if (typeFilter === 'draft') {
            list = list.filter((item) => item.itemType === 'PULL_REQUEST' && item.draft)
        }
        const sorted = [...list]
        if (sortOrder === 'newest') {
            sorted.sort((a, b) => b.githubCreatedAt.localeCompare(a.githubCreatedAt))
        } else if (sortOrder === 'most-interested') {
            sorted.sort((a, b) => (interestCounts[b.targetId] || 0) - (interestCounts[a.targetId] || 0))
        } else {
            sorted.sort((a, b) => a.githubCreatedAt.localeCompare(b.githubCreatedAt))
        }
        return sorted
    }, [items, repoFilter, signalFilter, typeFilter, sortOrder, signalByRepo, interestCounts])

    const jumpToRepo = (repo: string) => {
        setRepoFilter(repoFilter === repo ? '' : repo)
        scrollTo(itemsSectionRef)
    }

    const jumpToIdeas = (repo: string) => {
        setRepoFilter(repo)
        scrollTo(ideasSectionRef)
    }

    return (
        <Box sx={(theme) => pageStyle(theme)}>
            <Seo title="Developer Portal" description="Cross-repo GitHub issue/PR backlog for everyone building on Dan's Plugins."/>
            <TopBar/>
            <Container component="main" id="main" maxWidth="lg" sx={(theme) => containerPaddingStyle(theme)}>
                <Typography variant="h3" component="h1" gutterBottom sx={(theme) => sectionHeaderStyle(theme)}>
                    Developer Portal
                </Typography>
                <Typography variant="body1" gutterBottom color="text.secondary" sx={{mb: 2}}>
                    Every open issue and pull request across the Dans-Plugins GitHub org, mirrored here so the
                    state of each plugin is a glance instead of a dozen tabs. GitHub stays the source of truth —
                    this view refreshes on a schedule and never writes back.
                </Typography>

                <Stack direction="row" spacing={1} sx={{mb: 3}}>
                    <MuiLink component="button" variant="body2" onClick={() => scrollTo(repoSectionRef)}>
                        Jump to: repositories
                    </MuiLink>
                    <Typography color="text.secondary">·</Typography>
                    <MuiLink component="button" variant="body2" onClick={() => scrollTo(itemsSectionRef)}>
                        open items
                    </MuiLink>
                    <Typography color="text.secondary">·</Typography>
                    <MuiLink component="button" variant="body2" onClick={() => scrollTo(ideasSectionRef)}>
                        feature requests
                    </MuiLink>
                </Stack>

                {error && (
                    <Alert severity="info" sx={{mb: 2}}>
                        {error}
                    </Alert>
                )}

                <Stack direction="row" spacing={1.5} sx={{mb: 4, flexWrap: 'wrap'}}>
                    <StatTile value={loading ? <Skeleton width={40} sx={{mx: 'auto'}}/> : totals.openIssues} label="Open issues"/>
                    <StatTile value={loading ? <Skeleton width={40} sx={{mx: 'auto'}}/> : totals.openPrs} label="Open PRs"/>
                    <StatTile
                        value={loading ? <Skeleton width={40} sx={{mx: 'auto'}}/> : totals.draftPrs}
                        label="Stuck in draft"
                        tone={totals.draftPrs > 0 ? 'warn' : undefined}
                    />
                    <StatTile
                        value={loading ? <Skeleton width={60} sx={{mx: 'auto'}}/> : (totals.oldest ? relativeTimeFrom(totals.oldest, Date.now()) : '—')}
                        label="Oldest open item"
                        tone="crit"
                    />
                </Stack>

                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{mb: 1.5, flexWrap: 'wrap', gap: 1}} ref={repoSectionRef}>
                    <Typography variant="h6" component="h2">
                        By repository
                    </Typography>
                    <ToggleButtonGroup
                        size="small"
                        exclusive
                        value={signalFilter}
                        onChange={(_e, value) => value !== null && setSignalFilter(value)}
                        aria-label="filter by signal"
                    >
                        <ToggleButton value="all">All</ToggleButton>
                        {(Object.keys(SIGNALS) as SignalKey[]).map((key) => (
                            <ToggleButton key={key} value={key}>
                                <Tooltip title={SIGNALS[key].description}>
                                    <span>{SIGNALS[key].label}</span>
                                </Tooltip>
                            </ToggleButton>
                        ))}
                    </ToggleButtonGroup>
                </Stack>

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
                                        <TableCell align="right">Ideas</TableCell>
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
                                                <TableCell align="right"><Skeleton width={30}/></TableCell>
                                            </TableRow>
                                        ))
                                    ) : visibleSummary.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} align="center" sx={{py: 4}}>
                                                <Typography color="text.secondary">
                                                    No repos match this filter.
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        visibleSummary.map((row) => {
                                            const signal = signalByRepo[row.repo]
                                            return (
                                                <TableRow
                                                    key={row.repo}
                                                    hover
                                                    selected={repoFilter === row.repo}
                                                    onClick={() => jumpToRepo(row.repo)}
                                                    sx={{cursor: 'pointer'}}
                                                >
                                                    <TableCell>
                                                        <Typography fontWeight={600}>{row.repo} →</Typography>
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
                                                        <Tooltip title={signal.description}>
                                                            <Chip label={signal.label} size="small" color={signal.color}/>
                                                        </Tooltip>
                                                    </TableCell>
                                                    <TableCell align="right">
                                                        {ideaCounts[row.repo] ? (
                                                            <Chip
                                                                label={ideaCounts[row.repo]}
                                                                size="small"
                                                                variant="outlined"
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    jumpToIdeas(row.repo)
                                                                }}
                                                                clickable
                                                            />
                                                        ) : '—'}
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

                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{mb: 2, flexWrap: 'wrap', gap: 1}} ref={itemsSectionRef}>
                    <Typography variant="h6" component="h2">
                        Open items {repoFilter && `— ${repoFilter}`}
                    </Typography>
                    <Stack direction="row" spacing={1.5} flexWrap="wrap">
                        <TextField
                            select
                            size="small"
                            label="Repo"
                            value={repoFilter}
                            onChange={(e) => setRepoFilter(e.target.value)}
                            sx={{minWidth: 200}}
                        >
                            <MenuItem value="">All repos</MenuItem>
                            {summary.map((row) => (
                                <MenuItem key={row.repo} value={row.repo}>{row.repo}</MenuItem>
                            ))}
                        </TextField>
                        <TextField
                            select
                            size="small"
                            label="Type"
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value as ItemTypeFilter)}
                            sx={{minWidth: 150}}
                        >
                            <MenuItem value="all">All types</MenuItem>
                            <MenuItem value="issue">Issues only</MenuItem>
                            <MenuItem value="pr">PRs only</MenuItem>
                            <MenuItem value="draft">Draft PRs only</MenuItem>
                        </TextField>
                        <TextField
                            select
                            size="small"
                            label="Sort by"
                            value={sortOrder}
                            onChange={(e) => setSortOrder(e.target.value as SortOrder)}
                            sx={{minWidth: 170}}
                        >
                            <MenuItem value="oldest">Oldest first</MenuItem>
                            <MenuItem value="newest">Newest first</MenuItem>
                            <MenuItem value="most-interested">Most interested</MenuItem>
                        </TextField>
                    </Stack>
                </Stack>

                {(repoFilter || signalFilter !== 'all' || typeFilter !== 'all') && (
                    <Stack direction="row" spacing={1} sx={{mb: 1.5}} flexWrap="wrap">
                        {repoFilter && (
                            <Chip label={`Repo: ${repoFilter}`} size="small" onDelete={() => setRepoFilter('')}/>
                        )}
                        {signalFilter !== 'all' && (
                            <Chip label={`Signal: ${SIGNALS[signalFilter].label}`} size="small" onDelete={() => setSignalFilter('all')}/>
                        )}
                        {typeFilter !== 'all' && (
                            <Chip label={`Type: ${typeFilter}`} size="small" onDelete={() => setTypeFilter('all')}/>
                        )}
                    </Stack>
                )}

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
                                                    Nothing matches these filters.
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

                <Box ref={ideasSectionRef}>
                    <FeatureRequestSection
                        repos={summary.map((row) => row.repo)}
                        repoFilter={repoFilter}
                        token={token}
                    />
                </Box>
            </Container>
            <BottomBar version={version}/>
        </Box>
    )
}

export default DevPortalPage
