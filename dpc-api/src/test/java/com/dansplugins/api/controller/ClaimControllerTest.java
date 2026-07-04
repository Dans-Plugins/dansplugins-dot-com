package com.dansplugins.api.controller;

import com.dansplugins.api.repository.ClaimRepository;
import com.dansplugins.api.repository.UserRepository;
import com.dansplugins.api.service.UserAuthClient;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Optional;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ClaimControllerTest {

    private static final String ALICE_BEARER = "Bearer alice-token";
    private static final String BOB_BEARER = "Bearer bob-token";
    private static final String CLAIM_FIEFS_136 = "{\"repo\":\"Fiefs\",\"number\":136}";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ClaimRepository claimRepository;

    @MockBean
    private UserAuthClient userAuthClient;

    @BeforeEach
    void setUp() {
        claimRepository.deleteAll();
        userRepository.deleteAll();
        when(userAuthClient.validate("alice-token")).thenReturn(Optional.of("alice"));
        when(userAuthClient.validate("bob-token")).thenReturn(Optional.of("bob"));
    }

    @AfterEach
    void tearDown() {
        claimRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    void claim_withoutToken_returns401() throws Exception {
        mockMvc.perform(post("/api/v1/claims").contentType(MediaType.APPLICATION_JSON).content(CLAIM_FIEFS_136))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void claim_thenAppearsInActiveList_publicly() throws Exception {
        mockMvc.perform(post("/api/v1/claims").header("Authorization", ALICE_BEARER)
                        .contentType(MediaType.APPLICATION_JSON).content(CLAIM_FIEFS_136))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.claimantUsername").value("alice"));

        // No token — the active list is public.
        mockMvc.perform(get("/api/v1/claims/active"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].targetId").value("Fiefs#136"))
                .andExpect(jsonPath("$[0].claimantUsername").value("alice"));
    }

    @Test
    void claim_alreadyHeldBySomeoneElse_returns409() throws Exception {
        mockMvc.perform(post("/api/v1/claims").header("Authorization", ALICE_BEARER)
                .contentType(MediaType.APPLICATION_JSON).content(CLAIM_FIEFS_136)).andExpect(status().isOk());

        mockMvc.perform(post("/api/v1/claims").header("Authorization", BOB_BEARER)
                        .contentType(MediaType.APPLICATION_JSON).content(CLAIM_FIEFS_136))
                .andExpect(status().isConflict());
    }

    @Test
    void release_bySomeoneElse_returns403() throws Exception {
        mockMvc.perform(post("/api/v1/claims").header("Authorization", ALICE_BEARER)
                .contentType(MediaType.APPLICATION_JSON).content(CLAIM_FIEFS_136)).andExpect(status().isOk());

        mockMvc.perform(delete("/api/v1/claims").header("Authorization", BOB_BEARER)
                        .contentType(MediaType.APPLICATION_JSON).content(CLAIM_FIEFS_136))
                .andExpect(status().isForbidden());
    }

    @Test
    void release_ownClaim_removesItFromTheActiveList() throws Exception {
        mockMvc.perform(post("/api/v1/claims").header("Authorization", ALICE_BEARER)
                .contentType(MediaType.APPLICATION_JSON).content(CLAIM_FIEFS_136)).andExpect(status().isOk());

        mockMvc.perform(delete("/api/v1/claims").header("Authorization", ALICE_BEARER)
                        .contentType(MediaType.APPLICATION_JSON).content(CLAIM_FIEFS_136))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/v1/claims/active"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void mine_returnsOnlyTheCallersActiveClaims() throws Exception {
        mockMvc.perform(post("/api/v1/claims").header("Authorization", ALICE_BEARER)
                .contentType(MediaType.APPLICATION_JSON).content(CLAIM_FIEFS_136)).andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/claims/me").header("Authorization", BOB_BEARER))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));

        mockMvc.perform(get("/api/v1/claims/me").header("Authorization", ALICE_BEARER))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].targetId").value("Fiefs#136"));
    }
}
