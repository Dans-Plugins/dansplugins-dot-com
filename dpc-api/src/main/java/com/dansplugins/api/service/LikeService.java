package com.dansplugins.api.service;

import com.dansplugins.api.entity.Like;
import com.dansplugins.api.entity.User;
import com.dansplugins.api.repository.LikeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Likes on plugins, guides, and — for the dev portal — backlog issues/PRs
 * ("interested", keyed by {@code repo#number}). A like is idempotent (the
 * unique constraint on {@code (user, target_type, target_id)} means liking
 * twice is a no-op), and counts are public.
 */
@Service
@RequiredArgsConstructor
public class LikeService {

    static final Set<String> ALLOWED_TYPES = Set.of("plugin", "guide", "issue");

    private final LikeRepository likeRepository;

    /** Like a target (no-op if already liked). Returns the target's new like count. */
    @Transactional
    public long like(User user, String targetType, String targetId) {
        validate(targetType, targetId);
        if (!likeRepository.existsByUserAndTargetTypeAndTargetId(user, targetType, targetId)) {
            likeRepository.save(new Like(user, targetType, targetId));
        }
        return likeRepository.countByTargetTypeAndTargetId(targetType, targetId);
    }

    /** Unlike a target (no-op if not liked). Returns the target's new like count. */
    @Transactional
    public long unlike(User user, String targetType, String targetId) {
        validate(targetType, targetId);
        likeRepository.deleteByUserAndTargetTypeAndTargetId(user, targetType, targetId);
        return likeRepository.countByTargetTypeAndTargetId(targetType, targetId);
    }

    /** Public aggregate counts for one target type: targetId -> count. */
    @Transactional(readOnly = true)
    public Map<String, Long> countsForType(String targetType) {
        validateType(targetType);
        return likeRepository.countsByTargetType(targetType).stream()
                .collect(Collectors.toMap(LikeRepository.TargetCount::getTargetId,
                        LikeRepository.TargetCount::getCount));
    }

    /** The targets the given user has liked. */
    @Transactional(readOnly = true)
    public List<Like> likedByUser(User user) {
        return likeRepository.findByUser(user);
    }

    private void validate(String targetType, String targetId) {
        validateType(targetType);
        if (targetId == null || targetId.isBlank()) {
            throw new IllegalArgumentException("targetId is required");
        }
    }

    private void validateType(String targetType) {
        if (!ALLOWED_TYPES.contains(targetType)) {
            throw new IllegalArgumentException("targetType must be one of " + ALLOWED_TYPES);
        }
    }
}
