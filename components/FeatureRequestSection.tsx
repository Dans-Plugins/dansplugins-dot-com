import React, {useCallback, useEffect, useState} from 'react';
import {
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    MenuItem,
    Snackbar,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import LikeButton from './LikeButton';
import {
    convertFeatureRequest,
    createFeatureRequest,
    getFeatureRequests,
    FeatureRequest,
} from '../services/featureRequestService';
import {getLikeCounts, getMyLikes} from '../services/likeService';

interface FeatureRequestSectionProps {
    repos: string[];
    repoFilter: string;
    token: string | null;
}

const FeatureRequestSection: React.FC<FeatureRequestSectionProps> = ({repos, repoFilter, token}) => {
    const [requests, setRequests] = useState<FeatureRequest[]>([]);
    const [upvoteCounts, setUpvoteCounts] = useState<Record<string, number>>({});
    const [upvotedSet, setUpvotedSet] = useState<Set<string>>(new Set());
    const [formRepo, setFormRepo] = useState(repoFilter || repos[0] || '');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [notice, setNotice] = useState<string | null>(null);

    const load = useCallback(async () => {
        const [requestData, counts] = await Promise.all([
            getFeatureRequests(repoFilter || undefined),
            getLikeCounts('feature_request'),
        ]);
        setRequests(requestData);
        setUpvoteCounts(counts);
    }, [repoFilter]);

    useEffect(() => {
        load();
    }, [load]);

    useEffect(() => {
        if (token) {
            getMyLikes(token).then((likes) =>
                setUpvotedSet(new Set(likes.filter((l) => l.targetType === 'feature_request').map((l) => l.targetId))));
        }
    }, [token]);

    useEffect(() => {
        setFormRepo(repoFilter || repos[0] || '');
    }, [repoFilter, repos]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token) {
            setNotice('Sign in to suggest a feature.');
            return;
        }
        if (!formRepo || !title.trim() || !description.trim()) {
            return;
        }
        setSubmitting(true);
        const result = await createFeatureRequest(token, formRepo, title.trim(), description.trim());
        if (result.ok) {
            setTitle('');
            setDescription('');
            load();
        } else {
            setNotice(result.message);
        }
        setSubmitting(false);
    };

    const handleConvert = async (id: string) => {
        if (!token) {
            return;
        }
        const result = await convertFeatureRequest(token, id);
        if (result.ok) {
            load();
        } else {
            setNotice(result.message);
        }
    };

    return (
        <Box sx={{mt: 4}}>
            <Typography variant="h6" component="h2" gutterBottom>
                Feature requests {repoFilter && `— ${repoFilter}`}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{mb: 2}}>
                Not a GitHub issue yet — an idea anyone can upvote. Once it&apos;s clearly wanted, it gets converted
                into a real issue on the plugin&apos;s repo.
            </Typography>

            <Card sx={{mb: 3}}>
                <CardContent>
                    <Box component="form" onSubmit={handleSubmit}>
                        <Stack spacing={2}>
                            <TextField
                                select
                                size="small"
                                label="Plugin"
                                value={formRepo}
                                onChange={(e) => setFormRepo(e.target.value)}
                                sx={{maxWidth: 320}}
                            >
                                {repos.map((repo) => (
                                    <MenuItem key={repo} value={repo}>{repo}</MenuItem>
                                ))}
                            </TextField>
                            <TextField
                                size="small"
                                label="What should it do?"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                inputProps={{maxLength: 200}}
                                required
                            />
                            <TextField
                                size="small"
                                label="Why would this help?"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                inputProps={{maxLength: 4000}}
                                multiline
                                minRows={2}
                                required
                            />
                            <Box>
                                <Button type="submit" variant="contained" disabled={submitting}>
                                    Suggest it
                                </Button>
                            </Box>
                        </Stack>
                    </Box>
                </CardContent>
            </Card>

            <Stack spacing={2}>
                {requests.length === 0 && (
                    <Typography color="text.secondary">No feature requests here yet — be the first.</Typography>
                )}
                {requests.map((request) => (
                    <Card key={request.id}>
                        <CardContent>
                            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
                                <Box sx={{flex: 1}}>
                                    <Stack direction="row" alignItems="center" spacing={1} sx={{mb: 0.5}}>
                                        <Typography variant="subtitle1" fontWeight={600}>{request.title}</Typography>
                                        <Chip size="small" label={request.repo} variant="outlined"/>
                                        {request.status === 'CONVERTED' && (
                                            <Chip size="small" color="success" label="Converted to issue"/>
                                        )}
                                    </Stack>
                                    <Typography variant="body2" color="text.secondary">
                                        {request.description}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" display="block" sx={{mt: 0.5}}>
                                        Suggested by {request.authorUsername}
                                        {request.convertedIssueUrl && (
                                            <>
                                                {' · '}
                                                <a href={request.convertedIssueUrl} target="_blank" rel="noopener noreferrer">
                                                    View the issue
                                                </a>
                                            </>
                                        )}
                                    </Typography>
                                </Box>
                                <Stack alignItems="flex-end" spacing={1}>
                                    <LikeButton
                                        targetType="feature_request"
                                        targetId={request.id}
                                        count={upvoteCounts[request.id] || 0}
                                        liked={upvotedSet.has(request.id)}
                                        token={token}
                                    />
                                    {request.status === 'OPEN' && token && (
                                        <Button size="small" onClick={() => handleConvert(request.id)}>
                                            Convert to GitHub issue
                                        </Button>
                                    )}
                                </Stack>
                            </Stack>
                        </CardContent>
                    </Card>
                ))}
            </Stack>

            <Snackbar
                open={notice !== null}
                autoHideDuration={4000}
                onClose={() => setNotice(null)}
                message={notice}
                anchorOrigin={{vertical: 'bottom', horizontal: 'center'}}
            />
        </Box>
    );
};

export default FeatureRequestSection;
