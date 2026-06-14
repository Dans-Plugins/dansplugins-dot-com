import React, {useEffect, useState} from 'react';
import LikeButton from './LikeButton';
import {getLikeCounts, getMyLikes} from '../services/likeService';

/**
 * Like button for a guide page. Fetches the guide's current like count (public)
 * and the signed-in user's liked state on mount, then renders {@link LikeButton}.
 */
const GuideLikeButton: React.FC<{ guideId: string }> = ({guideId}) => {
    const [count, setCount] = useState(0);
    const [liked, setLiked] = useState(false);
    const [token, setToken] = useState<string | null>(null);

    useEffect(() => {
        getLikeCounts('guide').then((counts) => setCount(counts[guideId] || 0));
        const saved = typeof window !== 'undefined' ? window.localStorage.getItem('dpc-token') : null;
        setToken(saved);
        if (saved) {
            getMyLikes(saved).then((likes) =>
                setLiked(likes.some((l) => l.targetType === 'guide' && l.targetId === guideId)));
        }
    }, [guideId]);

    return <LikeButton targetType="guide" targetId={guideId} count={count} liked={liked} token={token}/>;
};

export default GuideLikeButton;
