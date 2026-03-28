package com.dansplugins.api.service;

import com.dansplugins.api.repository.ApiKeyRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ApiKeyServiceTest {

    @Mock
    private ApiKeyRepository apiKeyRepository;

    @InjectMocks
    private ApiKeyService apiKeyService;

    @Test
    void isValidKey_withMatchingHash_returnsTrue() {
        String rawKey = "test-api-key";
        String expectedHash = apiKeyService.sha256(rawKey);

        when(apiKeyRepository.existsByKeyHash(expectedHash)).thenReturn(true);

        assertThat(apiKeyService.isValidKey(rawKey)).isTrue();
    }

    @Test
    void isValidKey_withUnknownKey_returnsFalse() {
        when(apiKeyRepository.existsByKeyHash(any())).thenReturn(false);

        assertThat(apiKeyService.isValidKey("unknown-key")).isFalse();
    }

    @Test
    void isValidKey_hashIsDeterministic() {
        String rawKey = "test-key-123";
        String hash1 = apiKeyService.sha256(rawKey);
        String hash2 = apiKeyService.sha256(rawKey);

        assertThat(hash1).isEqualTo(hash2);
    }

    @Test
    void sha256_producesValidHexHash() {
        String hash = apiKeyService.sha256("test");

        // SHA-256 produces a 64-char hex string
        assertThat(hash).hasSize(64);
        assertThat(hash).matches("[0-9a-f]{64}");
    }

    @Test
    void sha256_differentInputsProduceDifferentHashes() {
        String hash1 = apiKeyService.sha256("key-1");
        String hash2 = apiKeyService.sha256("key-2");

        assertThat(hash1).isNotEqualTo(hash2);
    }
}
