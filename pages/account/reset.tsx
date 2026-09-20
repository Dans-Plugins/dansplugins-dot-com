import {Alert, Box, Button, Card, CardContent, CircularProgress, Container, TextField, Typography} from '@mui/material'
import type {NextPage} from 'next'
import {useRouter} from 'next/router'
import React, {useEffect, useState} from 'react'
import TopBar from '../../components/TopBar'
import Seo from '../../components/Seo'
import BottomBar from '../../components/BottomBar'
import {NextLinkComposed} from '../../components/NextLinkComposed'
import {pageStyle, sectionHeaderStyle} from '../../styles/styles'
import {PASSWORD_POLICY_MESSAGE, meetsPasswordPolicy, resetPassword} from '../../services/passwordResetService'
import {clearSession} from '../../utils/session'

const version = require('../../package.json').version

/**
 * Where a reset token gets redeemed. There is no email on this site, so the
 * token comes from an admin who has confirmed who is asking — usually as a
 * link straight to this page with `?token=` filled in — and is good for
 * thirty minutes, once. A successful reset signs the account out everywhere,
 * this browser included, so the page ends by sending the person to sign in.
 */
const ResetPasswordPage: NextPage = () => {
    const router = useRouter()
    const [token, setToken] = useState('')
    const [password, setPassword] = useState('')
    const [confirm, setConfirm] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [done, setDone] = useState(false)
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        const fromQuery = router.query.token
        if (typeof fromQuery === 'string' && fromQuery) {
            setToken(fromQuery)
        }
    }, [router.query.token])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        if (!meetsPasswordPolicy(password)) {
            setError(`Choose a stronger password: ${PASSWORD_POLICY_MESSAGE}.`)
            return
        }
        if (password !== confirm) {
            setError('The two passwords do not match.')
            return
        }
        setSubmitting(true)
        const result = await resetPassword(token.trim(), password)
        setSubmitting(false)
        if (!result.ok) {
            setError(result.message)
            return
        }
        // Every session of the account was just revoked server-side, this one included.
        clearSession()
        setDone(true)
    }

    return (
        <Box sx={(theme) => pageStyle(theme)}>
            <Seo title="Reset your password" description="Set a new password with a reset token from an admin."/>
            <TopBar/>
            <Container component="main" id="main" maxWidth="sm" sx={{py: 4}}>
                <Typography variant="h3" component="h1" gutterBottom sx={(theme) => sectionHeaderStyle(theme)}>
                    Reset your password
                </Typography>
                <Card>
                    <CardContent>
                        {done ? (
                            <Box data-testid="reset-done">
                                <Alert severity="success" sx={{mb: 2}}>
                                    Your password has been reset, and every session on the account has been signed out.
                                </Alert>
                                <Button variant="contained" component={NextLinkComposed} to="/account">
                                    Sign in with your new password
                                </Button>
                            </Box>
                        ) : (
                            <>
                                <Typography variant="body2" color="text.secondary" sx={{mb: 2}}>
                                    This site does not send email, so a reset token comes from an admin who has
                                    confirmed it is you asking — ask on the community Discord. A token works once and
                                    for thirty minutes. If you followed a link from the admin, the token is already
                                    filled in below.
                                </Typography>
                                {error && <Alert severity="error" sx={{mb: 2}} data-testid="reset-error">{error}</Alert>}
                                <Box component="form" onSubmit={handleSubmit} aria-label="Reset password"
                                     sx={{display: 'flex', flexDirection: 'column', gap: 2}}>
                                    <TextField
                                        label="Reset token"
                                        value={token}
                                        onChange={(e) => setToken(e.target.value)}
                                        required
                                        inputProps={{autoComplete: 'off', spellCheck: false}}
                                    />
                                    <TextField
                                        label="New password"
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        helperText={PASSWORD_POLICY_MESSAGE}
                                        inputProps={{autoComplete: 'new-password'}}
                                    />
                                    <TextField
                                        label="Confirm new password"
                                        type="password"
                                        value={confirm}
                                        onChange={(e) => setConfirm(e.target.value)}
                                        required
                                        inputProps={{autoComplete: 'new-password'}}
                                    />
                                    <Box>
                                        <Button type="submit" variant="contained" disabled={submitting}
                                                startIcon={submitting ? <CircularProgress size={16} color="inherit"/> : undefined}>
                                            Set new password
                                        </Button>
                                    </Box>
                                </Box>
                            </>
                        )}
                    </CardContent>
                </Card>
            </Container>
            <BottomBar version={version}/>
        </Box>
    )
}

export default ResetPasswordPage
