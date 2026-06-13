package com.dansplugins.api.controller;

import com.dansplugins.api.service.UserAuthClient;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

/**
 * Thin proxy to the internal-only UserAuth service so the browser (which cannot
 * reach UserAuth directly) can register, log in, and log out via dpc-api.
 * dpc-api itself no longer stores passwords or issues tokens.
 */
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Tag(name = "Auth", description = "Registration, login, and logout (proxied to UserAuth)")
public class AuthController {

    private final UserAuthClient userAuthClient;

    @PostMapping("/register")
    @Operation(summary = "Register a new account (and log in)")
    public ResponseEntity<Map<String, Object>> register(@RequestBody Map<String, String> request) {
        String username = request.get("username");
        String password = request.get("password");
        requireCredentials(username, password);
        userAuthClient.register(username.trim(), password);
        // Log in immediately so the caller receives a token without a second round-trip.
        Map<String, Object> auth = userAuthClient.login(username.trim(), password);
        return ResponseEntity.status(HttpStatus.CREATED).body(auth);
    }

    @PostMapping("/login")
    @Operation(summary = "Log in, returning a UserAuth token")
    public Map<String, Object> login(@RequestBody Map<String, String> request) {
        String username = request.get("username");
        String password = request.get("password");
        requireCredentials(username, password);
        return userAuthClient.login(username.trim(), password);
    }

    @PostMapping("/logout")
    @Operation(summary = "Revoke the current token")
    public Map<String, String> logout(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorizationHeader) {
        String token = (authorizationHeader != null && authorizationHeader.startsWith("Bearer "))
                ? authorizationHeader.substring(7)
                : null;
        userAuthClient.logout(token);
        return Map.of("message", "logged out");
    }

    private void requireCredentials(String username, String password) {
        if (username == null || username.isBlank() || password == null || password.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Username and password are required");
        }
    }
}
