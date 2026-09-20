import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Container,
    IconButton,
    List,
    ListItem,
    ListItemButton,
    ListItemText,
    Tab,
    Tabs,
    TextField,
    Typography,
} from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import type {NextPage} from 'next'
import {useRouter} from 'next/router'
import React, {useCallback, useEffect, useRef, useState} from 'react'
import TopBar from '../components/TopBar'
import Seo from '../components/Seo'
import BottomBar from '../components/BottomBar'
import {NextLinkComposed} from '../components/NextLinkComposed'
import {pageStyle, sectionHeaderStyle} from '../styles/styles'
import {getMyLikes, type LikedTarget} from '../services/likeService'
import {login, logout, register} from '../services/authService'
import {resolveLikedItems} from '../utils/likedItems'
import {fetchCatalogueInBrowser, type CataloguePlugin} from '../services/pluginCatalogueService'
import {clearSession, getSessionToken, saveSession} from '../utils/session'
import {badgeLabel} from '../utils/badges'
import {getApiBaseUrl} from '../utils/apiBase'
import {absoluteDateFrom} from '../utils/relativeTime'

const version = require('../package.json').version

const API_BASE = getApiBaseUrl()

interface ApiKeyInfo {
    id: string
    keyPrefix: string
    serverName: string
    createdAt: string
}

interface AccountProfile {
    id: string
    username: string
    displayName: string | null
    avatarUrl: string | null
    bio: string | null
    createdAt: string
    badges: string[]
    apiKeys: ApiKeyInfo[]
    // Whether the API will let this user edit the catalogue (DPC_ADMIN_USERNAMES).
    admin?: boolean
}

