package com.dansplugins.api.controller;

import com.dansplugins.api.repository.ApiKeyRepository;
import com.dansplugins.api.repository.UserRepository;
import com.dansplugins.api.service.UserAuthClient;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Integration coverage for the UserAuth-backed auth/profile flow. The external
 * UserAuth service is mocked, so token validation and the register/login proxy
 * are exercised without a real network call.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ProfileAuthIntegrationTest {

    private static final String BEARER = "Bearer good-token";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ApiKeyRepository apiKeyRepository;

    @MockBean
    private UserAuthClient userAuthClient;

    @BeforeEach
    void setUp() {
        apiKeyRepository.deleteAll();
        userRepository.deleteAll();
        when(userAuthClient.validate("good-token")).thenReturn(Optional.of("alice"));
    }

    @Test
    void profile_withoutToken_returns401() throws Exception {
        mockMvc.perform(get("/api/v1/profile/me"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void profile_withValidToken_returnsProfileAndCreatesUser() throws Exception {
        mockMvc.perform(get("/api/v1/profile/me").header("Authorization", BEARER))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("alice"))
                .andExpect(jsonPath("$.apiKeys").isArray());
    }

    @Test
    void createApiKey_thenItAppearsInProfile() throws Exception {
        mockMvc.perform(post("/api/v1/profile/me/api-keys")
                        .header("Authorization", BEARER)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"serverName\":\"survival-1\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.apiKey").exists())
                .andExpect(jsonPath("$.serverName").value("survival-1"));

        mockMvc.perform(get("/api/v1/profile/me").header("Authorization", BEARER))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.apiKeys.length()").value(1));
    }

    @Test
    void updateProfile_changesDisplayName() throws Exception {
        mockMvc.perform(patch("/api/v1/profile/me")
                        .header("Authorization", BEARER)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"displayName\":\"Alice the Brave\",\"bio\":\"hi\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.displayName").value("Alice the Brave"))
                .andExpect(jsonPath("$.bio").value("hi"));
    }

    @Test
    void login_proxiesToUserAuthAndReturnsToken() throws Exception {
        when(userAuthClient.login("alice", "pw"))
                .thenReturn(Map.of("token", "good-token", "tokenType", "Bearer"));

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"alice\",\"password\":\"pw\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").value("good-token"));
    }

    @Test
    void register_proxiesToUserAuthThenLogsIn() throws Exception {
        when(userAuthClient.register(any(), any())).thenReturn(Map.of("id", 1, "username", "bob"));
        when(userAuthClient.login("bob", "pw")).thenReturn(Map.of("token", "bob-token"));

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"bob\",\"password\":\"pw\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.token").value("bob-token"));
    }

    @Test
    void register_whenAutoLoginFails_returns201Registered() throws Exception {
        when(userAuthClient.register(any(), any())).thenReturn(Map.of("id", 2, "username", "carol"));
        when(userAuthClient.login("carol", "pw"))
                .thenThrow(new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "down"));

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"carol\",\"password\":\"pw\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.registered").value(true))
                .andExpect(jsonPath("$.tokenIssued").value(false));
    }
}
