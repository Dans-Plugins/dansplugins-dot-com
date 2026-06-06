package com.dansplugins.api.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

class JwtServiceTest {

    private JwtService jwtService;

    @BeforeEach
    void setUp() {
        jwtService = new JwtService(
                "test-secret-key-that-is-at-least-32-bytes-long-for-hmac",
                Duration.ofHours(1));
    }

    @Test
    void generateTokenReturnsNonEmptyString() {
        String token = jwtService.generateToken("testuser");
        assertThat(token).isNotBlank();
    }

    @Test
    void extractUsernameReturnsCorrectUsername() {
        String token = jwtService.generateToken("testuser");
        Optional<String> username = jwtService.extractUsername(token);
        assertThat(username).isPresent().contains("testuser");
    }

    @Test
    void extractUsernameReturnsEmptyForInvalidToken() {
        Optional<String> username = jwtService.extractUsername("invalid-token");
        assertThat(username).isEmpty();
    }

    @Test
    void extractUsernameReturnsEmptyForTamperedToken() {
        String token = jwtService.generateToken("testuser");
        String tampered = token + "tampered";
        Optional<String> username = jwtService.extractUsername(tampered);
        assertThat(username).isEmpty();
    }

    @Test
    void differentUsersGetDifferentTokens() {
        String token1 = jwtService.generateToken("user1");
        String token2 = jwtService.generateToken("user2");
        assertThat(token1).isNotEqualTo(token2);
    }

    @Test
    void expiredTokenReturnsEmpty() {
        JwtService shortLivedService = new JwtService(
                "test-secret-key-that-is-at-least-32-bytes-long-for-hmac",
                Duration.ofMillis(-1)); // already expired
        String token = shortLivedService.generateToken("testuser");
        Optional<String> username = shortLivedService.extractUsername(token);
        assertThat(username).isEmpty();
    }
}
