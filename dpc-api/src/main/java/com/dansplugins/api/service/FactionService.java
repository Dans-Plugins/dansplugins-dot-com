package com.dansplugins.api.service;

import com.dansplugins.api.dto.FactionRequest;
import com.dansplugins.api.dto.FactionResponse;
import com.dansplugins.api.entity.Faction;
import com.dansplugins.api.mapper.FactionMapper;
import com.dansplugins.api.repository.FactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Service for faction data synchronization and retrieval.
 */
@Service
@RequiredArgsConstructor
public class FactionService {

    private final FactionRepository factionRepository;
    private final FactionMapper factionMapper;

    @Transactional
    public List<FactionResponse> syncFactions(List<FactionRequest> requests) {
        if (requests.isEmpty()) {
            return List.of();
        }

        // De-duplicate: last-write-wins for same (serverId, name) within a single payload
        record FactionKey(String serverId, String name) {}
        Map<FactionKey, FactionRequest> deduped = new LinkedHashMap<>();
        for (FactionRequest req : requests) {
            deduped.put(new FactionKey(req.serverId(), req.name()), req);
        }

        // Group de-duplicated requests by serverId for bulk fetching
        Map<String, List<FactionRequest>> byServer = deduped.values().stream()
                .collect(Collectors.groupingBy(FactionRequest::serverId));

        List<Faction> results = byServer.entrySet().stream()
                .flatMap(entry -> {
                    String serverId = entry.getKey();
                    List<FactionRequest> serverRequests = entry.getValue();
                    List<String> names = serverRequests.stream()
                            .map(FactionRequest::name)
                            .toList();

                    // Mark factions not in this sync batch as inactive (disbanded)
                    factionRepository.deactivateByServerIdAndNameNotIn(serverId, names);

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
                            faction.setActive(true);
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
                .map(factionMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public Page<FactionResponse> getAllFactions(Pageable pageable) {
        return factionRepository.findByActiveTrue(pageable).map(factionMapper::toResponse);
    }

    @Transactional(readOnly = true)
    public Optional<FactionResponse> getFactionById(UUID id) {
        return factionRepository.findByIdAndActiveTrue(id).map(factionMapper::toResponse);
    }
}
