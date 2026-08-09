package com.dansplugins.api;

import com.dansplugins.api.config.AdminProperties;
import com.dansplugins.api.config.BacklogProperties;
import com.dansplugins.api.config.FactionSyncSafetyProperties;
import com.dansplugins.api.config.FeatureRequestProperties;
import com.dansplugins.api.config.ReleaseSyncProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableConfigurationProperties({FactionSyncSafetyProperties.class, BacklogProperties.class,
        AdminProperties.class, FeatureRequestProperties.class, ReleaseSyncProperties.class})
@EnableScheduling
public class DpcApiApplication {

    public static void main(String[] args) {
        SpringApplication.run(DpcApiApplication.class, args);
    }
}
