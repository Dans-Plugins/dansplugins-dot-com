package com.dansplugins.api.service;

import com.dansplugins.api.entity.ApiKey;
import com.dansplugins.api.repository.ApiKeyRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ApiKeyServiceTest {

    @Mock
    private ApiKeyRepository apiKeyRepository;

    @InjectMocks
    private ApiKeyService apiKeyService;

    @Captor
    private ArgumentCaptor<ApiKey> apiKeyCaptor;

    @Test
    void register_returnsNonEmptyKey() {
        when(apiKeyRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        String rawKey = apiKeyService.register("my-server");

        assertThat(rawKey).isNotBlank();
    }

    @Test
    void register_storesHashedKey() {
        when(apiKeyRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        String rawKey = apiKeyService.register("my-server");

        verify(apiKeyRepository).save(apiKeyCaptor.capture());
        ApiKey saved = apiKeyCaptor.getValue();
        assertThat(saved.getKeyHash()).isNotBlank();
        // Hash should not equal the raw key
        assertThat(saved.getKeyHash()).isNotEqualTo(rawKey);
        // Hash should be a 64-char hex SHA-256
        assertThat(saved.getKeyHash()).hasSize(64);
        assertThat(saved.getKeyHash()).matches("[0-9a-f]{64}");
    }

    @Test
    void register_storesServerName() {
        when(apiKeyRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        apiKeyService.register("my-server");

        verify(apiKeyRepository).save(apiKeyCaptor.capture());
        assertThat(apiKeyCaptor.getValue().getServerName()).isEqualTo("my-server");
    }

    @Test
    void register_generatesUniqueKeys() {
        when(apiKeyRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        String key1 = apiKeyService.register("server-1");
        String key2 = apiKeyService.register("server-2");

        assertThat(key1).isNotEqualTo(key2);
    }

    @Test
    void isValidKey_withRegisteredKey_returnsTrue() {
        when(apiKeyRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        String rawKey = apiKeyService.register("my-server");

        // Capture the hash stored during registration
        verify(apiKeyRepository).save(apiKeyCaptor.capture());
        String storedHash = apiKeyCaptor.getValue().getKeyHash();

        // Mock the lookup
        when(apiKeyRepository.existsByKeyHash(storedHash)).thenReturn(true);

        assertThat(apiKeyService.isValidKey(rawKey)).isTrue();
    }

    @Test
    void isValidKey_withUnknownKey_returnsFalse() {
        when(apiKeyRepository.existsByKeyHash(any())).thenReturn(false);

        assertThat(apiKeyService.isValidKey("unknown-key")).isFalse();
    }

    @Test
    void isValidKey_hashIsDeterministic() {
        when(apiKeyRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        String rawKey = apiKeyService.register("server");

        verify(apiKeyRepository).save(apiKeyCaptor.capture());
        String storedHash = apiKeyCaptor.getValue().getKeyHash();

        // Validation should produce the same hash for the same raw key
        when(apiKeyRepository.existsByKeyHash(storedHash)).thenReturn(true);
        assertThat(apiKeyService.isValidKey(rawKey)).isTrue();

        // A different key should produce a different hash
        when(apiKeyRepository.existsByKeyHash(any())).thenReturn(false);
        assertThat(apiKeyService.isValidKey("different-key")).isFalse();
    }
}
