import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Container,
    Divider,
    List,
    ListItemButton,
    ListItemText,
    Paper,
    Stack,
    TextField,
    Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import type {NextPage} from 'next'
import React, {useCallback, useEffect, useState} from 'react'
import TopBar from '../../components/TopBar'
import Seo from '../../components/Seo'
import BottomBar from '../../components/BottomBar'
import {NextLinkComposed} from '../../components/NextLinkComposed'
import {pageStyle, sectionHeaderStyle} from '../../styles/styles'
import {fetchCatalogueInBrowser, type CataloguePlugin} from '../../services/pluginCatalogueService'
import {getSessionToken} from '../../utils/session'
import {
    EMPTY_UPSERT,
    createPlugin,
    fetchIsAdmin,
    parseTags,
    updatePlugin,
    upsertFrom,
    type PluginUpsert,
} from '../../services/catalogueAdminService'

const version = require('../../package.json').version

// Rendered in the browser like /account: the token lives in localStorage and
// every request here carries it. The API is the gate — a non-admin's PUT is a
// 403 whatever this page shows — so the "admins only" state below is a
// courtesy, not a control.
type Gate = 'loading' | 'signed-out' | 'not-admin' | 'unreachable' | 'admin'

// Everything the form holds is text, tags included: a comma-separated line is
// the least ceremony for a dozen short words, and parseTags() normalises it.
interface FormState extends Omit<PluginUpsert, 'tags'> {
    tagsText: string
}

const formFrom = (plugin: CataloguePlugin | null): FormState => {
    const base = plugin ? upsertFrom(plugin) : EMPTY_UPSERT
    return {...base, tagsText: base.tags.join(', ')}
}

