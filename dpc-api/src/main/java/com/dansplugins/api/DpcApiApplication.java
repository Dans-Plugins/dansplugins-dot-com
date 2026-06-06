package com.dansplugins.api;

import com.dansplugins.api.config.DiscordProperties;
import com.dansplugins.api.config.FactionSyncSafetyProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
@EnableConfigurationProperties({FactionSyncSafetyProperties.class, DiscordProperties.class})
public class DpcApiApplication {

    public static void main(String[] args) {
        SpringApplication.run(DpcApiApplication.class, args);
    }
}
