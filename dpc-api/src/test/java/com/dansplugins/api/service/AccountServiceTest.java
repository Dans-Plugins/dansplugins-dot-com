package com.dansplugins.api.service;

import com.dansplugins.api.entity.Account;
import com.dansplugins.api.entity.ApiKey;
import com.dansplugins.api.repository.AccountRepository;
import com.dansplugins.api.repository.ApiKeyRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AccountServiceTest {

    @Mock
    private AccountRepository accountRepository;

    @Mock
    private ApiKeyRepository apiKeyRepository;

    private PasswordEncoder passwordEncoder;
    private AccountService accountService;

    @BeforeEach
    void setUp() {
        passwordEncoder = new BCryptPasswordEncoder();
        accountService = new AccountService(accountRepository, apiKeyRepository, passwordEncoder);
    }

    @Test
    void registerCreatesAccountWithHashedPassword() {
        when(accountRepository.existsByUsername("testuser")).thenReturn(false);
        when(accountRepository.save(any(Account.class))).thenAnswer(inv -> inv.getArgument(0));

        Account result = accountService.register("testuser", "password123");

        assertThat(result.getUsername()).isEqualTo("testuser");
        assertThat(passwordEncoder.matches("password123", result.getPasswordHash())).isTrue();
    }

    @Test
    void registerThrowsWhenUsernameExists() {
        when(accountRepository.existsByUsername("existinguser")).thenReturn(true);

        assertThatThrownBy(() -> accountService.register("existinguser", "password"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Username already taken");

        verify(accountRepository, never()).save(any());
    }

    @Test
    void authenticateReturnsAccountForValidCredentials() {
        Account account = new Account("testuser", passwordEncoder.encode("password123"));
        when(accountRepository.findByUsername("testuser")).thenReturn(Optional.of(account));

        Optional<Account> result = accountService.authenticate("testuser", "password123");

        assertThat(result).isPresent();
        assertThat(result.get().getUsername()).isEqualTo("testuser");
    }

    @Test
    void authenticateReturnsEmptyForWrongPassword() {
        Account account = new Account("testuser", passwordEncoder.encode("password123"));
        when(accountRepository.findByUsername("testuser")).thenReturn(Optional.of(account));

        Optional<Account> result = accountService.authenticate("testuser", "wrongpassword");

        assertThat(result).isEmpty();
    }

    @Test
    void authenticateReturnsEmptyForNonexistentUser() {
        when(accountRepository.findByUsername("nouser")).thenReturn(Optional.empty());

        Optional<Account> result = accountService.authenticate("nouser", "password");

        assertThat(result).isEmpty();
    }

    @Test
    void createApiKeyReturnsRawKeyAndSavesHash() {
        Account owner = new Account("testuser", "hash");
        when(apiKeyRepository.save(any(ApiKey.class))).thenAnswer(inv -> inv.getArgument(0));

        String rawKey = accountService.createApiKey(owner, "My Server");

        assertThat(rawKey).isNotBlank();

        ArgumentCaptor<ApiKey> captor = ArgumentCaptor.forClass(ApiKey.class);
        verify(apiKeyRepository).save(captor.capture());
        ApiKey savedKey = captor.getValue();
        assertThat(savedKey.getServerName()).isEqualTo("My Server");
        assertThat(savedKey.getOwner()).isEqualTo(owner);
        assertThat(savedKey.getKeyHash()).isNotEqualTo(rawKey); // hash, not raw
    }

    @Test
    void getApiKeysReturnsKeysForOwner() {
        Account owner = new Account("testuser", "hash");
        List<ApiKey> keys = List.of(new ApiKey("hash1", "Server 1", owner));
        when(apiKeyRepository.findByOwner(owner)).thenReturn(keys);

        List<ApiKey> result = accountService.getApiKeys(owner);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getServerName()).isEqualTo("Server 1");
    }

    @Test
    void findByUsernameReturnsAccount() {
        Account account = new Account("testuser", "hash");
        when(accountRepository.findByUsername("testuser")).thenReturn(Optional.of(account));

        Optional<Account> result = accountService.findByUsername("testuser");

        assertThat(result).isPresent();
    }
}