const AdminPluginsPage: NextPage = () => {
    const [token, setToken] = useState<string | null>(null)
    const [gate, setGate] = useState<Gate>('loading')
    const [catalogue, setCatalogue] = useState<CataloguePlugin[]>([])
    // null = adding a new plugin; a slug = editing that one.
    const [editing, setEditing] = useState<string | null>(null)
    const [form, setForm] = useState<FormState>(formFrom(null))
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
    const [error, setError] = useState<string | null>(null)
    const [notice, setNotice] = useState<string | null>(null)
    const [submitting, setSubmitting] = useState(false)

    const reloadCatalogue = useCallback(async () => {
        setCatalogue(await fetchCatalogueInBrowser())
    }, [])

    useEffect(() => {
        let active = true
        getSessionToken().then((saved) => {
            if (!active) return
            if (!saved) {
                setGate('signed-out')
                return
            }
            setToken(saved)
            Promise.all([fetchIsAdmin(saved), fetchCatalogueInBrowser()]).then(([admin, plugins]) => {
                if (!active) return
                setCatalogue(plugins)
                setGate(admin === null ? 'unreachable' : admin ? 'admin' : 'not-admin')
            })
        })
        return () => {
            active = false
        }
    }, [])

    const startEditing = (plugin: CataloguePlugin | null) => {
        setEditing(plugin?.id ?? null)
        setForm(formFrom(plugin))
        setFieldErrors({})
        setError(null)
        setNotice(null)
    }

    const setField = (name: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm((current) => ({...current, [name]: e.target.value}))

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!token) return
        setSubmitting(true)
        setError(null)
        setNotice(null)
        setFieldErrors({})
        const {tagsText, ...rest} = form
        const body: PluginUpsert = {...rest, tags: parseTags(tagsText)}
        const result = editing ? await updatePlugin(token, editing, body) : await createPlugin(token, body)
        setSubmitting(false)
        if (!result.ok) {
            setError(result.message)
            setFieldErrors(result.fieldErrors ?? {})
            return
        }
        await reloadCatalogue()
        setEditing(result.value.id)
        setForm(formFrom(result.value))
        setNotice(`${result.value.title} saved. The site shows the change on its next render (within five minutes on a cached page).`)
    }

    const field = (name: keyof Omit<FormState, 'tagsText'>, label: string, extra: Record<string, unknown> = {}) => (
        <TextField
            label={label}
            name={name}
            value={form[name]}
            onChange={setField(name)}
            size="small"
            error={Boolean(fieldErrors[name])}
            helperText={fieldErrors[name]}
            {...extra}
        />
    )

    return (
        <Box sx={(theme) => pageStyle(theme)}>
            <Seo title="Edit the plugin catalogue" description="Admin: add or edit plugins in the Dan's Plugins Community catalogue."/>
            <TopBar/>
            <Container component="main" id="main" maxWidth="md" sx={{py: 4}}>
                <Typography variant="h3" component="h1" gutterBottom sx={(theme) => sectionHeaderStyle(theme)}>
                    Plugin catalogue
                </Typography>

                {gate === 'loading' && <CircularProgress size={24} aria-label="Loading"/>}

                {gate === 'signed-out' && (
                    <Alert severity="info">
                        Editing the catalogue needs a signed-in admin.{' '}
                        <Box component={NextLinkComposed} to="/account?returnTo=/admin/plugins" sx={{color: 'inherit', fontWeight: 600}}>
                            Sign in
                        </Box>
                    </Alert>
                )}

                {gate === 'not-admin' && (
                    <Alert severity="warning" data-testid="admins-only">
                        Admins only. Your account is signed in, but it is not listed in the API&apos;s
                        <code> DPC_ADMIN_USERNAMES</code>, so the API would refuse any change made here.
                    </Alert>
                )}

                {gate === 'unreachable' && (
                    <Alert severity="error">The API could not be reached, or your session has expired. Try signing in again.</Alert>
                )}

                {gate === 'admin' && (
                    <Stack direction={{xs: 'column', md: 'row'}} spacing={3} alignItems="flex-start">
                        <Paper variant="outlined" sx={{width: {xs: '100%', md: 280}, flexShrink: 0}}>
                            <List dense disablePadding aria-label="Plugins">
                                <ListItemButton selected={editing === null} onClick={() => startEditing(null)} data-testid="add-plugin">
                                    <AddIcon fontSize="small" sx={{mr: 1}}/>
                                    <ListItemText primary="Add a plugin"/>
                                </ListItemButton>
                                <Divider/>
                                {catalogue.map((plugin) => (
                                    <ListItemButton
                                        key={plugin.id}
                                        selected={editing === plugin.id}
                                        onClick={() => startEditing(plugin)}
                                        data-testid={`edit-${plugin.id}`}
                                    >
                                        <ListItemText primary={plugin.title} secondary={plugin.id}/>
                                    </ListItemButton>
                                ))}
                            </List>
                        </Paper>

                        <Box component="form" onSubmit={handleSubmit} sx={{flexGrow: 1, width: '100%', display: 'flex', flexDirection: 'column', gap: 2}} aria-label={editing ? `Edit ${editing}` : 'Add a plugin'}>
                            <Typography variant="h6" component="h2">
                                {editing ? `Editing ${editing}` : 'New plugin'}
                            </Typography>
                            {error && <Alert severity="error" data-testid="form-error">{error}</Alert>}
                            {notice && <Alert severity="success" data-testid="form-notice">{notice}</Alert>}

                            {editing === null ? field('slug', 'Slug', {
                                required: true,
                                helperText: fieldErrors.slug ?? 'Lower-case words joined by hyphens; becomes the URL and can\'t be changed later',
                                inputProps: {maxLength: 64, pattern: '[a-z0-9]+(-[a-z0-9]+)*'},
                            }) : null}
                            {field('title', 'Title', {required: true, inputProps: {maxLength: 100}})}
                            {field('description', 'Description', {required: true, multiline: true, minRows: 2, inputProps: {maxLength: 500}})}
                            {field('githubUrl', 'GitHub repository URL', {required: true, type: 'url', inputProps: {maxLength: 512}})}
                            {field('spigotmcUrl', 'SpigotMC resource URL', {
                                type: 'url', inputProps: {maxLength: 512},
                                helperText: fieldErrors.spigotmcUrl ?? 'Leave empty if the plugin is not on SpigotMC; tested versions and rating are read from it',
                            })}
                            {field('bstatsId', 'bStats plugin id', {inputProps: {maxLength: 32, inputMode: 'numeric'}, helperText: fieldErrors.bstatsId ?? 'Leave empty if there is no bStats project'})}
                            {field('iconPath', 'Icon path', {
                                inputProps: {maxLength: 256},
                                helperText: fieldErrors.iconPath ?? 'A file under public/icons in the website repository, e.g. /icons/mf.png — the file itself ships with the site',
                            })}
                            <TextField
                                label="Tags"
                                name="tags"
                                value={form.tagsText}
                                onChange={(e) => setForm((current) => ({...current, tagsText: e.target.value}))}
                                size="small"
                                error={Boolean(fieldErrors.tags) || Object.keys(fieldErrors).some((k) => k.startsWith('tags'))}
                                helperText={fieldErrors.tags ?? 'Comma-separated, lower-case: medieval, factions, admin, survival …'}
                            />
                            {parseTags(form.tagsText).length > 0 && (
                                <Stack direction="row" spacing={0.5} sx={{flexWrap: 'wrap', rowGap: 0.5}} aria-label="Tag preview">
                                    {parseTags(form.tagsText).map((tag) => <Chip key={tag} label={tag} size="small" variant="outlined"/>)}
                                </Stack>
                            )}

                            <Box>
                                <Button type="submit" variant="contained" disabled={submitting}
                                        startIcon={submitting ? <CircularProgress size={16} color="inherit"/> : undefined}>
                                    {editing ? 'Save changes' : 'Add plugin'}
                                </Button>
                            </Box>
                            <Typography variant="caption" color="text.secondary">
                                Removing a plugin is not offered here: its versions, download counts and likes hang off the row,
                                so that stays a deliberate change in the API repository.
                            </Typography>
                        </Box>
                    </Stack>
                )}
            </Container>
            <BottomBar version={version}/>
        </Box>
    )
}

export default AdminPluginsPage
