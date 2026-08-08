package com.dansplugins.api.controller;

import com.dansplugins.api.entity.Plugin;
import com.dansplugins.api.repository.PluginRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * The test profile runs on H2 with Flyway disabled, so the V15 seed is absent
 * here and the rows are inserted by hand. The seed itself is exercised against
 * real Postgres by {@code FlywayMigrationTest}.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class PluginControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private PluginRepository pluginRepository;

    @BeforeEach
    void setUp() {
        pluginRepository.deleteAll();
        pluginRepository.save(new Plugin("wild-pets", "Wild Pets", "Tame any entity.",
                "https://github.com/Dans-Plugins/Wild-Pets",
                "https://www.spigotmc.org/resources/wild-pets.95800/", "12332", "/icons/wp.png"));
        // No SpigotMC page, no bStats project, no icon — the nullable columns.
        pluginRepository.save(new Plugin("medieval-cookery", "Medieval Cookery", "Cooking recipes.",
                "https://github.com/Dans-Plugins/Medieval-Cookery", null, null, null));
    }

    @AfterEach
    void tearDown() {
        // The H2 DB is shared across @SpringBootTest classes; leave it as found.
        pluginRepository.deleteAll();
    }

    @Test
    void listsCatalogueAlphabeticallyByTitle() throws Exception {
        mockMvc.perform(get("/api/v1/plugins"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].slug").value("medieval-cookery"))
                .andExpect(jsonPath("$[1].slug").value("wild-pets"));
    }

    @Test
    void listOmitsTheInternalId() throws Exception {
        mockMvc.perform(get("/api/v1/plugins"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").doesNotExist());
    }

    @Test
    void getsOnePluginBySlug() throws Exception {
        mockMvc.perform(get("/api/v1/plugins/wild-pets"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Wild Pets"))
                .andExpect(jsonPath("$.githubUrl").value("https://github.com/Dans-Plugins/Wild-Pets"))
                .andExpect(jsonPath("$.bstatsId").value("12332"));
    }

    @Test
    void servesTheOptionalFieldsAsNullWhenAbsent() throws Exception {
        mockMvc.perform(get("/api/v1/plugins/medieval-cookery"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.spigotmcUrl").doesNotExist())
                .andExpect(jsonPath("$.bstatsId").doesNotExist())
                .andExpect(jsonPath("$.iconPath").doesNotExist());
    }

    @Test
    void returnsNotFoundForAnUnknownSlug() throws Exception {
        mockMvc.perform(get("/api/v1/plugins/not-a-plugin"))
                .andExpect(status().isNotFound());
    }

    @Test
    void isReadableWithoutAuthentication() throws Exception {
        // No Authorization header on any request above; asserted explicitly here
        // because the catalogue being public is a security-config decision, not
        // an accident of the controller.
        mockMvc.perform(get("/api/v1/plugins"))
                .andExpect(status().isOk());
    }
}
