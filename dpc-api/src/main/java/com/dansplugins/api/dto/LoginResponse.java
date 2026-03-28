package com.dansplugins.api.dto;

public record LoginResponse(
        String token,
        String username
) {
}
