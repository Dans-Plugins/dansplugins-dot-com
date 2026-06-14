import React, {useEffect, useState} from 'react';
import {Box, Button, IconButton, Snackbar, Tooltip, Typography} from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import {likeTarget, unlikeTarget, LikeTargetType} from '../services/likeService';

interface LikeButtonProps {
    targetType: LikeTargetType;
    targetId: string;
    count: number;
    liked: boolean;
    // The signed-in user's token, or null when logged out (then the button links to /account).
    token: string | null;
}

const LikeButton: React.FC<LikeButtonProps> = ({targetType, targetId, count, liked, token}) => {
    const [currentCount, setCurrentCount] = useState(count);
    const [isLiked, setIsLiked] = useState(liked);
    const [busy, setBusy] = useState(false);
    // A transient message shown after a click that can't complete (signed out, or a
    // failed request). signIn flips the Snackbar's action to a "Sign in" button.
    const [notice, setNotice] = useState<{message: string; signIn?: boolean} | null>(null);

    // Sync when the parent supplies loaded data (counts/likes are fetched on mount).
    useEffect(() => setCurrentCount(count), [count]);
    useEffect(() => setIsLiked(liked), [liked]);

    // Send a signed-out user to the account page, but remember where they were so
    // they land back here after authenticating (see pages/account.tsx returnTo).
    const goSignIn = () => {
        const returnTo = window.location.pathname + window.location.search;
        window.location.href = `/account?returnTo=${encodeURIComponent(returnTo)}`;
    };

    const handleClick = async () => {
        if (!token) {
            // Don't silently yank the user to a login page — say why first, and let
            // them choose to go (Nielsen #3 user control & freedom; Krug: answer the
            // obvious question before acting).
            setNotice({message: 'Sign in to like plugins and guides.', signIn: true});
            return;
        }
        if (busy) {
            return;
        }
        setBusy(true);
        const result = isLiked
            ? await unlikeTarget(token, targetType, targetId)
            : await likeTarget(token, targetType, targetId);
        if (result !== null) {
            setIsLiked(!isLiked);
            setCurrentCount(result);
        } else {
            // The request failed — a network error, or an expired/invalid token.
            // Previously the heart just didn't move and the user got no explanation:
            // the classic "nothing happens" dead end (Nielsen #1 visibility of system
            // status; #9 help users recognize and recover from errors).
            setNotice({message: 'Couldn’t save your like — please try again.'});
        }
        setBusy(false);
    };

    const tooltip = token ? (isLiked ? 'Unlike' : 'Like') : 'Sign in to like';

    return (
        <>
            <Box sx={{display: 'inline-flex', alignItems: 'center'}}>
                <Tooltip title={tooltip}>
                    <span>
                        <IconButton
                            size="small"
                            onClick={handleClick}
                            disabled={busy}
                            color={isLiked ? 'error' : 'default'}
                            aria-label={isLiked ? 'Unlike' : 'Like'}
                            aria-pressed={isLiked}
                        >
                            {isLiked ? <FavoriteIcon fontSize="small"/> : <FavoriteBorderIcon fontSize="small"/>}
                        </IconButton>
                    </span>
                </Tooltip>
                <Typography variant="body2" color="text.secondary" sx={{minWidth: 16}}>
                    {currentCount}
                </Typography>
            </Box>
            <Snackbar
                open={notice !== null}
                autoHideDuration={4000}
                onClose={() => setNotice(null)}
                message={notice?.message}
                anchorOrigin={{vertical: 'bottom', horizontal: 'center'}}
                action={notice?.signIn
                    ? <Button color="secondary" size="small" onClick={goSignIn}>Sign in</Button>
                    : undefined}
            />
        </>
    );
};

export default LikeButton;
