package com.dansplugins.api.config;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeIn;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeType;
import io.swagger.v3.oas.annotations.info.Info;
import io.swagger.v3.oas.annotations.security.SecurityScheme;
import org.springframework.context.annotation.Configuration;

@Configuration
@OpenAPIDefinition(
        info = @Info(
                title = "DPC Community Data API",
                version = "v1",
                description = "RESTful API for cross-server community data. "
                        + "Register for an API key via POST /api/v1/register, "
                        + "then use it in the X-API-Key header for write endpoints."
        )
)
@SecurityScheme(
        name = "apiKey",
        type = SecuritySchemeType.APIKEY,
        paramName = "X-API-Key",
        in = SecuritySchemeIn.HEADER,
        description = "API key obtained from POST /api/v1/register"
)
public class OpenApiConfig {
}
