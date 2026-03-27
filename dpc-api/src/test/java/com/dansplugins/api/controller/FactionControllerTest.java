package com.dansplugins.api.controller;

import com.dansplugins.api.entity.Faction;
import com.dansplugins.api.repository.FactionRepository;
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

    private static final String API_KEY = "test-api-key";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private FactionRepository factionRepository;

    @BeforeEach
    void setUp() {
        factionRepository.deleteAll();
    }

    @Test
    void createFaction_withValidApiKey_returnsCreated() throws Exception {
        String body = """
                {
                    "name": "The Knights",
                    "serverId": "server-1",
                    "memberCount": 10,
                    "description": "A noble faction"
                }
                """;

        mockMvc.perform(post("/api/v1/factions")
                        .header("X-API-Key", API_KEY)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name", is("The Knights")))
                .andExpect(jsonPath("$.serverId", is("server-1")))
                .andExpect(jsonPath("$.memberCount", is(10)))
                .andExpect(jsonPath("$.id").exists());
    }

    @Test
    void createFaction_withoutApiKey_returnsUnauthorized() throws Exception {
        String body = """
                {
                    "name": "The Knights",
                    "serverId": "server-1",
                    "memberCount": 10
                }
                """;

        mockMvc.perform(post("/api/v1/factions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void createFaction_withInvalidApiKey_returnsUnauthorized() throws Exception {
        String body = """
                {
                    "name": "The Knights",
                    "serverId": "server-1",
                    "memberCount": 10
                }
                """;

        mockMvc.perform(post("/api/v1/factions")
                        .header("X-API-Key", "wrong-key")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void createFaction_withMissingName_returnsBadRequest() throws Exception {
        String body = """
                {
                    "serverId": "server-1",
                    "memberCount": 10
                }
                """;

        mockMvc.perform(post("/api/v1/factions")
                        .header("X-API-Key", API_KEY)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest());
    }

    @Test
    void getAllFactions_returnsPagedResults() throws Exception {
        factionRepository.save(new Faction("Faction A", "server-1", 5, null));
        factionRepository.save(new Faction("Faction B", "server-2", 8, "Description B"));

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
        Faction saved = factionRepository.save(new Faction("Test Faction", "server-1", 3, "Desc"));

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
