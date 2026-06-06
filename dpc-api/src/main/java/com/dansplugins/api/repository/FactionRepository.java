package com.dansplugins.api.repository;

import com.dansplugins.api.entity.Faction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface FactionRepository extends JpaRepository<Faction, UUID> {

    Optional<Faction> findByIdAndActiveTrue(UUID id);

    @Query("SELECT f FROM Faction f WHERE f.serverId = :serverId AND f.name IN :names")
    List<Faction> findByServerIdAndNameIn(@Param("serverId") String serverId,
                                          @Param("names") Collection<String> names);

    Page<Faction> findByActiveTrue(Pageable pageable);

    long countByServerIdAndActiveTrue(String serverId);

    @Query("SELECT f.name FROM Faction f WHERE f.serverId = :serverId AND f.active = true AND f.name NOT IN :names")
    List<String> findActiveNamesByServerIdAndNameNotIn(@Param("serverId") String serverId,
                                                       @Param("names") Collection<String> names);

    @Modifying
    @Query("UPDATE Faction f SET f.active = false WHERE f.serverId = :serverId AND f.active = true AND f.name IN :names")
    int deactivateByServerIdAndNameIn(@Param("serverId") String serverId,
                                      @Param("names") Collection<String> names);
}
