package com.dansplugins.api.controller;

import com.dansplugins.api.dto.FactionRequest;
import com.dansplugins.api.dto.FactionResponse;
import com.dansplugins.api.service.FactionService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
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
public class FactionController {

    private final FactionService factionService;

    public FactionController(FactionService factionService) {
        this.factionService = factionService;
    }

    @PostMapping
    public ResponseEntity<List<FactionResponse>> syncFactions(
            @Valid @RequestBody List<FactionRequest> requests) {
        List<FactionResponse> responses = factionService.syncFactions(requests);
        return ResponseEntity.status(HttpStatus.OK).body(responses);
    }

    @GetMapping
    public ResponseEntity<Page<FactionResponse>> getAllFactions(Pageable pageable) {
        return ResponseEntity.ok(factionService.getAllFactions(pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<FactionResponse> getFactionById(@PathVariable UUID id) {
        return factionService.getFactionById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}
