package com.dansplugins.api.repository;

import com.dansplugins.api.entity.Claim;
import com.dansplugins.api.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ClaimRepository extends JpaRepository<Claim, UUID> {

    Optional<Claim> findByRepoAndNumberAndReleasedAtIsNull(String repo, int number);

    /** Fetches the owning user eagerly — callers map straight to a DTO, outside any open session. */
    @Query("select c from Claim c join fetch c.user where c.releasedAt is null")
    List<Claim> findActiveWithUser();

    @Query("select c from Claim c join fetch c.user where c.user = :user and c.releasedAt is null")
    List<Claim> findActiveWithUserByUser(@Param("user") User user);

    /** Active claims older than the cutoff — candidates for auto-release. */
    List<Claim> findByReleasedAtIsNullAndClaimedAtBefore(Instant cutoff);
}
