package com.dansplugins.api.service;

import com.dansplugins.api.dto.FactionRequest;
import com.dansplugins.api.dto.FactionResponse;
import com.dansplugins.api.entity.Faction;
import com.dansplugins.api.repository.FactionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FactionServiceTest {

    @Mock
    private FactionRepository factionRepository;

    @InjectMocks
    private FactionService factionService;

    @Captor
    private ArgumentCaptor<List<Faction>> factionsCaptor;

    @Test
    void syncFactions_emptyList_returnsEmptyAndSkipsDb() {
        List<FactionResponse> result = factionService.syncFactions(List.of());

        assertThat(result).isEmpty();
        verify(factionRepository, never()).findByServerIdAndNameIn(any(), any());
        verify(factionRepository, never()).saveAll(any());
    }

    @Test
    void syncFactions_newFaction_createsEntity() {
        FactionRequest req = new FactionRequest("Knights", "server-1", 10, "Desc", "1.2.3.4", "https://discord.gg/x");

        when(factionRepository.findByServerIdAndNameIn("server-1", List.of("Knights")))
                .thenReturn(List.of());
        when(factionRepository.saveAll(any()))
                .thenAnswer(inv -> inv.getArgument(0));

        List<FactionResponse> result = factionService.syncFactions(List.of(req));

        verify(factionRepository).saveAll(factionsCaptor.capture());
        List<Faction> saved = factionsCaptor.getValue();
        assertThat(saved).hasSize(1);

        Faction faction = saved.get(0);
        assertThat(faction.getName()).isEqualTo("Knights");
        assertThat(faction.getServerId()).isEqualTo("server-1");
        assertThat(faction.getMemberCount()).isEqualTo(10);
        assertThat(faction.getDescription()).isEqualTo("Desc");
        assertThat(faction.getServerIp()).isEqualTo("1.2.3.4");
        assertThat(faction.getDiscordLink()).isEqualTo("https://discord.gg/x");
    }

    @Test
    void syncFactions_existingFaction_updatesFields() {
        Faction existing = new Faction("Knights", "server-1", 5, "Old", null, null);
        FactionRequest req = new FactionRequest("Knights", "server-1", 20, "New", "5.6.7.8", "https://discord.gg/y");

        when(factionRepository.findByServerIdAndNameIn("server-1", List.of("Knights")))
                .thenReturn(List.of(existing));
        when(factionRepository.saveAll(any()))
                .thenAnswer(inv -> inv.getArgument(0));

        factionService.syncFactions(List.of(req));

        verify(factionRepository).saveAll(factionsCaptor.capture());
        Faction updated = factionsCaptor.getValue().get(0);
        assertThat(updated.getMemberCount()).isEqualTo(20);
        assertThat(updated.getDescription()).isEqualTo("New");
        assertThat(updated.getServerIp()).isEqualTo("5.6.7.8");
        assertThat(updated.getDiscordLink()).isEqualTo("https://discord.gg/y");
        // Name and serverId should remain unchanged
        assertThat(updated.getName()).isEqualTo("Knights");
        assertThat(updated.getServerId()).isEqualTo("server-1");
    }

    @Test
    void syncFactions_deduplicatesSameKeyInPayload_lastWriteWins() {
        FactionRequest first = new FactionRequest("Knights", "server-1", 5, "First", null, null);
        FactionRequest second = new FactionRequest("Knights", "server-1", 20, "Second", null, null);

        when(factionRepository.findByServerIdAndNameIn("server-1", List.of("Knights")))
                .thenReturn(List.of());
        when(factionRepository.saveAll(any()))
                .thenAnswer(inv -> inv.getArgument(0));

        factionService.syncFactions(List.of(first, second));

        verify(factionRepository).saveAll(factionsCaptor.capture());
        List<Faction> saved = factionsCaptor.getValue();
        assertThat(saved).hasSize(1);
        assertThat(saved.get(0).getMemberCount()).isEqualTo(20);
        assertThat(saved.get(0).getDescription()).isEqualTo("Second");
    }

    @Test
    void syncFactions_multipleServers_batchesByServerId() {
        FactionRequest req1 = new FactionRequest("Knights", "server-1", 10, null, null, null);
        FactionRequest req2 = new FactionRequest("Warriors", "server-2", 8, null, null, null);

        when(factionRepository.findByServerIdAndNameIn(eq("server-1"), any()))
                .thenReturn(List.of());
        when(factionRepository.findByServerIdAndNameIn(eq("server-2"), any()))
                .thenReturn(List.of());
        when(factionRepository.saveAll(any()))
                .thenAnswer(inv -> inv.getArgument(0));

        List<FactionResponse> result = factionService.syncFactions(List.of(req1, req2));

        verify(factionRepository).findByServerIdAndNameIn("server-1", List.of("Knights"));
        verify(factionRepository).findByServerIdAndNameIn("server-2", List.of("Warriors"));
        verify(factionRepository).saveAll(factionsCaptor.capture());
        assertThat(factionsCaptor.getValue()).hasSize(2);
    }

    @Test
    void syncFactions_mixedNewAndExisting_handledCorrectly() {
        Faction existingFaction = new Faction("Knights", "server-1", 5, "Old", null, null);

        FactionRequest updateReq = new FactionRequest("Knights", "server-1", 15, "Updated", null, null);
        FactionRequest newReq = new FactionRequest("Warriors", "server-1", 8, "New faction", null, null);

        when(factionRepository.findByServerIdAndNameIn("server-1", List.of("Knights", "Warriors")))
                .thenReturn(List.of(existingFaction));
        when(factionRepository.saveAll(any()))
                .thenAnswer(inv -> inv.getArgument(0));

        factionService.syncFactions(List.of(updateReq, newReq));

        verify(factionRepository).saveAll(factionsCaptor.capture());
        List<Faction> saved = factionsCaptor.getValue();
        assertThat(saved).hasSize(2);

        Faction updated = saved.stream().filter(f -> f.getName().equals("Knights")).findFirst().orElseThrow();
        assertThat(updated.getMemberCount()).isEqualTo(15);

        Faction created = saved.stream().filter(f -> f.getName().equals("Warriors")).findFirst().orElseThrow();
        assertThat(created.getMemberCount()).isEqualTo(8);
    }

    @Test
    void getAllFactions_delegatesToRepository() {
        Pageable pageable = PageRequest.of(0, 10);
        Faction faction = new Faction("Knights", "server-1", 10, null, null, null);
        Page<Faction> page = new PageImpl<>(List.of(faction), pageable, 1);

        when(factionRepository.findAll(pageable)).thenReturn(page);

        Page<FactionResponse> result = factionService.getAllFactions(pageable);

        assertThat(result.getTotalElements()).isEqualTo(1);
        assertThat(result.getContent().get(0).name()).isEqualTo("Knights");
    }

    @Test
    void getFactionById_existing_returnsResponse() {
        UUID id = UUID.randomUUID();
        Faction faction = new Faction("Knights", "server-1", 10, "Desc", null, null);

        when(factionRepository.findById(id)).thenReturn(Optional.of(faction));

        Optional<FactionResponse> result = factionService.getFactionById(id);

        assertThat(result).isPresent();
        assertThat(result.get().name()).isEqualTo("Knights");
    }

    @Test
    void getFactionById_nonExistent_returnsEmpty() {
        UUID id = UUID.randomUUID();
        when(factionRepository.findById(id)).thenReturn(Optional.empty());

        Optional<FactionResponse> result = factionService.getFactionById(id);

        assertThat(result).isEmpty();
    }
}
