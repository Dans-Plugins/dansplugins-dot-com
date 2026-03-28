package com.dansplugins.api.controller;

import com.dansplugins.api.entity.Faction;
import com.dansplugins.api.repository.ApiKeyRepository;
import com.dansplugins.api.repository.FactionRepository;
import com.dansplugins.api.service.ApiKeyService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
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
    private ObjectMapper objectMapper;

    @Autowired
    private FactionRepository factionRepository;

    @Autowired
    private ApiKeyRepository apiKeyRepository;

    @Autowired
    private ApiKeyService apiKeyService;

    private String apiKey;

    @BeforeEach
    void setUp() {
        factionRepository.deleteAll();
        apiKeyRepository.deleteAll();
        apiKey = apiKeyService.register("test-server");
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
}
