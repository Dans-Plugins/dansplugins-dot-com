package com.dansplugins.api.controller;

import com.dansplugins.api.repository.LikeRepository;
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
class LikeControllerTest {

    private static final String BEARER = "Bearer good-token";
    private static final String LIKE_MF = "{\"targetType\":\"plugin\",\"targetId\":\"mf\"}";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private LikeRepository likeRepository;

    @MockBean
    private UserAuthClient userAuthClient;

    @BeforeEach
    void setUp() {
        likeRepository.deleteAll();
        userRepository.deleteAll();
        when(userAuthClient.validate("good-token")).thenReturn(Optional.of("alice"));
    }

    @AfterEach
    void tearDown() {
        // The test H2 DB is shared across @SpringBootTest classes; clean up the rows
        // (likes before users, FK order) so a leftover like can't block another
        // class's userRepository.deleteAll().
        likeRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    void like_withoutToken_returns401() throws Exception {
        mockMvc.perform(post("/api/v1/likes").contentType(MediaType.APPLICATION_JSON).content(LIKE_MF))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void like_returnsCount_andIsIdempotent() throws Exception {
        mockMvc.perform(post("/api/v1/likes").header("Authorization", BEARER)
                        .contentType(MediaType.APPLICATION_JSON).content(LIKE_MF))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.count").value(1));

        // Liking again is a no-op — count stays 1.
        mockMvc.perform(post("/api/v1/likes").header("Authorization", BEARER)
                        .contentType(MediaType.APPLICATION_JSON).content(LIKE_MF))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.count").value(1));
    }

    @Test
    void counts_arePublic_andReflectLikes() throws Exception {
        mockMvc.perform(post("/api/v1/likes").header("Authorization", BEARER)
                .contentType(MediaType.APPLICATION_JSON).content(LIKE_MF)).andExpect(status().isOk());

        // No token — counts are public.
        mockMvc.perform(get("/api/v1/likes/counts").param("type", "plugin"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mf").value(1));
    }

    @Test
    void unlike_decrementsCount() throws Exception {
        mockMvc.perform(post("/api/v1/likes").header("Authorization", BEARER)
                .contentType(MediaType.APPLICATION_JSON).content(LIKE_MF)).andExpect(status().isOk());

        mockMvc.perform(delete("/api/v1/likes").header("Authorization", BEARER)
                        .contentType(MediaType.APPLICATION_JSON).content(LIKE_MF))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.count").value(0));
    }

    @Test
    void myLikes_returnsTheUsersLikedTargets() throws Exception {
        mockMvc.perform(post("/api/v1/likes").header("Authorization", BEARER)
                .contentType(MediaType.APPLICATION_JSON).content(LIKE_MF)).andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/likes/me").header("Authorization", BEARER))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].targetType").value("plugin"))
                .andExpect(jsonPath("$[0].targetId").value("mf"));
    }

    @Test
    void like_invalidType_returns400() throws Exception {
        mockMvc.perform(post("/api/v1/likes").header("Authorization", BEARER)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"targetType\":\"bogus\",\"targetId\":\"mf\"}"))
                .andExpect(status().isBadRequest());
    }
}
