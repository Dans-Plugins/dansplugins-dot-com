import {
    Alert,
    Avatar,
    Box,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Container,
    List,
    ListItem,
    ListItemButton,
    ListItemText,
    Typography,
} from '@mui/material'
import type {NextPage} from 'next'
import {useRouter} from 'next/router'
import React, {useEffect, useState} from 'react'
import TopBar from '../../components/TopBar'
import Seo from '../../components/Seo'
import BottomBar from '../../components/BottomBar'
import {NextLinkComposed} from '../../components/NextLinkComposed'
import {pageStyle, sectionHeaderStyle} from '../../styles/styles'
import {getPublicProfile, type PublicProfile} from '../../services/profileService'
import {resolveLikedItems} from '../../utils/likedItems'
import {badgeLabel} from '../../utils/badges'
import pluginData from '../data/plugins.json'

const version = require('../../package.json').version

const PublicProfilePage: NextPage = () => {
    const router = useRouter()
    const username = typeof router.query.username === 'string' ? router.query.username : null
    const [profile, setProfile] = useState<PublicProfile | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!username) return
        let active = true
        setLoading(true)
        getPublicProfile(username).then((data) => {
            if (active) {
                setProfile(data)
                setLoading(false)
            }
        })
        return () => {
            active = false
        }
    }, [username])

    const likedItems = profile ? resolveLikedItems(profile.likes, pluginData.plugins) : []
    const heading = profile?.displayName || profile?.username || username || 'Profile'

    return (
        <Box sx={(theme) => pageStyle(theme)}>
            <Seo
                title={`${heading} — Profile`}
                description={`The public DPC community profile for ${heading}.`}
                // The username comes from the router on the client (already
                // decoded), so the canonical URL is only emitted once it is known,
                // and the segment is re-encoded to keep the URL well-formed.
                path={username ? `/u/${encodeURIComponent(username)}` : undefined}
            />
            <TopBar/>
            <Container component="main" id="main" maxWidth="md" sx={{py: 4}}>
                {loading ? (
                    <Box sx={{display: 'flex', justifyContent: 'center', py: 6}}>
                        <CircularProgress/>
                    </Box>
                ) : !profile ? (
                    <Alert severity="info">
                        No profile found for <strong>{username}</strong>.
                    </Alert>
                ) : (
                    <>
                        <Card sx={{mb: 3}}>
                            <CardContent>
                                <Box sx={{display: 'flex', alignItems: 'center', gap: 2, mb: profile.bio ? 2 : 0}}>
                                    <Avatar src={profile.avatarUrl ?? undefined} sx={{width: 64, height: 64}}>
                                        {heading.charAt(0).toUpperCase()}
                                    </Avatar>
                                    <Box>
                                        <Typography variant="h4" component="h1" sx={(theme) => sectionHeaderStyle(theme)}>
                                            {heading}
                                        </Typography>
                                        {profile.displayName && (
                                            <Typography variant="body2" color="text.secondary">
                                                @{profile.username}
                                            </Typography>
                                        )}
                                        <Typography variant="body2" color="text.secondary">
                                            Member since {new Date(profile.createdAt).toLocaleDateString()}
                                        </Typography>
                                        {profile.badges.length > 0 && (
                                            <Box sx={{display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1}}>
                                                {profile.badges.map((badge) => (
                                                    <Chip
                                                        key={badge}
                                                        label={badgeLabel(badge)}
                                                        size="small"
                                                        color="primary"
                                                    />
                                                ))}
                                            </Box>
                                        )}
                                    </Box>
                                </Box>
                                {profile.bio && (
                                    <Typography variant="body1" sx={{mt: 1}}>
                                        {profile.bio}
                                    </Typography>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>Likes</Typography>
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
                                        {heading} hasn&apos;t liked any plugins or guides yet.
                                    </Typography>
                                )}
                            </CardContent>
                        </Card>
                    </>
                )}
            </Container>
            <BottomBar version={version}/>
        </Box>
    )
}

export default PublicProfilePage
