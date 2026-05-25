package com.dansplugins.api.controller;

import com.dansplugins.api.entity.Faction;
import com.dansplugins.api.repository.AccountRepository;
import com.dansplugins.api.repository.ApiKeyRepository;
import com.dansplugins.api.repository.FactionRepository;
import com.dansplugins.api.service.AccountService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class FactionControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private FactionRepository factionRepository;

    @Autowired
    private ApiKeyRepository apiKeyRepository;

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private AccountService accountService;

    private String apiKey;

    @BeforeEach
    void setUp() {
        factionRepository.deleteAll();
        apiKeyRepository.deleteAll();
        accountRepository.deleteAll();
        var account = accountService.register("test-user", "test-password");
        apiKey = accountService.createApiKey(account, "test-server").getRawKey();
    }

    @Test
    void syncFactions_withValidApiKey_returnsOk() throws Exception {
        String body = """
                [
                    {
                        "name": "The Knights",
                        "serverId": "server-1",
                        "memberCount": 10,
                        "description": "A noble faction"
                    }
                ]
                """;

        mockMvc.perform(post("/api/v1/factions")
                        .header("X-API-Key", apiKey)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].name", is("The Knights")))
                .andExpect(jsonPath("$[0].serverId", is("server-1")))
                .andExpect(jsonPath("$[0].memberCount", is(10)))
                .andExpect(jsonPath("$[0].id").exists());
    }

    @Test
    void syncFactions_withOptionalFields_returnsOk() throws Exception {
        String body = """
                [
                    {
                        "name": "The Knights",
                        "serverId": "server-1",
                        "memberCount": 10,
                        "description": "A noble faction",
                        "serverIp": "192.168.1.1",
                        "discordLink": "https://discord.gg/test"
                    }
                ]
                """;

        mockMvc.perform(post("/api/v1/factions")
                        .header("X-API-Key", apiKey)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].serverIp", is("192.168.1.1")))
                .andExpect(jsonPath("$[0].discordLink", is("https://discord.gg/test")));
    }

    @Test
    void syncFactions_upsertExistingFaction() throws Exception {
        String body = """
                [
                    {
                        "name": "The Knights",
                        "serverId": "server-1",
                        "memberCount": 10,
                        "description": "Original"
                    }
                ]
                """;

        mockMvc.perform(post("/api/v1/factions")
                        .header("X-API-Key", apiKey)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk());

        String updatedBody = """
                [
                    {
                        "name": "The Knights",
                        "serverId": "server-1",
                        "memberCount": 25,
                        "description": "Updated"
                    }
                ]
                """;

        mockMvc.perform(post("/api/v1/factions")
                        .header("X-API-Key", apiKey)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(updatedBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].memberCount", is(25)))
                .andExpect(jsonPath("$[0].description", is("Updated")));

        mockMvc.perform(get("/api/v1/factions"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements", is(1)));
    }

    @Test
    void syncFactions_withoutApiKey_returnsUnauthorized() throws Exception {
        String body = """
                [
                    {
                        "name": "The Knights",
                        "serverId": "server-1",
                        "memberCount": 10
                    }
                ]
                """;

        mockMvc.perform(post("/api/v1/factions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void syncFactions_withInvalidApiKey_returnsUnauthorized() throws Exception {
        String body = """
                [
                    {
                        "name": "The Knights",
                        "serverId": "server-1",
                        "memberCount": 10
                    }
                ]
                """;

        mockMvc.perform(post("/api/v1/factions")
                        .header("X-API-Key", "wrong-key")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void getAllFactions_returnsPagedResults() throws Exception {
        factionRepository.save(new Faction("Faction A", "server-1", 5, null, null, null));
        factionRepository.save(new Faction("Faction B", "server-2", 8, "Description B", null, null));

        mockMvc.perform(get("/api/v1/factions")
                        .param("page", "0")
                        .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(2)))
                .andExpect(jsonPath("$.totalElements", is(2)));
    }

    @Test
    void getAllFactions_excludesInactiveFactions() throws Exception {
        factionRepository.save(new Faction("Active Faction", "server-1", 10, null, null, null));
        Faction inactive = new Faction("Disbanded Faction", "server-1", 5, null, null, null);
        inactive.setActive(false);
        factionRepository.save(inactive);

        mockMvc.perform(get("/api/v1/factions")
                        .param("page", "0")
                        .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.totalElements", is(1)))
                .andExpect(jsonPath("$.content[0].name", is("Active Faction")));
    }

    @Test
    void getAllFactions_noApiKeyRequired() throws Exception {
        mockMvc.perform(get("/api/v1/factions"))
                .andExpect(status().isOk());
    }

    @Test
    void getFactionById_existingFaction_returnsFaction() throws Exception {
        Faction saved = factionRepository.save(
                new Faction("Test Faction", "server-1", 3, "Desc", null, null));

        mockMvc.perform(get("/api/v1/factions/" + saved.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name", is("Test Faction")))
                .andExpect(jsonPath("$.serverId", is("server-1")))
                .andExpect(jsonPath("$.memberCount", is(3)));
    }

    @Test
    void getFactionById_nonExistent_returnsNotFound() throws Exception {
        mockMvc.perform(get("/api/v1/factions/00000000-0000-0000-0000-000000000000"))
                .andExpect(status().isNotFound());
    }

    @Test
    void syncFactions_missingName_returnsBadRequest() throws Exception {
        String body = """
                [
                    {
                        "serverId": "server-1",
                        "memberCount": 10
                    }
                ]
                """;

        mockMvc.perform(post("/api/v1/factions")
                        .header("X-API-Key", apiKey)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest());
    }

    @Test
    void syncFactions_missingServerId_returnsBadRequest() throws Exception {
        String body = """
                [
                    {
                        "name": "Knights",
                        "memberCount": 10
                    }
                ]
                """;

        mockMvc.perform(post("/api/v1/factions")
                        .header("X-API-Key", apiKey)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest());
    }

    @Test
    void syncFactions_missingMemberCount_returnsBadRequest() throws Exception {
        String body = """
                [
                    {
                        "name": "Knights",
                        "serverId": "server-1"
                    }
                ]
                """;

        mockMvc.perform(post("/api/v1/factions")
                        .header("X-API-Key", apiKey)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest());
    }

    @Test
    void syncFactions_negativeMemberCount_returnsBadRequest() throws Exception {
        String body = """
                [
                    {
                        "name": "Knights",
                        "serverId": "server-1",
                        "memberCount": -1
                    }
                ]
                """;

        mockMvc.perform(post("/api/v1/factions")
                        .header("X-API-Key", apiKey)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest());
    }

    @Test
    void syncFactions_emptyArray_returnsOk() throws Exception {
        mockMvc.perform(post("/api/v1/factions")
                        .header("X-API-Key", apiKey)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("[]"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    void syncFactions_duplicatesInPayload_deduplicatesLastWriteWins() throws Exception {
        String body = """
                [
                    {
                        "name": "Knights",
                        "serverId": "server-1",
                        "memberCount": 5,
                        "description": "First"
                    },
                    {
                        "name": "Knights",
                        "serverId": "server-1",
                        "memberCount": 20,
                        "description": "Second"
                    }
                ]
                """;

        mockMvc.perform(post("/api/v1/factions")
                        .header("X-API-Key", apiKey)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].memberCount", is(20)))
                .andExpect(jsonPath("$[0].description", is("Second")));

        // Verify only one row in DB
        assertThat(factionRepository.count()).isEqualTo(1);
    }

    @Test
    void syncFactions_multipleServers_createsAll() throws Exception {
        String body = """
                [
                    {
                        "name": "Knights",
                        "serverId": "server-1",
                        "memberCount": 10
                    },
                    {
                        "name": "Warriors",
                        "serverId": "server-2",
                        "memberCount": 8
                    },
                    {
                        "name": "Mages",
                        "serverId": "server-1",
                        "memberCount": 5
                    }
                ]
                """;

        mockMvc.perform(post("/api/v1/factions")
                        .header("X-API-Key", apiKey)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(3)));

        assertThat(factionRepository.count()).isEqualTo(3);
    }

    @Test
    void syncFactions_setsTimestamps() throws Exception {
        String body = """
                [
                    {
                        "name": "Knights",
                        "serverId": "server-1",
                        "memberCount": 10
                    }
                ]
                """;

        mockMvc.perform(post("/api/v1/factions")
                        .header("X-API-Key", apiKey)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].createdAt", notNullValue()))
                .andExpect(jsonPath("$[0].updatedAt", notNullValue()));
    }

    @Test
    void getAllFactions_respectsPagination() throws Exception {
        for (int i = 0; i < 5; i++) {
            factionRepository.save(new Faction("Faction " + i, "server-1", i, null, null, null));
        }

        mockMvc.perform(get("/api/v1/factions")
                        .param("page", "0")
                        .param("size", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(2)))
                .andExpect(jsonPath("$.totalElements", is(5)))
                .andExpect(jsonPath("$.totalPages", is(3)));

        mockMvc.perform(get("/api/v1/factions")
                        .param("page", "2")
                        .param("size", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)));
    }

    @Test
    void getFactionById_invalidUuidFormat_returnsBadRequest() throws Exception {
        mockMvc.perform(get("/api/v1/factions/not-a-uuid"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void getFactionById_noApiKeyRequired() throws Exception {
        Faction saved = factionRepository.save(
                new Faction("Public Faction", "server-1", 5, null, null, null));

        mockMvc.perform(get("/api/v1/factions/" + saved.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name", is("Public Faction")));
    }

    @Test
    void getFactionById_inactiveFaction_returnsNotFound() throws Exception {
        // Seed an inactive faction directly — the sync safety guard intentionally
        // blocks single-faction deactivations on a server with very few factions,
        // so we cannot drive an inactive row purely through the public sync API
        // in a small fixture. The contract under test here is just "GET returns
        // 404 for inactive", which is independent of how it became inactive.
        Faction disbanded = new Faction("Disbanded", "server-1", 5, null, null, null);
        disbanded.setActive(false);
        UUID id = factionRepository.save(disbanded).getId();

        mockMvc.perform(get("/api/v1/factions/" + id))
                .andExpect(status().isNotFound());
    }

    @Test
    void syncFactions_disbandedFaction_markedInactive() throws Exception {
        // First sync: create two factions on server-1
        String body = """
                [
                    {
                        "name": "Knights",
                        "serverId": "server-1",
                        "memberCount": 10
                    },
                    {
                        "name": "Mages",
                        "serverId": "server-1",
                        "memberCount": 5
                    }
                ]
                """;

        mockMvc.perform(post("/api/v1/factions")
                        .header("X-API-Key", apiKey)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)));

        // Verify both appear in listing
        mockMvc.perform(get("/api/v1/factions"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements", is(2)));

        // Second sync: only Knights remains (Mages disbanded)
        String updatedBody = """
                [
                    {
                        "name": "Knights",
                        "serverId": "server-1",
                        "memberCount": 15
                    }
                ]
                """;

        mockMvc.perform(post("/api/v1/factions")
                        .header("X-API-Key", apiKey)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(updatedBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)));

        // Verify only active faction appears in listing (disbanded Mages excluded)
        mockMvc.perform(get("/api/v1/factions"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements", is(1)))
                .andExpect(jsonPath("$.content[0].name", is("Knights")));

        // Verify total rows still exist in DB (inactive not deleted)
        assertThat(factionRepository.count()).isEqualTo(2);
    }

    @Test
    void syncFactions_disbandedFaction_otherServerUnaffected() throws Exception {
        // Seed enough factions on server-1 that the safety guard's ratio cap
        // does not block the legitimate disband of a single one. server-2 should
        // be untouched by anything happening on server-1.
        String body = """
                [
                    { "name": "Knights", "serverId": "server-1", "memberCount": 10 },
                    { "name": "Mages",   "serverId": "server-1", "memberCount": 4 },
                    { "name": "Rogues",  "serverId": "server-1", "memberCount": 6 },
                    { "name": "Druids",  "serverId": "server-1", "memberCount": 7 },
                    { "name": "Warriors", "serverId": "server-2", "memberCount": 8 }
                ]
                """;

        mockMvc.perform(post("/api/v1/factions")
                        .header("X-API-Key", apiKey)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk());

        // Sync server-1 with all factions except Knights — Knights should disband.
        String server1Update = """
                [
                    { "name": "Mages",   "serverId": "server-1", "memberCount": 4 },
                    { "name": "Rogues",  "serverId": "server-1", "memberCount": 6 },
                    { "name": "Druids",  "serverId": "server-1", "memberCount": 7 }
                ]
                """;

        mockMvc.perform(post("/api/v1/factions")
                        .header("X-API-Key", apiKey)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(server1Update))
                .andExpect(status().isOk());

        // Active total: 3 on server-1 + 1 (Warriors) on server-2 = 4.
        mockMvc.perform(get("/api/v1/factions")
                        .param("size", "50"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements", is(4)));

        // Verify server-2's faction was never touched.
        assertThat(factionRepository.findAll().stream()
                .filter(f -> f.getName().equals("Warriors"))
                .findFirst().orElseThrow().isActive()).isTrue();
    }

    @Test
    void syncFactions_safetyGuard_blocksWipeFromTransientShortBatch() throws Exception {
        // Seed several factions on a server.
        String seed = """
                [
                    { "name": "F1", "serverId": "server-1", "memberCount": 1 },
                    { "name": "F2", "serverId": "server-1", "memberCount": 1 },
                    { "name": "F3", "serverId": "server-1", "memberCount": 1 },
                    { "name": "F4", "serverId": "server-1", "memberCount": 1 },
                    { "name": "F5", "serverId": "server-1", "memberCount": 1 }
                ]
                """;
        mockMvc.perform(post("/api/v1/factions")
                        .header("X-API-Key", apiKey)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(seed))
                .andExpect(status().isOk());

        // Simulate a plugin sending a transiently-short batch (just F1). The
        // ratio guard (4 of 5 = 80% > 50%) must prevent F2..F5 from being
        // wiped out by this single bad sync.
        String bad = """
                [
                    { "name": "F1", "serverId": "server-1", "memberCount": 1 }
                ]
                """;
        mockMvc.perform(post("/api/v1/factions")
                        .header("X-API-Key", apiKey)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(bad))
                .andExpect(status().isOk());

        // All five must still be active — the bad batch only upserted F1.
        mockMvc.perform(get("/api/v1/factions").param("size", "50"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements", is(5)));
    }

    @Test
    void syncFactions_reactivatesDisbandedFaction() throws Exception {
        // First sync: create faction
        String body1 = """
                [
                    {
                        "name": "Knights",
                        "serverId": "server-1",
                        "memberCount": 10
                    },
                    {
                        "name": "Mages",
                        "serverId": "server-1",
                        "memberCount": 5
                    }
                ]
                """;

        mockMvc.perform(post("/api/v1/factions")
                        .header("X-API-Key", apiKey)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body1))
                .andExpect(status().isOk());

        // Second sync: only Knights (Mages disbanded)
        String body2 = """
                [
                    {
                        "name": "Knights",
                        "serverId": "server-1",
                        "memberCount": 15
                    }
                ]
                """;

        mockMvc.perform(post("/api/v1/factions")
                        .header("X-API-Key", apiKey)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body2))
                .andExpect(status().isOk());

        // Third sync: Mages reformed
        String body3 = """
                [
                    {
                        "name": "Knights",
                        "serverId": "server-1",
                        "memberCount": 15
                    },
                    {
                        "name": "Mages",
                        "serverId": "server-1",
                        "memberCount": 3
                    }
                ]
                """;

        mockMvc.perform(post("/api/v1/factions")
                        .header("X-API-Key", apiKey)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body3))
                .andExpect(status().isOk());

        // Both should be active again
        mockMvc.perform(get("/api/v1/factions"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements", is(2)));
    }
}
