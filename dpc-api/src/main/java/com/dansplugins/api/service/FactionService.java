package com.dansplugins.api.service;

import com.dansplugins.api.dto.FactionRequest;
import com.dansplugins.api.dto.FactionResponse;
import com.dansplugins.api.entity.Faction;
import com.dansplugins.api.repository.FactionRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class FactionService {

    private final FactionRepository factionRepository;

    public FactionService(FactionRepository factionRepository) {
        this.factionRepository = factionRepository;
    }

    @Transactional
    public List<FactionResponse> syncFactions(List<FactionRequest> requests) {
        if (requests.isEmpty()) {
            return List.of();
        }

        // Group requests by serverId to enable bulk fetching
        Map<String, List<FactionRequest>> byServer = requests.stream()
                .collect(Collectors.groupingBy(FactionRequest::serverId));

        List<Faction> results = byServer.entrySet().stream()
                .flatMap(entry -> {
                    String serverId = entry.getKey();
                    List<FactionRequest> serverRequests = entry.getValue();
                    List<String> names = serverRequests.stream()
                            .map(FactionRequest::name)
                            .toList();

                    // Bulk fetch existing factions for this server
                    Map<String, Faction> existing = factionRepository
                            .findByServerIdAndNameIn(serverId, names)
                            .stream()
                            .collect(Collectors.toMap(Faction::getName, Function.identity()));

                    return serverRequests.stream().map(req -> {
                        Faction faction = existing.get(req.name());
                        if (faction != null) {
                            faction.setMemberCount(req.memberCount());
                            faction.setDescription(req.description());
                            faction.setServerIp(req.serverIp());
                            faction.setDiscordLink(req.discordLink());
                        } else {
                            faction = new Faction(
                                    req.name(), req.serverId(), req.memberCount(),
                                    req.description(), req.serverIp(), req.discordLink()
                            );
                        }
                        return faction;
                    });
                })
                .toList();

        return factionRepository.saveAll(results).stream()
                .map(FactionResponse::from)
                .toList();
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