const AccountPage: NextPage = () => {
    const router = useRouter()
    const [tab, setTab] = useState(0)
    const [token, setToken] = useState<string | null>(null)
    const [profile, setProfile] = useState<AccountProfile | null>(null)
    const [likes, setLikes] = useState<LikedTarget[]>([])
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const [newApiKey, setNewApiKey] = useState<string | null>(null)
    // Disables submit buttons and shows a spinner while a request is in flight,
    // so a slow action gives feedback instead of looking like "nothing happened"
    // and can't be double-submitted.
    const [submitting, setSubmitting] = useState(false)

    // Form state
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [serverName, setServerName] = useState('')
    // Profile edit fields
    const [displayName, setDisplayName] = useState('')
    const [avatarUrl, setAvatarUrl] = useState('')
    const [bio, setBio] = useState('')
    const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    // The JWT is stored in localStorage rather than an HttpOnly cookie. This is
    // an explicit trade-off: localStorage exposes the token to any XSS injected
    // into this origin, while HttpOnly cookies would require an API redesign
    // (the backend doesn't currently issue cookies, and CSRF protection would
    // need to be added on top). For an opt-in community registry where the
    // worst-case impact of a compromised token is "an attacker can rotate the
    // victim's own API keys", the simpler localStorage path is acceptable.
    // Reconsider if this site ever stores higher-value credentials.
    useEffect(() => {
        // Renews a token about to expire (utils/session.ts), so a returning
        // visitor is still signed in a day later rather than an hour later.
        let active = true
        getSessionToken().then((saved) => {
            if (active && saved) {
                setToken(saved)
            }
        })
        return () => {
            active = false
        }
    }, [])

    // Liked items are named by looking their ids up in the catalogue, which
    // now comes from dpc-api rather than a file bundled with the page. Until
    // it arrives (or if it never does) an item shows its id, as it always did
    // for an id the catalogue did not know.
    const [catalogue, setCatalogue] = useState<CataloguePlugin[]>([])
    useEffect(() => {
        let active = true
        fetchCatalogueInBrowser().then((plugins) => {
            if (active) setCatalogue(plugins)
        })
        return () => {
            active = false
        }
    }, [])

    useEffect(() => {
        return () => {
            if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current)
        }
    }, [])

    const fetchProfile = useCallback(async (jwt: string) => {
        try {
            const res = await fetch(`${API_BASE}/api/v1/profile/me`, {
                headers: {'Authorization': `Bearer ${jwt}`},
            })
            if (res.ok) {
                setError(null)
                const data: AccountProfile = await res.json()
                setProfile(data)
                setDisplayName(data.displayName ?? '')
                setAvatarUrl(data.avatarUrl ?? '')
                setBio(data.bio ?? '')
            } else if (res.status === 401) {
                setToken(null)
                clearSession()
                setError('Session expired. Please log in again.')
            } else {
                setProfile(null)
                setError(`Failed to load profile (HTTP ${res.status}).`)
            }
        } catch {
            setError('Failed to fetch profile.')
        }
    }, [])

    useEffect(() => {
        if (token) {
            fetchProfile(token)
            // The user's "toolbox" of liked plugins/guides. Best-effort: a likes
            // fetch failure degrades to an empty list and never blocks the page.
            getMyLikes(token).then(setLikes)
        }
    }, [token, fetchProfile])

    // Persisting the token is best-effort: with storage blocked (some private
    // modes, or a browser set to refuse site data) setItem throws, and the
    // session then simply lasts until the page is reloaded rather than failing
    // a login that succeeded.
    const startSession = (jwt: string, refreshToken: string | null) => {
        setToken(jwt)
        // Best-effort storage (see utils/session.ts): with site data blocked the
        // in-memory token above keeps this visit signed in.
        saveSession({token: jwt, refreshToken})
    }

    // After authenticating, send the user back to wherever they came from — e.g. a
    // plugin whose like button bounced them here (LikeButton sets ?returnTo=...).
    // Only internal paths are honored, never an absolute URL, to avoid an open redirect.
    const returnAfterAuth = () => {
        const returnTo = router.query.returnTo
        const path = typeof returnTo === 'string' ? returnTo : null
        if (path && path.startsWith('/') && !path.startsWith('//')) {
            router.push(path)
        }
    }

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setSuccess(null)
        setSubmitting(true)
        try {
            const result = await register(username, password)
            if (result.status === 'authenticated') {
                startSession(result.token, result.refreshToken)
                setSuccess('Account created successfully!')
                setUsername('')
                setPassword('')
                returnAfterAuth()
            } else if (result.status === 'registered') {
                // The account exists but no token was issued: switch to the
                // Login tab with the username kept, so the visitor can log in
                // without retyping it — and without re-submitting the Register
                // form, which would answer 409 on the account just created.
                setSuccess(result.message)
                setPassword('')
                setTab(0)
            } else {
                setError(result.message)
            }
        } finally {
            setSubmitting(false)
        }
    }

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setSuccess(null)
        setSubmitting(true)
        try {
            const result = await login(username, password)
            if (result.status === 'authenticated') {
                startSession(result.token, result.refreshToken)
                setSuccess('Logged in!')
                setUsername('')
                setPassword('')
                returnAfterAuth()
            } else {
                setError(result.message)
            }
        } finally {
            setSubmitting(false)
        }
    }

    const handleLogout = () => {
        // Revoke the token server-side (via UserAuth) before clearing it locally.
        // Best-effort: clearing the local token is the meaningful part of logout.
        if (token) {
            logout(token)
        }
        setToken(null)
        setProfile(null)
        setLikes([])
        clearSession()
        setSuccess('Logged out.')
    }

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setSuccess(null)
        if (!token) {
            setError('Not authenticated. Please log in.')
            return
        }
        setSubmitting(true)
        try {
            const res = await fetch(`${API_BASE}/api/v1/profile/me`, {
                method: 'PATCH',
                headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
                body: JSON.stringify({
                    displayName: displayName || null,
                    avatarUrl: avatarUrl || null,
                    bio: bio || null,
                }),
            })
            if (res.ok) {
                setProfile(await res.json())
                setSuccess('Profile saved.')
            } else {
                setError('Failed to save profile.')
            }
        } catch {
            setError('Connection error.')
        } finally {
            setSubmitting(false)
        }
    }

    const handleCreateApiKey = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setNewApiKey(null)
        if (!token) {
            setError('Not authenticated. Please log in.')
            return
        }
        setSubmitting(true)
        try {
            const res = await fetch(`${API_BASE}/api/v1/profile/me/api-keys`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({serverName}),
            })
            if (res.ok) {
                const data = await res.json()
                setNewApiKey(data.apiKey)
                setServerName('')
                if (token) fetchProfile(token)
            } else {
                setError('Failed to create API key.')
            }
        } catch {
            setError('Connection error.')
        } finally {
            setSubmitting(false)
        }
    }

    const handleDeleteApiKey = async (keyId: string) => {
        setError(null)
        if (!token) {
            setError('Not authenticated. Please log in.')
            return
        }
        try {
            const res = await fetch(`${API_BASE}/api/v1/profile/me/api-keys/${keyId}`, {
                method: 'DELETE',
                headers: {'Authorization': `Bearer ${token}`},
            })
            if (res.ok) {
                if (token) fetchProfile(token)
            } else {
                setError('Failed to delete API key.')
            }
        } catch {
            setError('Connection error.')
        }
    }

    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text)
            setSuccess('Copied to clipboard!')
            if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current)
            copyTimeoutRef.current = setTimeout(() => setSuccess(null), 2000)
        } catch {
            setError('Failed to copy — please select and copy the key manually.')
        }
    }

    const likedItems = resolveLikedItems(likes, catalogue)

    return (
        <Box sx={(theme) => pageStyle(theme)}>
            <Seo title="Account" description="Manage your account and the API keys your Minecraft servers use to sync with the DPC community data API."/>
            <TopBar/>
            <Container component="main" id="main" maxWidth="md" sx={{py: 4}}>
                <Typography variant="h3" component="h1" gutterBottom sx={(theme) => sectionHeaderStyle(theme)}>
                    Account
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{mb: 3}}>
                    Manage your account and the API keys your Minecraft servers use to sync with the DPC community data API.
                </Typography>

                {error && <Alert severity="error" sx={{mb: 2}} onClose={() => setError(null)}>{error}</Alert>}
                {success && <Alert severity="success" sx={{mb: 2}} onClose={() => setSuccess(null)}>{success}</Alert>}

                {!token ? (
                    <Box sx={{maxWidth: 460, mx: 'auto', mt: 2}}>
                        <Tabs value={tab} onChange={(_, v) => setTab(v)} centered sx={{mb: 2}}>
                            <Tab label="Login"/>
                            <Tab label="Register"/>
                        </Tabs>

                        {tab === 0 && (
                            <Card>
                                <CardContent>
                                    <Typography variant="h6" gutterBottom>Login</Typography>
                                    <Box component="form" onSubmit={handleLogin} sx={{display: 'flex', flexDirection: 'column', gap: 2}}>
                                        <TextField
                                            label="Username"
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                            required
                                        />
                                        <TextField
                                            label="Password"
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                        />
                                        <Button type="submit" variant="contained" disabled={submitting}
                                                startIcon={submitting ? <CircularProgress size={16} color="inherit"/> : undefined}>
                                            Login
                                        </Button>
                                        <Typography variant="body2" color="text.secondary">
                                            Forgot your password?{' '}
                                            <Box component={NextLinkComposed} to="/account/reset" sx={{color: 'primary.main'}}>
                                                Reset it with a token from an admin
                                            </Box>
                                        </Typography>
                                    </Box>
                                </CardContent>
                            </Card>
                        )}

                        {tab === 1 && (
                            <Card>
                                <CardContent>
                                    <Typography variant="h6" gutterBottom>Register</Typography>
                                    <Typography variant="body2" sx={{mb: 2}} color="text.secondary">
                                        Create an account to manage API keys for your Minecraft servers.
                                        You can also register from a Minecraft plugin using the command line.
                                    </Typography>
                                    <Box component="form" onSubmit={handleRegister} sx={{display: 'flex', flexDirection: 'column', gap: 2}}>
                                        <TextField
                                            label="Username"
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                            required
                                            helperText="3-32 characters, letters, digits, hyphens, underscores"
                                        />
                                        <TextField
                                            label="Password"
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                            helperText="8-128 characters"
                                        />
                                        <Button type="submit" variant="contained" disabled={submitting}
                                                startIcon={submitting ? <CircularProgress size={16} color="inherit"/> : undefined}>
                                            Register
                                        </Button>
                                    </Box>
                                </CardContent>
                            </Card>
                        )}
                    </Box>
                ) : (
                    <>
                        {profile && (
                            <Card sx={{mb: 3}}>
                                <CardContent>
                                    <Box sx={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2}}>
                                        <Typography variant="h6">
                                            Welcome, {profile.username}
                                        </Typography>
                                        <Button variant="outlined" onClick={handleLogout}>Logout</Button>
                                    </Box>
                                    <Typography variant="body2" color="text.secondary" gutterBottom>
                                        Member since {absoluteDateFrom(profile.createdAt)}
                                        {' · '}
                                        <Box component={NextLinkComposed} to={`/u/${profile.username}`} sx={{color: 'primary.main'}}>
                                            View your public profile
                                        </Box>
                                    </Typography>
                                    {profile.admin && (
                                        <Alert severity="info" sx={{mb: 2}} data-testid="admin-link">
                                            You are an admin.{' '}
                                            <Box component={NextLinkComposed} to="/admin/plugins" sx={{color: 'inherit', fontWeight: 600}}>
                                                Edit the plugin catalogue
                                            </Box>
                                        </Alert>
                                    )}
                                    {profile.badges.length > 0 && (
                                        <Box sx={{display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1}}>
                                            {profile.badges.map((badge) => (
                                                <Chip key={badge} label={badgeLabel(badge)} size="small" color="primary"/>
                                            ))}
                                        </Box>
                                    )}
                                    <Box component="form" onSubmit={handleUpdateProfile}
                                         sx={{display: 'flex', flexDirection: 'column', gap: 2, mt: 2}}>
                                        <Typography variant="subtitle2" color="text.secondary">Profile</Typography>
                                        <TextField
                                            label="Display name"
                                            value={displayName}
                                            onChange={(e) => setDisplayName(e.target.value)}
                                            size="small"
                                            inputProps={{maxLength: 50}}
                                        />
                                        <TextField
                                            label="Avatar URL"
                                            value={avatarUrl}
                                            onChange={(e) => setAvatarUrl(e.target.value)}
                                            size="small"
                                            inputProps={{maxLength: 512}}
                                        />
                                        <TextField
                                            label="Bio"
                                            value={bio}
                                            onChange={(e) => setBio(e.target.value)}
                                            size="small"
                                            multiline
                                            minRows={2}
                                            inputProps={{maxLength: 500}}
                                        />
                                        <Box>
                                            <Button type="submit" variant="contained" size="small" disabled={submitting}
                                                    startIcon={submitting ? <CircularProgress size={16} color="inherit"/> : undefined}>
                                                Save profile
                                            </Button>
                                        </Box>
                                    </Box>
                                </CardContent>
                            </Card>
                        )}

                        <Card sx={{mb: 3}}>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>My likes</Typography>
                                <Typography variant="body2" color="text.secondary" sx={{mb: 2}}>
                                    The plugins and guides you&apos;ve liked — your personal toolbox.
                                </Typography>
                                {likedItems.length > 0 ? (
                                    <List disablePadding>
                                        {likedItems.map((item) => (
                                            <ListItem key={item.key} disablePadding>
                                                <ListItemButton component={NextLinkComposed} to={item.href}>
                                                    <ListItemText primary={item.title}/>
                                                    <Chip
                                                        label={item.targetType}
                                                        size="small"
                                                        variant="outlined"
                                                        sx={{textTransform: 'capitalize'}}
                                                    />
                                                </ListItemButton>
                                            </ListItem>
                                        ))}
                                    </List>
                                ) : (
                                    <Typography variant="body2" color="text.secondary">
                                        You haven&apos;t liked any plugins or guides yet. Browse the{' '}
                                        <Box component={NextLinkComposed} to="/#plugins" sx={{color: 'primary.main'}}>plugins</Box>
                                        {' '}or{' '}
                                        <Box component={NextLinkComposed} to="/guides" sx={{color: 'primary.main'}}>guides</Box>
                                        {' '}and tap the like button.
                                    </Typography>
                                )}
                            </CardContent>
                        </Card>

                        <Card sx={{mb: 3}}>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>API Keys</Typography>
                                <Typography variant="body2" color="text.secondary" sx={{mb: 2}}>
                                    API keys allow Minecraft servers to sync data with the DPC API.
                                    Use the X-API-Key header with write endpoints.
                                </Typography>

                                {newApiKey && (
                                    <Alert severity="warning" sx={{mb: 2}} onClose={() => setNewApiKey(null)}>
                                        <strong>Save this key now — it won&apos;t be shown again:</strong>
                                        <Box sx={{display: 'flex', alignItems: 'center', gap: 1, mt: 1}}>
                                            <Box
                                                component="code"
                                                sx={{
                                                    flex: 1,
                                                    fontFamily: 'monospace',
                                                    fontSize: '0.85rem',
                                                    wordBreak: 'break-all',
                                                    bgcolor: 'action.hover',
                                                    px: 1,
                                                    py: 0.5,
                                                    borderRadius: 1,
                                                }}
                                            >
                                                {newApiKey}
                                            </Box>
                                            <IconButton size="small" onClick={() => copyToClipboard(newApiKey)} aria-label="Copy API key to clipboard">
                                                <ContentCopyIcon fontSize="small"/>
                                            </IconButton>
                                        </Box>
                                    </Alert>
                                )}

                                {profile && profile.apiKeys.length > 0 ? (
                                    <List>
                                        {profile.apiKeys.map((key) => (
                                            <ListItem
                                                key={key.id}
                                                secondaryAction={
                                                    <IconButton edge="end" onClick={() => handleDeleteApiKey(key.id)} aria-label="Delete API key">
                                                        <DeleteIcon/>
                                                    </IconButton>
                                                }
                                            >
                                                <ListItemText
                                                    primary={`${key.serverName}${key.keyPrefix ? ` (${key.keyPrefix}…)` : ''}`}
                                                    secondary={`Created ${absoluteDateFrom(key.createdAt)}`}
                                                />
                                            </ListItem>
                                        ))}
                                    </List>
                                ) : (
                                    <Typography variant="body2" color="text.secondary">
                                        No API keys yet. Create one below.
                                    </Typography>
                                )}

                                <Box component="form" onSubmit={handleCreateApiKey} sx={{display: 'flex', gap: 2, mt: 2}}>
                                    <TextField
                                        label="Server Name"
                                        value={serverName}
                                        onChange={(e) => setServerName(e.target.value)}
                                        required
                                        size="small"
                                        sx={{flex: 1}}
                                    />
                                    <Button type="submit" variant="contained" disabled={submitting}
                                            startIcon={submitting ? <CircularProgress size={16} color="inherit"/> : undefined}>
                                        Create Key
                                    </Button>
                                </Box>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>Minecraft Plugin Integration</Typography>
                                <Typography variant="body2" color="text.secondary" sx={{mb: 1}}>
                                    Use these commands in your Minecraft server plugin to manage your account:
                                </Typography>
                                <Box component="pre" sx={{
                                    bgcolor: '#0d1117',
                                    color: '#c9d1d9',
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    p: 2,
                                    borderRadius: 2,
                                    overflow: 'auto',
                                    fontSize: '0.85rem',
                                    fontFamily: 'monospace',
                                }}>
{`# Register (creates account and returns a token)
POST /api/v1/auth/register
{"username": "<name>", "password": "<pass>"}

# Login (returns a token)
POST /api/v1/auth/login
{"username": "<name>", "password": "<pass>"}

# Create API key (requires Bearer token)
POST /api/v1/profile/me/api-keys
Authorization: Bearer <token>
{"serverName": "<server_name>"}

# Sync factions (requires API key)
POST /api/v1/factions
X-API-Key: <api_key>
[{...faction data...}]`}
                                </Box>
                            </CardContent>
                        </Card>
                    </>
                )}
            </Container>
            <BottomBar version={version}/>
        </Box>
    )
}

export default AccountPage
