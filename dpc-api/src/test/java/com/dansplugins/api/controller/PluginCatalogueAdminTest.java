package com.dansplugins.api.controller;

import com.dansplugins.api.entity.Plugin;
import com.dansplugins.api.repository.PluginRepository;
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
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.nullValue;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * The write side of the catalogue: who may call it, what it refuses, and
 * that a PUT replaces the whole entry — tags included, optionals cleared.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@TestPropertySource(properties = "dpc.admin.usernames=admin-alice")
class PluginCatalogueAdminTest {

    private static final String ALICE_BEARER = "Bearer alice-token";
    private static final String ADMIN_BEARER = "Bearer admin-token";

    private static final String NEW_PLUGIN = """
            {"slug":"new-plugin","title":"New Plugin","description":"Does a thing.",
             "githubUrl":"https://github.com/Dans-Plugins/New-Plugin",
             "spigotmcUrl":"https://www.spigotmc.org/resources/new-plugin.1/",
             "bstatsId":"123","iconPath":"/icons/np.png","tags":["survival","mobs","survival"]}
            """;

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private PluginRepository pluginRepository;
    @Autowired
    private UserRepository userRepository;
    @MockBean
    private UserAuthClient userAuthClient;

    @BeforeEach
    void setUp() {
        pluginRepository.deleteAll();
        userRepository.deleteAll();
        when(userAuthClient.validate("alice-token")).thenReturn(Optional.of("alice"));
        when(userAuthClient.validate("admin-token")).thenReturn(Optional.of("admin-alice"));
        Plugin wildPets = new Plugin("wild-pets", "Wild Pets", "Tame any entity.",
                "https://github.com/Dans-Plugins/Wild-Pets",
                "https://www.spigotmc.org/resources/wild-pets.95800/", "12332", "/icons/wp.png");
        wildPets.replaceTags(Set.of("survival", "mobs"));
        pluginRepository.save(wildPets);
    }

    @AfterEach
    void tearDown() {
        pluginRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    void create_withoutToken_returns401() throws Exception {
        mockMvc.perform(post("/api/v1/plugins").contentType(MediaType.APPLICATION_JSON).content(NEW_PLUGIN))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(put("/api/v1/plugins/wild-pets").contentType(MediaType.APPLICATION_JSON).content(NEW_PLUGIN))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void create_byNonAdmin_returns403_andChangesNothing() throws Exception {
        mockMvc.perform(post("/api/v1/plugins").header("Authorization", ALICE_BEARER)
                        .contentType(MediaType.APPLICATION_JSON).content(NEW_PLUGIN))
                .andExpect(status().isForbidden());
        mockMvc.perform(put("/api/v1/plugins/wild-pets").header("Authorization", ALICE_BEARER)
                        .contentType(MediaType.APPLICATION_JSON).content(NEW_PLUGIN))
                .andExpect(status().isForbidden());
        assertThat(pluginRepository.findBySlug("new-plugin")).isEmpty();
        assertThat(pluginRepository.findBySlug("wild-pets").orElseThrow().getTitle()).isEqualTo("Wild Pets");
    }

    @Test
    void create_byAdmin_addsThePlugin_withTagsDeduplicatedAndSorted() throws Exception {
        mockMvc.perform(post("/api/v1/plugins").header("Authorization", ADMIN_BEARER)
                        .contentType(MediaType.APPLICATION_JSON).content(NEW_PLUGIN))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.slug").value("new-plugin"))
                .andExpect(jsonPath("$.bstatsId").value("123"))
                .andExpect(jsonPath("$.tags").value(contains("mobs", "survival")))
                .andExpect(jsonPath("$.firstReleasedAt").value(nullValue()));

        mockMvc.perform(get("/api/v1/plugins/new-plugin"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("New Plugin"));
    }

    @Test
    void create_withAnExistingSlug_returns409() throws Exception {
        String duplicate = NEW_PLUGIN.replace("\"new-plugin\"", "\"wild-pets\"");
        mockMvc.perform(post("/api/v1/plugins").header("Authorization", ADMIN_BEARER)
                        .contentType(MediaType.APPLICATION_JSON).content(duplicate))
                .andExpect(status().isConflict());
    }

    @Test
    void create_withoutASlug_returns400() throws Exception {
        String noSlug = NEW_PLUGIN.replace("\"slug\":\"new-plugin\",", "");
        mockMvc.perform(post("/api/v1/plugins").header("Authorization", ADMIN_BEARER)
                        .contentType(MediaType.APPLICATION_JSON).content(noSlug))
                .andExpect(status().isBadRequest());
    }

    @Test
    void create_rejectsABadSlug_aNonGitHubUrl_aBlankTitle_andABadTag() throws Exception {
        for (String bad : new String[] {
                NEW_PLUGIN.replace("\"new-plugin\"", "\"New Plugin\""),
                NEW_PLUGIN.replace("https://github.com/Dans-Plugins/New-Plugin", "https://example.com/x"),
                NEW_PLUGIN.replace("\"title\":\"New Plugin\"", "\"title\":\"  \""),
                NEW_PLUGIN.replace("\"mobs\"", "\"Not A Tag\"")}) {
            mockMvc.perform(post("/api/v1/plugins").header("Authorization", ADMIN_BEARER)
                            .contentType(MediaType.APPLICATION_JSON).content(bad))
                    .andExpect(status().isBadRequest());
        }
        assertThat(pluginRepository.findBySlug("new-plugin")).isEmpty();
    }

    @Test
    void update_byAdmin_replacesEveryField_clearingOptionalsAndTagsLeftOut() throws Exception {
        String replaced = """
                {"slug":"ignored-here","title":"Wild Pets!","description":"Tame anything.",
                 "githubUrl":"https://github.com/Dans-Plugins/Wild-Pets",
                 "spigotmcUrl":"","bstatsId":null,"iconPath":"/icons/wp.png","tags":["pets"]}
                """;
        mockMvc.perform(put("/api/v1/plugins/wild-pets").header("Authorization", ADMIN_BEARER)
                        .contentType(MediaType.APPLICATION_JSON).content(replaced))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.slug").value("wild-pets"))
                .andExpect(jsonPath("$.title").value("Wild Pets!"))
                // "" and null both mean "no such thing", stored as null.
                .andExpect(jsonPath("$.spigotmcUrl").value(nullValue()))
                .andExpect(jsonPath("$.bstatsId").value(nullValue()))
                .andExpect(jsonPath("$.tags").value(contains("pets")));

        Plugin stored = pluginRepository.findBySlug("wild-pets").orElseThrow();
        assertThat(stored.getTags()).containsExactly("pets");
        assertThat(pluginRepository.findBySlug("ignored-here")).isEmpty();
    }

    @Test
    void update_ofAnUnknownSlug_returns404() throws Exception {
        mockMvc.perform(put("/api/v1/plugins/nope").header("Authorization", ADMIN_BEARER)
                        .contentType(MediaType.APPLICATION_JSON).content(NEW_PLUGIN))
                .andExpect(status().isNotFound());
    }

    @Test
    void selfProfile_saysWhetherTheUserIsAnAdmin() throws Exception {
        mockMvc.perform(get("/api/v1/profile/me").header("Authorization", ADMIN_BEARER))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.admin").value(true));
        mockMvc.perform(get("/api/v1/profile/me").header("Authorization", ALICE_BEARER))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.admin").value(false));
    }
}
