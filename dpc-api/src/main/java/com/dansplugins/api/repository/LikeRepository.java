package com.dansplugins.api.repository;

import com.dansplugins.api.entity.Like;
import com.dansplugins.api.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface LikeRepository extends JpaRepository<Like, UUID> {

    boolean existsByUserAndTargetTypeAndTargetId(User user, String targetType, String targetId);

    long deleteByUserAndTargetTypeAndTargetId(User user, String targetType, String targetId);

    long countByTargetTypeAndTargetId(String targetType, String targetId);

    List<Like> findByUser(User user);

    /** Aggregate like counts per target id for one target type. */
    @Query("select l.targetId as targetId, count(l) as count "
            + "from LikeRecord l where l.targetType = :targetType group by l.targetId")
    List<TargetCount> countsByTargetType(@Param("targetType") String targetType);

    interface TargetCount {
        String getTargetId();

        long getCount();
    }
}
