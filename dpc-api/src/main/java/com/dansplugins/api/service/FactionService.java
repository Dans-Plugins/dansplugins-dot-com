package com.dansplugins.api.service;

import com.dansplugins.api.config.FactionSyncSafetyProperties;
import com.dansplugins.api.dto.FactionRequest;
import com.dansplugins.api.dto.FactionResponse;
import com.dansplugins.api.entity.Faction;
import com.dansplugins.api.mapper.FactionMapper;
import com.dansplugins.api.repository.FactionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Service for faction data synchronization and retrieval.
 *
 * <p>The {@link #syncFactions} operation is the only path that mutates faction
 * state, so its semantics are documented carefully here. The endpoint is an
 * "authoritative snapshot" upsert: the caller (a Minecraft plugin) sends the
 * full set of factions currently live on its server, and the API:
 * <ol>
 *     <li>creates/updates each one</li>
 *     <li>marks any previously-active faction on the same {@code serverId}
 *         that is NOT in the batch as inactive ("disbanded")</li>
 * </ol>
 *
 * <p>Step 2 is dangerous: a single bad sync (transient empty list during
 * plugin startup, a database reload, or a bug filtering out factions) would
 * wipe the registry for that server. Three guards protect against that, each
 * checked independently in {@link #applyDeactivationGuard}:
 * <ul>
 *     <li><b>Minimum incoming size</b>: batches below
 *         {@link FactionSyncSafetyProperties#minimumIncomingFactions} never
 *         deactivate. Upserts in the batch still apply.</li>
 *     <li><b>Absolute cap</b>: a single sync may not deactivate more than
 *         {@link FactionSyncSafetyProperties#maxDeactivationsPerSync} factions
 *         (set to {@code 0} to disable this guard).</li>
 *     <li><b>Ratio cap</b>: a single sync may not deactivate more than
 *         {@link FactionSyncSafetyProperties#maxDeactivationRatio} of the
 *         server's currently-active factions.</li>
 * </ul>
 * <p>If any guard trips, the deactivation step is skipped (a {@code WARN}
 * log explains which guard fired) and the upserts in the batch still apply.
 *
 * <p>Inactive factions are not deleted; a subsequent sync that includes them
 * reactivates them.
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class FactionService {

    private final FactionRepository factionRepository;
    private final FactionMapper factionMapper;
    private final FactionSyncSafetyProperties safety;

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

        Instant syncTimestamp = Instant.now();

        List<Faction> results = byServer.entrySet().stream()
                .flatMap(entry -> {
                    String serverId = entry.getKey();
                    List<FactionRequest> serverRequests = entry.getValue();
                    List<String> names = serverRequests.stream()
                            .map(FactionRequest::name)
                            .toList();

                    applyDeactivationGuard(serverId, names);

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
                        faction.setLastSyncedAt(syncTimestamp);
                        return faction;
                    });
                })
                .toList();

        return factionRepository.saveAll(results).stream()
                .map(factionMapper::toResponse)
                .toList();
    }

    /**
     * Decide whether the missing-from-batch factions for {@code serverId} are
     * safe to deactivate, and apply the deactivation if so. Logs a warning and
     * leaves all factions active when any safety guard trips.
     */
    private void applyDeactivationGuard(String serverId, List<String> incomingNames) {
        int incomingSize = incomingNames.size();

        if (incomingSize < safety.minimumIncomingFactions()) {
            log.warn("Skipping deactivation for serverId='{}': incoming batch size {} is below "
                            + "the configured minimum of {}. Factions in the batch are still upserted.",
                    serverId, incomingSize, safety.minimumIncomingFactions());
            return;
        }

        List<String> namesToDeactivate =
                factionRepository.findActiveNamesByServerIdAndNameNotIn(serverId, incomingNames);
        int deactivationCount = namesToDeactivate.size();

        if (deactivationCount == 0) {
            return;
        }

        long activeBefore = factionRepository.countByServerIdAndActiveTrue(serverId);

        if (safety.maxDeactivationsPerSync() > 0
                && deactivationCount > safety.maxDeactivationsPerSync()) {
            log.warn("Skipping deactivation for serverId='{}': would deactivate {} factions in a "
                            + "single sync, exceeding the absolute cap of {}. Factions in the batch are still upserted.",
                    serverId, deactivationCount, safety.maxDeactivationsPerSync());
            return;
        }

        if (activeBefore > 0) {
            double ratio = (double) deactivationCount / (double) activeBefore;
            if (ratio > safety.maxDeactivationRatio()) {
                log.warn("Skipping deactivation for serverId='{}': would deactivate {} of {} active "
                                + "factions ({}%), exceeding the configured maximum ratio of {}%. "
                                + "Factions in the batch are still upserted.",
                        serverId, deactivationCount, activeBefore,
                        Math.round(ratio * 100.0),
                        Math.round(safety.maxDeactivationRatio() * 100.0));
                return;
            }
        }

        factionRepository.deactivateByServerIdAndNameIn(serverId, namesToDeactivate);
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
