package com.dansplugins.api.controller;

import com.dansplugins.api.entity.BacklogItem;
import com.dansplugins.api.repository.BacklogItemRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class BacklogControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private BacklogItemRepository backlogItemRepository;

    @BeforeEach
    void setUp() {
        backlogItemRepository.deleteAll();

        BacklogItem issue = new BacklogItem("Medieval-Factions", 42, BacklogItem.ItemType.ISSUE);
        issue.setTitle("A bug");
        issue.setState(BacklogItem.State.OPEN);
        issue.setHtmlUrl("https://github.com/Dans-Plugins/Medieval-Factions/issues/42");
        issue.setGithubCreatedAt(Instant.parse("2023-07-23T10:12:29Z"));
        issue.setGithubUpdatedAt(Instant.parse("2023-07-23T10:12:29Z"));
        issue.setLastSyncedAt(Instant.now());
        backlogItemRepository.save(issue);

        BacklogItem closed = new BacklogItem("Medieval-Factions", 41, BacklogItem.ItemType.ISSUE);
        closed.setTitle("Already closed");
        closed.setState(BacklogItem.State.CLOSED);
        closed.setHtmlUrl("https://github.com/Dans-Plugins/Medieval-Factions/issues/41");
        closed.setGithubCreatedAt(Instant.parse("2023-07-20T10:12:29Z"));
        closed.setGithubUpdatedAt(Instant.parse("2023-07-20T10:12:29Z"));
        closed.setLastSyncedAt(Instant.now());
        backlogItemRepository.save(closed);
    }

    @AfterEach
    void tearDown() {
        backlogItemRepository.deleteAll();
    }

    @Test
    void items_isPublic_andOnlyReturnsOpenItems() throws Exception {
        mockMvc.perform(get("/api/v1/backlog"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].targetId").value("Medieval-Factions#42"));
    }

    @Test
    void items_filteredByRepo() throws Exception {
        mockMvc.perform(get("/api/v1/backlog").param("repo", "Fiefs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void summary_isPublic_andAggregatesByRepo() throws Exception {
        mockMvc.perform(get("/api/v1/backlog/summary"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].repo").value("Medieval-Factions"))
                .andExpect(jsonPath("$[0].openIssueCount").value(1));
    }
}
