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
    TableSortLabel,
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

// Higher = more urgent; drives the default "Signal" column sort (most urgent first).
const SIGNAL_SEVERITY: Record<SignalKey, number> = {
    stale: 4,
    'automation-backlog': 3,
    'needs-triage': 3,
    active: 1,
    quiet: 0,
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
type SortDirection = 'asc' | 'desc'
type RepoSortColumn = 'repo' | 'issues' | 'prs' | 'oldest' | 'signal'
type ItemSortColumn = 'item' | 'type' | 'opened' | 'interested'

interface SortState<C extends string> {
    column: C | null
    direction: SortDirection
}

// First click on a column sorts in the direction that's usually most useful for
// it (e.g. "Oldest" ascending puts the oldest item on top; "Interested"
// descending puts the most-wanted item on top). A second click on the same
// column flips it.
const REPO_DEFAULT_DIRECTION: Record<RepoSortColumn, SortDirection> = {
    repo: 'asc', issues: 'desc', prs: 'desc', oldest: 'asc', signal: 'desc',
}
const ITEM_DEFAULT_DIRECTION: Record<ItemSortColumn, SortDirection> = {
    item: 'asc', type: 'asc', opened: 'asc', interested: 'desc',
}

function toggleSort<C extends string>(
    current: SortState<C>,
    column: C,
    defaultDirections: Record<C, SortDirection>
): SortState<C> {
    if (current.column !== column) {
        return {column, direction: defaultDirections[column]}
    }
    return {column, direction: current.direction === 'asc' ? 'desc' : 'asc'}
}

const compareRepoRows = (a: RepoSummary, b: RepoSummary, column: RepoSortColumn, signalByRepo: Record<string, Signal>): number => {
    switch (column) {
        case 'repo':
            return a.repo.localeCompare(b.repo)
        case 'issues':
            return a.openIssueCount - b.openIssueCount
        case 'prs':
            return a.openPrCount - b.openPrCount
        case 'oldest':
            return (a.oldestOpenItemAt ?? '9999').localeCompare(b.oldestOpenItemAt ?? '9999')
        case 'signal':
            return SIGNAL_SEVERITY[signalByRepo[a.repo]?.key ?? 'quiet'] - SIGNAL_SEVERITY[signalByRepo[b.repo]?.key ?? 'quiet']
        default:
            return 0
    }
}

const compareItemRows = (a: BacklogItem, b: BacklogItem, column: ItemSortColumn, interestCounts: Record<string, number>): number => {
    switch (column) {
        case 'item':
            return a.targetId.localeCompare(b.targetId)
        case 'type':
            return a.itemType.localeCompare(b.itemType) || Number(a.draft) - Number(b.draft)
        case 'opened':
            return a.githubCreatedAt.localeCompare(b.githubCreatedAt)
        case 'interested':
            return (interestCounts[a.targetId] || 0) - (interestCounts[b.targetId] || 0)
        default:
            return 0
    }
}

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

interface SortableHeaderProps<C extends string> {
    label: string
    column: C
    align?: 'left' | 'right' | 'center'
    sort: SortState<C>
    onSort: (column: C) => void
}

function SortableHeader<C extends string>({label, column, align, sort, onSort}: SortableHeaderProps<C>) {
    return (
        <TableCell align={align}>
            <TableSortLabel
                active={sort.column === column}
                direction={sort.column === column ? sort.direction : 'asc'}
                onClick={() => onSort(column)}
            >
                {label}
            </TableSortLabel>
        </TableCell>
    )
}

const DevPortalPage: NextPage = () => {
    const [summary, setSummary] = useState<RepoSummary[]>([])
    const [items, setItems] = useState<BacklogItem[]>([])
    const [repoFilter, setRepoFilter] = useState('')
    const [signalFilter, setSignalFilter] = useState<SignalKey | 'all'>('all')
    const [typeFilter, setTypeFilter] = useState<ItemTypeFilter>('all')
    const [repoSort, setRepoSort] = useState<SortState<RepoSortColumn>>({column: null, direction: 'desc'})
    const [itemSort, setItemSort] = useState<SortState<ItemSortColumn>>({column: null, direction: 'asc'})
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

    const visibleSummary = useMemo(() => {
        const filtered = signalFilter === 'all' ? summary : summary.filter((row) => signalByRepo[row.repo]?.key === signalFilter)
        if (!repoSort.column) {
            return filtered
        }
        const column = repoSort.column
        return [...filtered].sort((a, b) => {
            const result = compareRepoRows(a, b, column, signalByRepo)
            return repoSort.direction === 'asc' ? result : -result
        })
    }, [summary, signalFilter, signalByRepo, repoSort])

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
        if (!itemSort.column) {
            return list
        }
        const column = itemSort.column
        return [...list].sort((a, b) => {
            const result = compareItemRows(a, b, column, interestCounts)
            return itemSort.direction === 'asc' ? result : -result
        })
    }, [items, repoFilter, signalFilter, typeFilter, signalByRepo, itemSort, interestCounts])

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
                                        <SortableHeader label="Repo" column="repo" sort={repoSort}
                                            onSort={(c) => setRepoSort((s) => toggleSort(s, c, REPO_DEFAULT_DIRECTION))}/>
                                        <SortableHeader label="Issues" column="issues" align="right" sort={repoSort}
                                            onSort={(c) => setRepoSort((s) => toggleSort(s, c, REPO_DEFAULT_DIRECTION))}/>
                                        <SortableHeader label="PRs (draft)" column="prs" align="right" sort={repoSort}
                                            onSort={(c) => setRepoSort((s) => toggleSort(s, c, REPO_DEFAULT_DIRECTION))}/>
                                        <SortableHeader label="Oldest open item" column="oldest" sort={repoSort}
                                            onSort={(c) => setRepoSort((s) => toggleSort(s, c, REPO_DEFAULT_DIRECTION))}/>
                                        <SortableHeader label="Signal" column="signal" sort={repoSort}
                                            onSort={(c) => setRepoSort((s) => toggleSort(s, c, REPO_DEFAULT_DIRECTION))}/>
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
                                        <SortableHeader label="Item" column="item" sort={itemSort}
                                            onSort={(c) => setItemSort((s) => toggleSort(s, c, ITEM_DEFAULT_DIRECTION))}/>
                                        <SortableHeader label="Type" column="type" sort={itemSort}
                                            onSort={(c) => setItemSort((s) => toggleSort(s, c, ITEM_DEFAULT_DIRECTION))}/>
                                        <SortableHeader label="Opened" column="opened" sort={itemSort}
                                            onSort={(c) => setItemSort((s) => toggleSort(s, c, ITEM_DEFAULT_DIRECTION))}/>
                                        <SortableHeader label="Interested" column="interested" align="center" sort={itemSort}
                                            onSort={(c) => setItemSort((s) => toggleSort(s, c, ITEM_DEFAULT_DIRECTION))}/>
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
