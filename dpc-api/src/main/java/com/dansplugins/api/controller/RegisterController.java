package com.dansplugins.api.controller;

import com.dansplugins.api.dto.RegisterRequest;
import com.dansplugins.api.dto.RegisterResponse;
import com.dansplugins.api.service.ApiKeyService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/register")
public class RegisterController {

    private final ApiKeyService apiKeyService;

    public RegisterController(ApiKeyService apiKeyService) {
        this.apiKeyService = apiKeyService;
    }

    @PostMapping
    public ResponseEntity<RegisterResponse> register(@Valid @RequestBody RegisterRequest request) {
        String rawKey = apiKeyService.register(request.serverName());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new RegisterResponse(rawKey, request.serverName()));
    }
}
