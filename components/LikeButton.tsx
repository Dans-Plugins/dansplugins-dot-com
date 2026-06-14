import React, {useEffect, useState} from 'react';
import {Box, IconButton, Tooltip, Typography} from '@mui/material';
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

    // Sync when the parent supplies loaded data (counts/likes are fetched on mount).
    useEffect(() => setCurrentCount(count), [count]);
    useEffect(() => setIsLiked(liked), [liked]);

    const handleClick = async () => {
        if (!token) {
            window.location.href = '/account';
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
        }
        setBusy(false);
    };

    const tooltip = token ? (isLiked ? 'Unlike' : 'Like') : 'Sign in to like';

    return (
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
    );
};

export default LikeButton;
