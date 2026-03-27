package com.dansplugins.api.config;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

@Configuration
public class ApiKeyConfig {

    @Value("${dpc.api.key}")
    private String apiKey;

    @PostConstruct
    public void validateApiKey() {
        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalStateException(
                    "`dpc.api.key` must be configured (e.g., via DPC_API_KEY environment variable). "
                    + "The API will not start without a configured API key.");
        }
    }
}
