import React, {useEffect, useState} from 'react';
import LikeButton from './LikeButton';
import {getLikeCounts, getMyLikes, LikeTargetType} from '../services/likeService';
import {getSessionToken} from '../utils/session';

/**
 * A {@link LikeButton} that loads its own state: the target's public like count
 * and, when signed in, whether this user has already liked it.
 *
 * <p>Use this on a page showing a single target (a guide, a resource). The home
 * page instead fetches counts once for the whole catalogue and passes them down,
 * which is why {@link LikeButton} still takes them as props.
 */
interface SelfLoadingLikeButtonProps {
    targetType: LikeTargetType;
    targetId: string;
}

const SelfLoadingLikeButton: React.FC<SelfLoadingLikeButtonProps> = ({targetType, targetId}) => {
    const [count, setCount] = useState(0);
    const [liked, setLiked] = useState(false);
    const [token, setToken] = useState<string | null>(null);

    useEffect(() => {
        getLikeCounts(targetType).then((counts) => setCount(counts[targetId] || 0));
        let active = true;
        getSessionToken().then((saved) => {
            if (!active) return;
            setToken(saved);
            if (saved) {
                getMyLikes(saved).then((likes) =>
                    setLiked(likes.some((l) => l.targetType === targetType && l.targetId === targetId)));
            }
        });
        return () => {
            active = false;
        };
    }, [targetType, targetId]);

    return <LikeButton targetType={targetType} targetId={targetId} count={count} liked={liked} token={token}/>;
};

export default SelfLoadingLikeButton;
