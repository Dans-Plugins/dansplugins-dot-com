package com.dansplugins.api.service;

import com.dansplugins.api.dto.FactionRequest;
import com.dansplugins.api.dto.FactionResponse;
import com.dansplugins.api.entity.Faction;
import com.dansplugins.api.repository.FactionRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Service
public class FactionService {

    private final FactionRepository factionRepository;

    public FactionService(FactionRepository factionRepository) {
        this.factionRepository = factionRepository;
    }

    @Transactional
    public FactionResponse createFaction(FactionRequest request) {
        Faction faction = new Faction(
                request.name(),
                request.serverId(),
                request.memberCount(),
                request.description()
        );
        return FactionResponse.from(factionRepository.save(faction));
    }

    @Transactional(readOnly = true)
    public Page<FactionResponse> getAllFactions(Pageable pageable) {
        return factionRepository.findAll(pageable).map(FactionResponse::from);
    }

    @Transactional(readOnly = true)
    public Optional<FactionResponse> getFactionById(UUID id) {
        return factionRepository.findById(id).map(FactionResponse::from);
    }
}
