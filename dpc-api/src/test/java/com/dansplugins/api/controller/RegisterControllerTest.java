package com.dansplugins.api.controller;

import com.dansplugins.api.repository.ApiKeyRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class RegisterControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private ApiKeyRepository apiKeyRepository;

    @BeforeEach
    void setUp() {
        apiKeyRepository.deleteAll();
    }

    @Test
    void register_withValidRequest_returnsCreated() throws Exception {
        String body = """
                {
                    "serverName": "my-survival-server"
                }
                """;

        mockMvc.perform(post("/api/v1/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.apiKey", notNullValue()))
                .andExpect(jsonPath("$.serverName", is("my-survival-server")));
    }

    @Test
    void register_noApiKeyRequired() throws Exception {
        String body = """
                {
                    "serverName": "my-server"
                }
                """;

        mockMvc.perform(post("/api/v1/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated());
    }

    @Test
    void register_withMissingServerName_returnsBadRequest() throws Exception {
        String body = """
                {
                }
                """;

        mockMvc.perform(post("/api/v1/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest());
    }

    @Test
    void register_returnedKeyWorksForAuth() throws Exception {
        String registerBody = """
                {
                    "serverName": "auth-test-server"
                }
                """;

        String result = mockMvc.perform(post("/api/v1/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(registerBody))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();

        String returnedKey = objectMapper.readTree(result).get("apiKey").asText();

        String factionBody = """
                [
                    {
                        "name": "Test Faction",
                        "serverId": "server-1",
                        "memberCount": 5
                    }
                ]
                """;

        mockMvc.perform(post("/api/v1/factions")
                        .header("X-API-Key", returnedKey)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(factionBody))
                .andExpect(status().isOk());
    }

    @Test
    void register_withBlankServerName_returnsBadRequest() throws Exception {
        String body = """
                {
                    "serverName": "   "
                }
                """;

        mockMvc.perform(post("/api/v1/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest());
    }

    @Test
    void register_withEmptyBody_returnsBadRequest() throws Exception {
        mockMvc.perform(post("/api/v1/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void register_multipleRegistrations_eachGetsUniqueKey() throws Exception {
        String body1 = """
                {
                    "serverName": "server-1"
                }
                """;
        String body2 = """
                {
                    "serverName": "server-2"
                }
                """;

        String result1 = mockMvc.perform(post("/api/v1/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body1))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        String result2 = mockMvc.perform(post("/api/v1/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body2))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        String key1 = objectMapper.readTree(result1).get("apiKey").asText();
        String key2 = objectMapper.readTree(result2).get("apiKey").asText();

        assertThat(key1).isNotEqualTo(key2);
    }

    @Test
    void register_bothKeysWorkIndependently() throws Exception {
        String body1 = """
                { "serverName": "server-a" }
                """;
        String body2 = """
                { "serverName": "server-b" }
                """;

        String key1 = objectMapper.readTree(
                mockMvc.perform(post("/api/v1/register")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(body1))
                        .andReturn().getResponse().getContentAsString()
        ).get("apiKey").asText();

        String key2 = objectMapper.readTree(
                mockMvc.perform(post("/api/v1/register")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(body2))
                        .andReturn().getResponse().getContentAsString()
        ).get("apiKey").asText();

        String factionBody = """
                [{ "name": "Faction", "serverId": "s1", "memberCount": 1 }]
                """;

        // Both keys should work
        mockMvc.perform(post("/api/v1/factions")
                        .header("X-API-Key", key1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(factionBody))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/v1/factions")
                        .header("X-API-Key", key2)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(factionBody))
                .andExpect(status().isOk());
    }
}
