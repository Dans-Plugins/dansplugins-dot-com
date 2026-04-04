import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Container,
    IconButton,
    List,
    ListItem,
    ListItemText,
    Tab,
    Tabs,
    TextField,
    Typography,
} from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import type {NextPage} from 'next'
import React, {useCallback, useEffect, useRef, useState} from 'react'
import TopBar from '../components/TopBar'
import BottomBar from '../components/BottomBar'

const version = require('../package.json').version

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:45345'

interface ApiKeyInfo {
    id: string
    keyPrefix: string
    serverName: string
    createdAt: string
}

interface AccountProfile {
    id: string
    username: string
    createdAt: string
    apiKeys: ApiKeyInfo[]
}

const AccountPage: NextPage = () => {
    const [tab, setTab] = useState(0)
    const [token, setToken] = useState<string | null>(null)
    const [profile, setProfile] = useState<AccountProfile | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const [newApiKey, setNewApiKey] = useState<string | null>(null)

    // Form state
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [serverName, setServerName] = useState('')
    const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    useEffect(() => {
        const saved = localStorage.getItem('dpc-token')
        if (saved) {
            setToken(saved)
        }
    }, [])

    useEffect(() => {
        return () => {
            if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current)
        }
    }, [])

    const fetchProfile = useCallback(async (jwt: string) => {
        try {
            const res = await fetch(`${API_BASE}/api/v1/accounts/me`, {
                headers: {'Authorization': `Bearer ${jwt}`},
            })
            if (res.ok) {
                setProfile(await res.json())
            } else if (res.status === 401) {
                setToken(null)
                localStorage.removeItem('dpc-token')
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
        }
    }, [token, fetchProfile])

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setSuccess(null)
        try {
            const res = await fetch(`${API_BASE}/api/v1/accounts/register`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({username, password}),
            })
            if (res.ok) {
                const data = await res.json()
                setToken(data.token)
                localStorage.setItem('dpc-token', data.token)
                setSuccess('Account created successfully!')
                setUsername('')
                setPassword('')
            } else {
                setError('Registration failed. Username may already be taken.')
            }
        } catch {
            setError('Connection error. Is the API running?')
        }
    }

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setSuccess(null)
        try {
            const res = await fetch(`${API_BASE}/api/v1/accounts/login`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({username, password}),
            })
            if (res.ok) {
                const data = await res.json()
                setToken(data.token)
                localStorage.setItem('dpc-token', data.token)
                setSuccess('Logged in!')
                setUsername('')
                setPassword('')
            } else {
                setError('Invalid credentials.')
            }
        } catch {
            setError('Connection error. Is the API running?')
        }
    }

    const handleLogout = () => {
        setToken(null)
        setProfile(null)
        localStorage.removeItem('dpc-token')
        setSuccess('Logged out.')
    }

    const handleCreateApiKey = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setNewApiKey(null)
        if (!token) {
            setError('Not authenticated. Please log in.')
            return
        }
        try {
            const res = await fetch(`${API_BASE}/api/v1/accounts/me/api-keys`, {
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
        }
    }

    const handleDeleteApiKey = async (keyId: string) => {
        setError(null)
        if (!token) {
            setError('Not authenticated. Please log in.')
            return
        }
        try {
            const res = await fetch(`${API_BASE}/api/v1/accounts/me/api-keys/${keyId}`, {
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

    return (
        <Box>
            <TopBar/>
            <Container maxWidth="md" sx={{py: 4}}>
                <Typography variant="h4" gutterBottom>
                    Account Management
                </Typography>

                {error && <Alert severity="error" sx={{mb: 2}} onClose={() => setError(null)}>{error}</Alert>}
                {success && <Alert severity="success" sx={{mb: 2}} onClose={() => setSuccess(null)}>{success}</Alert>}

                {!token ? (
                    <>
                        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{mb: 2}}>
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
                                        <Button type="submit" variant="contained">Login</Button>
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
                                        <Button type="submit" variant="contained">Register</Button>
                                    </Box>
                                </CardContent>
                            </Card>
                        )}
                    </>
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
                                    <Typography variant="body2" color="text.secondary">
                                        Member since {new Date(profile.createdAt).toLocaleDateString()}
                                    </Typography>
                                </CardContent>
                            </Card>
                        )}

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
                                        <Box sx={{display: 'flex', alignItems: 'center', mt: 1}}>
                                            <code>{newApiKey}</code>
                                            <IconButton size="small" onClick={() => copyToClipboard(newApiKey)} sx={{ml: 1}} aria-label="Copy API key to clipboard">
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
                                                    secondary={`Created ${new Date(key.createdAt).toLocaleDateString()}`}
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
                                    <Button type="submit" variant="contained">Create Key</Button>
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
                                    bgcolor: 'grey.900',
                                    color: 'grey.100',
                                    p: 2,
                                    borderRadius: 1,
                                    overflow: 'auto',
                                    fontSize: '0.875rem'
                                }}>
{`# Register (creates account and returns JWT token)
POST /api/v1/accounts/register
{"username": "<name>", "password": "<pass>"}

# Login (returns JWT token)
POST /api/v1/accounts/login
{"username": "<name>", "password": "<pass>"}

# Create API key (requires Bearer token)
POST /api/v1/accounts/me/api-keys
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
