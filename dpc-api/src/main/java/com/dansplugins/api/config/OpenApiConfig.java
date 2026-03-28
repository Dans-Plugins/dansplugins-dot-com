package com.dansplugins.api.config;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeIn;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeType;
import io.swagger.v3.oas.annotations.info.Info;
import io.swagger.v3.oas.annotations.security.SecurityScheme;
import io.swagger.v3.oas.annotations.security.SecuritySchemes;
import org.springframework.context.annotation.Configuration;

@Configuration
@OpenAPIDefinition(
        info = @Info(
                title = "DPC Community Data API",
                version = "v1",
                description = "RESTful API for cross-server community data. "
                        + "Register an account via POST /api/v1/accounts/register, "
                        + "login via POST /api/v1/accounts/login to get a JWT token, "
                        + "then create API keys via POST /api/v1/accounts/me/api-keys. "
                        + "Use the API key in the X-API-Key header for write endpoints."
        )
)
@SecuritySchemes({
        @SecurityScheme(
                name = "apiKey",
                type = SecuritySchemeType.APIKEY,
                paramName = "X-API-Key",
                in = SecuritySchemeIn.HEADER,
                description = "API key for write endpoints (create via account management)"
        ),
        @SecurityScheme(
                name = "bearerAuth",
                type = SecuritySchemeType.HTTP,
                scheme = "bearer",
                bearerFormat = "JWT",
                description = "JWT token from POST /api/v1/accounts/login"
        )
})
public class OpenApiConfig {
}
