package com.dansplugins.api.repository;

import com.dansplugins.api.entity.Faction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface FactionRepository extends JpaRepository<Faction, UUID> {

    Optional<Faction> findByNameAndServerId(String name, String serverId);

    @Query("SELECT f FROM Faction f WHERE f.serverId = :serverId AND f.name IN :names")
    List<Faction> findByServerIdAndNameIn(@Param("serverId") String serverId,
                                          @Param("names") Collection<String> names);
}
