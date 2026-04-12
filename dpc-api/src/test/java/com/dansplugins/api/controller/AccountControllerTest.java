package com.dansplugins.api.controller;

import com.dansplugins.api.service.JwtService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
class AccountControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtService jwtService;

    // --- Registration tests ---

    @Test
    void registerReturnsCreatedWithToken() throws Exception {
        mockMvc.perform(post("/api/v1/accounts/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"testuser\",\"password\":\"password123\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.token", notNullValue()))
                .andExpect(jsonPath("$.username").value("testuser"));
    }

    @Test
    void registerDuplicateUsernameReturnsConflict() throws Exception {
        mockMvc.perform(post("/api/v1/accounts/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"username\":\"dupuser\",\"password\":\"password123\"}"));

        mockMvc.perform(post("/api/v1/accounts/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"dupuser\",\"password\":\"password456\"}"))
                .andExpect(status().isConflict());
    }

    @Test
    void registerMissingUsernameReturnsBadRequest() throws Exception {
        mockMvc.perform(post("/api/v1/accounts/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"password\":\"password123\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void registerShortPasswordReturnsBadRequest() throws Exception {
        mockMvc.perform(post("/api/v1/accounts/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"testuser\",\"password\":\"short\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void registerShortUsernameReturnsBadRequest() throws Exception {
        mockMvc.perform(post("/api/v1/accounts/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"ab\",\"password\":\"password123\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void registerDoesNotRequireAuth() throws Exception {
        mockMvc.perform(post("/api/v1/accounts/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"noauthuser\",\"password\":\"password123\"}"))
                .andExpect(status().isCreated());
    }

    // --- Login tests ---

    @Test
    void loginWithValidCredentialsReturnsToken() throws Exception {
        // Register first
        mockMvc.perform(post("/api/v1/accounts/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"username\":\"loginuser\",\"password\":\"password123\"}"));

        // Login
        mockMvc.perform(post("/api/v1/accounts/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"loginuser\",\"password\":\"password123\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token", notNullValue()))
                .andExpect(jsonPath("$.username").value("loginuser"));
    }

    @Test
    void loginWithWrongPasswordReturnsUnauthorized() throws Exception {
        mockMvc.perform(post("/api/v1/accounts/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"username\":\"wrongpwuser\",\"password\":\"password123\"}"));

        mockMvc.perform(post("/api/v1/accounts/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"wrongpwuser\",\"password\":\"wrongpassword\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void loginWithWrongPasswordReturnsProblemDetail() throws Exception {
        mockMvc.perform(post("/api/v1/accounts/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"username\":\"pdusr\",\"password\":\"password123\"}"));

        mockMvc.perform(post("/api/v1/accounts/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"pdusr\",\"password\":\"wrongpassword\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.title").value("Unauthorized"))
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.detail").value("Invalid credentials"));
    }

    @Test
    void loginWithNonexistentUserReturnsUnauthorized() throws Exception {
        mockMvc.perform(post("/api/v1/accounts/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"nouser\",\"password\":\"password123\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void loginDoesNotRequireAuth() throws Exception {
        mockMvc.perform(post("/api/v1/accounts/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"nouser\",\"password\":\"password123\"}"))
                .andExpect(status().isUnauthorized()); // 401, not 403
    }

    @Test
    void registerValidationErrorReturnsProblemDetailWithFieldNames() throws Exception {
        mockMvc.perform(post("/api/v1/accounts/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"a\",\"password\":\"short\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.title").value("Bad Request"))
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.errors.username").exists())
                .andExpect(jsonPath("$.errors.password").exists());
    }

    // --- Profile tests ---

    @Test
    void getProfileWithValidTokenReturnsAccount() throws Exception {
        // Register
        MvcResult result = mockMvc.perform(post("/api/v1/accounts/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"profileuser\",\"password\":\"password123\"}"))
                .andReturn();

        String token = extractToken(result);

        mockMvc.perform(get("/api/v1/accounts/me")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("profileuser"))
                .andExpect(jsonPath("$.id", notNullValue()))
                .andExpect(jsonPath("$.apiKeys", hasSize(0)));
    }

    @Test
    void getProfileWithoutTokenReturnsUnauthorized() throws Exception {
        mockMvc.perform(get("/api/v1/accounts/me"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void getProfileWithInvalidTokenReturnsUnauthorized() throws Exception {
        mockMvc.perform(get("/api/v1/accounts/me")
                        .header("Authorization", "Bearer invalid-token"))
                .andExpect(status().isUnauthorized());
    }

    // --- API key management tests ---

    @Test
    void createApiKeyReturnsRawKey() throws Exception {
        String token = registerAndGetToken("apikeyuser", "password123");

        mockMvc.perform(post("/api/v1/accounts/me/api-keys")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"serverName\":\"My Server\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.apiKey", notNullValue()))
                .andExpect(jsonPath("$.id", notNullValue()))
                .andExpect(jsonPath("$.keyPrefix", notNullValue()))
                .andExpect(jsonPath("$.serverName").value("My Server"));
    }

    @Test
    void createApiKeyShowsInProfile() throws Exception {
        String token = registerAndGetToken("profilekeyuser", "password123");

        // Create an API key
        mockMvc.perform(post("/api/v1/accounts/me/api-keys")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"serverName\":\"Test Server\"}"));

        // Check profile
        mockMvc.perform(get("/api/v1/accounts/me")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.apiKeys", hasSize(1)))
                .andExpect(jsonPath("$.apiKeys[0].serverName").value("Test Server"))
                .andExpect(jsonPath("$.apiKeys[0].keyPrefix", notNullValue()));
    }

    @Test
    void createApiKeyWithoutAuthReturnsUnauthorized() throws Exception {
        mockMvc.perform(post("/api/v1/accounts/me/api-keys")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"serverName\":\"My Server\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void deleteApiKeyRemovesIt() throws Exception {
        String token = registerAndGetToken("deletekeyuser", "password123");

        // Create an API key
        mockMvc.perform(post("/api/v1/accounts/me/api-keys")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"serverName\":\"Delete Server\"}"));

        // Get profile to find key ID
        MvcResult profileResult = mockMvc.perform(get("/api/v1/accounts/me")
                        .header("Authorization", "Bearer " + token))
                .andReturn();

        String keyId = com.jayway.jsonpath.JsonPath.read(
                profileResult.getResponse().getContentAsString(), "$.apiKeys[0].id");

        // Delete the key
        mockMvc.perform(delete("/api/v1/accounts/me/api-keys/" + keyId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());

        // Verify it's gone
        mockMvc.perform(get("/api/v1/accounts/me")
                        .header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.apiKeys", hasSize(0)));
    }

    @Test
    void deleteNonexistentApiKeyReturnsNotFound() throws Exception {
        String token = registerAndGetToken("delnfkeyuser", "password123");

        mockMvc.perform(delete("/api/v1/accounts/me/api-keys/00000000-0000-0000-0000-000000000000")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound());
    }

    @Test
    void deleteNonexistentApiKeyReturnsProblemDetailBody() throws Exception {
        String token = registerAndGetToken("delpdusr", "password123");

        mockMvc.perform(delete("/api/v1/accounts/me/api-keys/00000000-0000-0000-0000-000000000000")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.title").value("Not Found"))
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.detail").value("API key not found"));
    }

    @Test
    void createdApiKeyWorksForFactionSync() throws Exception {
        String token = registerAndGetToken("syncuser", "password123");

        // Create API key via account management
        MvcResult keyResult = mockMvc.perform(post("/api/v1/accounts/me/api-keys")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"serverName\":\"Sync Server\"}"))
                .andReturn();

        String apiKey = com.jayway.jsonpath.JsonPath.read(
                keyResult.getResponse().getContentAsString(), "$.apiKey");

        // Use that API key to sync factions
        mockMvc.perform(post("/api/v1/factions")
                        .header("X-API-Key", apiKey)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("[{\"name\":\"Knights\",\"serverId\":\"srv1\",\"memberCount\":5}]"))
                .andExpect(status().isOk());
    }

    // --- Minecraft plugin support test ---

    @Test
    void minecraftPluginCanRegisterAndManageKeys() throws Exception {
        // Step 1: Plugin registers account (simulating /dpc register <user> <pass>)
        MvcResult regResult = mockMvc.perform(post("/api/v1/accounts/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"mcserver1\",\"password\":\"secure-pass-123\"}"))
                .andExpect(status().isCreated())
                .andReturn();

        String token = extractToken(regResult);

        // Step 2: Plugin logs in (simulating /dpc login <user> <pass>)
        MvcResult loginResult = mockMvc.perform(post("/api/v1/accounts/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"mcserver1\",\"password\":\"secure-pass-123\"}"))
                .andExpect(status().isOk())
                .andReturn();

        token = extractToken(loginResult);

        // Step 3: Plugin creates API key for data sync
        MvcResult keyResult = mockMvc.perform(post("/api/v1/accounts/me/api-keys")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"serverName\":\"MC Server 1\"}"))
                .andExpect(status().isCreated())
                .andReturn();

        String apiKey = com.jayway.jsonpath.JsonPath.read(
                keyResult.getResponse().getContentAsString(), "$.apiKey");

        // Step 4: Plugin uses API key for faction data sync
        mockMvc.perform(post("/api/v1/factions")
                        .header("X-API-Key", apiKey)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("[{\"name\":\"Builders\",\"serverId\":\"mc-srv-1\",\"memberCount\":3}]"))
                .andExpect(status().isOk());

        // Step 5: Plugin checks profile to see API keys
        mockMvc.perform(get("/api/v1/accounts/me")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.apiKeys", hasSize(1)));
    }

    // Helper methods

    private String registerAndGetToken(String username, String password) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/accounts/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"" + username + "\",\"password\":\"" + password + "\"}"))
                .andReturn();
        return extractToken(result);
    }

    private String extractToken(MvcResult result) throws Exception {
        return com.jayway.jsonpath.JsonPath.read(
                result.getResponse().getContentAsString(), "$.token");
    }
}
