package com.dansplugins.api.repository;

import com.dansplugins.api.entity.Faction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface FactionRepository extends JpaRepository<Faction, UUID> {
}
