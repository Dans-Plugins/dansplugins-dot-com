package com.dansplugins.api.repository;

import com.dansplugins.api.entity.Plugin;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PluginRepository extends JpaRepository<Plugin, UUID> {

    /** The slug is the public identifier — resource pages are looked up by it, never by UUID. */
    Optional<Plugin> findBySlug(String slug);

    List<Plugin> findAllByOrderByTitleAsc();
}
