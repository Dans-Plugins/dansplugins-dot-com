package com.dansplugins.api.controller;

import com.dansplugins.api.dto.RegisterRequest;
import com.dansplugins.api.dto.RegisterResponse;
import com.dansplugins.api.service.ApiKeyService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/register")
@RequiredArgsConstructor
@Tag(name = "Registration", description = "Self-service API key registration")
public class RegisterController {

    private final ApiKeyService apiKeyService;

    @PostMapping
    @Operation(
            summary = "Register for an API key",
            description = "Public endpoint. Accepts a server name and returns a one-time raw API key."
    )
    @ApiResponse(responseCode = "201", description = "API key created successfully")
    @ApiResponse(responseCode = "400", description = "Invalid request (missing server name)")
    public ResponseEntity<RegisterResponse> register(@Valid @RequestBody RegisterRequest request) {
        String rawKey = apiKeyService.register(request.serverName());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new RegisterResponse(rawKey, request.serverName()));
    }
}
