package com.dansplugins.api.controller;

import com.dansplugins.api.dto.AccountRegisterRequest;
import com.dansplugins.api.dto.AccountResponse;
import com.dansplugins.api.dto.CreateApiKeyRequest;
import com.dansplugins.api.dto.CreateApiKeyResponse;
import com.dansplugins.api.dto.LoginRequest;
import com.dansplugins.api.dto.LoginResponse;
import com.dansplugins.api.entity.Account;
import com.dansplugins.api.entity.ApiKey;
import com.dansplugins.api.service.AccountService;
import com.dansplugins.api.service.JwtService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/accounts")
@RequiredArgsConstructor
@Tag(name = "Accounts", description = "Account registration, login, and API key management")
public class AccountController {

    private final AccountService accountService;
    private final JwtService jwtService;

    @PostMapping("/register")
    @Operation(
            summary = "Register a new account",
            description = "Public endpoint. Creates a new account with username and password. "
                    + "Supports both website and Minecraft plugin registration."
    )
    @ApiResponse(responseCode = "201", description = "Account created successfully")
    @ApiResponse(responseCode = "400", description = "Invalid request or username already taken")
    public ResponseEntity<LoginResponse> register(@Valid @RequestBody AccountRegisterRequest request) {
        accountService.register(request.username(), request.password());
        String token = jwtService.generateToken(request.username());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new LoginResponse(token, request.username()));
    }

    @PostMapping("/login")
    @Operation(
            summary = "Login to an account",
            description = "Authenticates with username and password, returns a JWT token. "
                    + "Supports both website and Minecraft plugin login."
    )
    @ApiResponse(responseCode = "200", description = "Login successful")
    @ApiResponse(responseCode = "401", description = "Invalid credentials")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        return accountService.authenticate(request.username(), request.password())
                .map(account -> {
                    String token = jwtService.generateToken(account.getUsername());
                    return ResponseEntity.ok(new LoginResponse(token, account.getUsername()));
                })
                .orElse(ResponseEntity.status(HttpStatus.UNAUTHORIZED).build());
    }

    @GetMapping("/me")
    @Operation(
            summary = "Get current account profile",
            description = "Returns the authenticated user's account details and API keys.",
            security = @SecurityRequirement(name = "bearerAuth")
    )
    @ApiResponse(responseCode = "200", description = "Profile retrieved")
    @ApiResponse(responseCode = "401", description = "Not authenticated")
    public ResponseEntity<AccountResponse> getProfile(Principal principal) {
        return accountService.findByUsername(principal.getName())
                .map(account -> {
                    List<ApiKey> keys = accountService.getApiKeys(account);
                    return ResponseEntity.ok(AccountResponse.from(account, keys));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/me/api-keys")
    @Operation(
            summary = "Create a new API key",
            description = "Creates a new API key linked to the authenticated account. "
                    + "The raw key is returned once and cannot be retrieved again.",
            security = @SecurityRequirement(name = "bearerAuth")
    )
    @ApiResponse(responseCode = "201", description = "API key created")
    @ApiResponse(responseCode = "401", description = "Not authenticated")
    public ResponseEntity<CreateApiKeyResponse> createApiKey(
            Principal principal,
            @Valid @RequestBody CreateApiKeyRequest request) {
        return accountService.findByUsername(principal.getName())
                .map(account -> {
                    var apiKey = accountService.createApiKey(account, request.serverName());
                    return ResponseEntity.status(HttpStatus.CREATED)
                            .body(new CreateApiKeyResponse(apiKey.getId(), apiKey.getRawKey(),
                                    apiKey.getKeyPrefix(), apiKey.getServerName()));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/me/api-keys/{keyId}")
    @Operation(
            summary = "Delete an API key",
            description = "Deletes an API key owned by the authenticated account.",
            security = @SecurityRequirement(name = "bearerAuth")
    )
    @ApiResponse(responseCode = "204", description = "API key deleted")
    @ApiResponse(responseCode = "404", description = "API key not found or not owned by user")
    @ApiResponse(responseCode = "401", description = "Not authenticated")
    public ResponseEntity<Void> deleteApiKey(Principal principal, @PathVariable UUID keyId) {
        return accountService.findByUsername(principal.getName())
                .map(account -> {
                    if (accountService.deleteApiKey(account, keyId)) {
                        return ResponseEntity.noContent().<Void>build();
                    }
                    return ResponseEntity.notFound().<Void>build();
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
