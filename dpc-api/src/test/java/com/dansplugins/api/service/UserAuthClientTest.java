package com.dansplugins.api.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.lang.reflect.Field;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class UserAuthClientTest {

    private static final String BASE = "http://userauth:9998";

    private UserAuthClient client;
    private MockRestServiceServer server;

    @BeforeEach
    void setUp() throws Exception {
        // Build the client, then bind a MockRestServiceServer to the RestTemplate it
        // constructed (RestTemplateBuilder is final, so reach for the private field).
        this.client = new UserAuthClient(new RestTemplateBuilder(), BASE);
        Field field = UserAuthClient.class.getDeclaredField("restTemplate");
        field.setAccessible(true);
        RestTemplate restTemplate = (RestTemplate) field.get(client);
        this.server = MockRestServiceServer.createServer(restTemplate);
    }

    @Test
    void registerReturnsBody() {
        server.expect(requestTo(BASE + "/register"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("Content-Type", MediaType.APPLICATION_JSON_VALUE))
                .andRespond(withStatus(HttpStatus.CREATED)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("{\"id\":1,\"username\":\"alice\"}"));

        Map<String, Object> result = client.register("alice", "password123");

        assertEquals("alice", result.get("username"));
        server.verify();
    }

    @Test
    void registerPropagatesConflict() {
        server.expect(requestTo(BASE + "/register"))
                .andRespond(withStatus(HttpStatus.CONFLICT));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> client.register("alice", "password123"));
        assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
    }

    @Test
    void loginReturnsTokenBody() {
        server.expect(requestTo(BASE + "/login"))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withSuccess("{\"token\":\"jwt-abc\",\"tokenType\":\"Bearer\"}",
                        MediaType.APPLICATION_JSON));

        Map<String, Object> result = client.login("alice", "password123");

        assertEquals("jwt-abc", result.get("token"));
        server.verify();
    }

    @Test
    void loginPropagatesUnauthorized() {
        server.expect(requestTo(BASE + "/login"))
                .andRespond(withStatus(HttpStatus.UNAUTHORIZED));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> client.login("alice", "wrong"));
        assertEquals(HttpStatus.UNAUTHORIZED, ex.getStatusCode());
    }

    @Test
    void validateReturnsUsernameOnValidToken() {
        server.expect(requestTo(BASE + "/session/validate"))
                .andExpect(method(HttpMethod.GET))
                .andExpect(header("Authorization", "Bearer jwt-abc"))
                .andRespond(withSuccess("{\"valid\":true,\"username\":\"alice\"}", MediaType.APPLICATION_JSON));

        Optional<String> username = client.validate("jwt-abc");

        assertTrue(username.isPresent());
        assertEquals("alice", username.get());
        server.verify();
    }

    @Test
    void validateReturnsEmptyOnUnauthorized() {
        server.expect(requestTo(BASE + "/session/validate"))
                .andRespond(withStatus(HttpStatus.UNAUTHORIZED));

        assertTrue(client.validate("revoked-token").isEmpty());
        server.verify();
    }

    @Test
    void validateReturnsEmptyForBlankOrNullTokenWithoutCallingServer() {
        // No server expectation: a network call would fail verification.
        assertTrue(client.validate("   ").isEmpty());
        assertTrue(client.validate(null).isEmpty());
        server.verify();
    }

    @Test
    void validateSurfaces503OnServerError() {
        server.expect(requestTo(BASE + "/session/validate"))
                .andRespond(withStatus(HttpStatus.INTERNAL_SERVER_ERROR));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> client.validate("jwt-abc"));
        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, ex.getStatusCode());
    }

    @Test
    void logoutSendsBearerToken() {
        server.expect(requestTo(BASE + "/logout"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("Authorization", "Bearer jwt-abc"))
                .andRespond(withSuccess("{\"message\":\"logged out\"}", MediaType.APPLICATION_JSON));

        client.logout("jwt-abc");

        server.verify();
    }
}
