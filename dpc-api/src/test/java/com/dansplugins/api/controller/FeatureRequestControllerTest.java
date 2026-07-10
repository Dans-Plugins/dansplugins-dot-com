package com.dansplugins.api.controller;

import com.dansplugins.api.repository.FeatureRequestRepository;
import com.dansplugins.api.repository.UserRepository;
import com.dansplugins.api.service.GitHubIssueClient;
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
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Optional;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@TestPropertySource(properties = "dpc.admin.usernames=admin-alice")
class FeatureRequestControllerTest {

    private static final String ALICE_BEARER = "Bearer alice-token";
    private static final String ADMIN_BEARER = "Bearer admin-token";
    private static final String CREATE_REQUEST =
            "{\"repo\":\"Fiefs\",\"title\":\"Add X\",\"description\":\"Because Y\"}";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private FeatureRequestRepository featureRequestRepository;

    @MockBean
    private UserAuthClient userAuthClient;

    @MockBean
    private GitHubIssueClient gitHubIssueClient;

    @BeforeEach
    void setUp() {
        featureRequestRepository.deleteAll();
        userRepository.deleteAll();
        when(userAuthClient.validate("alice-token")).thenReturn(Optional.of("alice"));
        when(userAuthClient.validate("admin-token")).thenReturn(Optional.of("admin-alice"));
    }

    @AfterEach
    void tearDown() {
        featureRequestRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    void create_withoutToken_returns401() throws Exception {
        mockMvc.perform(post("/api/v1/feature-requests")
                        .contentType(MediaType.APPLICATION_JSON).content(CREATE_REQUEST))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void create_thenAppearsInThePublicList() throws Exception {
        mockMvc.perform(post("/api/v1/feature-requests").header("Authorization", ALICE_BEARER)
                        .contentType(MediaType.APPLICATION_JSON).content(CREATE_REQUEST))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("OPEN"))
                .andExpect(jsonPath("$.authorUsername").value("alice"));

        // No token — the list is public.
        mockMvc.perform(get("/api/v1/feature-requests"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].repo").value("Fiefs"));
    }

    @Test
    void list_filteredByRepo() throws Exception {
        mockMvc.perform(post("/api/v1/feature-requests").header("Authorization", ALICE_BEARER)
                .contentType(MediaType.APPLICATION_JSON).content(CREATE_REQUEST)).andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/feature-requests").param("repo", "Medieval-Factions"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void convert_byNonAdmin_returns403() throws Exception {
        String id = createAndGetId();

        mockMvc.perform(post("/api/v1/feature-requests/" + id + "/convert").header("Authorization", ALICE_BEARER))
                .andExpect(status().isForbidden());
    }

    @Test
    void convert_byAdmin_createsTheIssueAndMarksConverted() throws Exception {
        String id = createAndGetId();
        when(gitHubIssueClient.createIssue(anyString(), anyString(), anyString()))
                .thenReturn("https://github.com/Dans-Plugins/Fiefs/issues/200");

        mockMvc.perform(post("/api/v1/feature-requests/" + id + "/convert").header("Authorization", ADMIN_BEARER))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CONVERTED"))
                .andExpect(jsonPath("$.convertedIssueUrl").value("https://github.com/Dans-Plugins/Fiefs/issues/200"));
    }

    private String createAndGetId() throws Exception {
        String response = mockMvc.perform(post("/api/v1/feature-requests").header("Authorization", ALICE_BEARER)
                        .contentType(MediaType.APPLICATION_JSON).content(CREATE_REQUEST))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return response.replaceAll(".*\"id\":\"([^\"]+)\".*", "$1");
    }
}
