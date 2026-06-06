package com.dansplugins.api.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Login/registration response containing JWT token")
public record LoginResponse(
        @Schema(description = "JWT bearer token for authenticated requests")
        String token,

        @Schema(description = "Username of the authenticated account")
        String username
) {
}
