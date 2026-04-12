package com.dansplugins.api.controller;

import com.dansplugins.api.dto.FactionRequest;
import com.dansplugins.api.dto.FactionResponse;
import com.dansplugins.api.service.FactionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/factions")
@RequiredArgsConstructor
@Validated
@Tag(name = "Factions", description = "Endpoints for faction data management")
public class FactionController {

    private final FactionService factionService;

    @PostMapping
    @Operation(
            summary = "Sync factions (bulk upsert)",
            description = "Accepts a JSON array of factions, upserts by (name, serverId). Requires API key.",
            security = @SecurityRequirement(name = "apiKey")
    )
    @ApiResponse(responseCode = "200", description = "Factions synced successfully")
    @ApiResponse(responseCode = "401", description = "Invalid or missing API key")
    public ResponseEntity<List<FactionResponse>> syncFactions(
            @Valid @RequestBody List<FactionRequest> requests) {
        List<FactionResponse> responses = factionService.syncFactions(requests);
        return ResponseEntity.status(HttpStatus.OK).body(responses);
    }

    @GetMapping
    @Operation(summary = "List factions (paginated)", description = "Returns a paginated list of all factions. Public endpoint.")
    @ApiResponse(responseCode = "200", description = "Factions retrieved successfully")
    public ResponseEntity<Page<FactionResponse>> getAllFactions(Pageable pageable) {
        return ResponseEntity.ok(factionService.getAllFactions(pageable));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get faction by ID", description = "Returns a single faction by UUID. Public endpoint.")
    @ApiResponse(responseCode = "200", description = "Faction found")
    @ApiResponse(responseCode = "404", description = "Faction not found")
    public ResponseEntity<FactionResponse> getFactionById(
            @Parameter(description = "Faction UUID") @PathVariable UUID id) {
        return factionService.getFactionById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}
