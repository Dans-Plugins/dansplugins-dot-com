package com.dansplugins.api.controller;

import com.dansplugins.api.entity.DiscordAnnouncement;
import com.dansplugins.api.repository.DiscordAnnouncementRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class NewsControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private DiscordAnnouncementRepository repository;

    @BeforeEach
    void setUp() {
        repository.deleteAll();
    }

    @Test
    void getNews_isPublic_andReturnsAnnouncementsAsNewsPosts() throws Exception {
        DiscordAnnouncement announcement = new DiscordAnnouncement("555", "1234567890",
                "Server event this weekend\nJoin us!", "Dan", null,
                Instant.parse("2026-06-01T12:00:00Z"));
        repository.save(announcement);

        // No authentication is provided: the endpoint must be public.
        mockMvc.perform(get("/api/v1/news"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].id", is("discord-555")))
                .andExpect(jsonPath("$[0].title", is("Server event this weekend")))
                .andExpect(jsonPath("$[0].source", is("discord")))
                .andExpect(jsonPath("$[0].date", is("2026-06-01")));
    }

    @Test
    void getNews_withNoAnnouncements_returnsEmptyArray() throws Exception {
        mockMvc.perform(get("/api/v1/news"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));
    }
}
