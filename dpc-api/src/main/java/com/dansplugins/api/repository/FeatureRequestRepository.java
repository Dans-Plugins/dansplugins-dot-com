package com.dansplugins.api.repository;

import com.dansplugins.api.entity.FeatureRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface FeatureRequestRepository extends JpaRepository<FeatureRequest, UUID> {

    @Query("select f from FeatureRequest f join fetch f.author order by f.createdAt desc")
    List<FeatureRequest> findAllWithAuthorOrderByCreatedAtDesc();

    @Query("select f from FeatureRequest f join fetch f.author where f.repo = :repo order by f.createdAt desc")
    List<FeatureRequest> findByRepoWithAuthorOrderByCreatedAtDesc(@Param("repo") String repo);

    /** Callers map straight to a DTO, which touches the lazy author — fetch it eagerly here. */
    @Query("select f from FeatureRequest f join fetch f.author where f.id = :id")
    Optional<FeatureRequest> findByIdWithAuthor(@Param("id") UUID id);
}
