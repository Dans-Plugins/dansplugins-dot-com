package com.dansplugins.api.service;

import com.dansplugins.api.dto.Badge;
import com.dansplugins.api.entity.User;
import com.dansplugins.api.repository.ApiKeyRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BadgeServiceTest {

    @Mock
    private ApiKeyRepository apiKeyRepository;

    @InjectMocks
    private BadgeService badgeService;

    @Test
    void awardsServerOwner_whenTheUserOwnsAnApiKey() {
        User user = new User("alice");
        when(apiKeyRepository.existsByOwner(user)).thenReturn(true);

        assertThat(badgeService.badgesFor(user)).containsExactly(Badge.SERVER_OWNER);
    }

    @Test
    void awardsNothing_whenTheUserOwnsNoApiKey() {
        User user = new User("bob");
        when(apiKeyRepository.existsByOwner(user)).thenReturn(false);

        assertThat(badgeService.badgesFor(user)).isEmpty();
    }
}
