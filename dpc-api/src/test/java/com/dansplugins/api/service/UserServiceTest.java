package com.dansplugins.api.service;

import com.dansplugins.api.entity.ApiKey;
import com.dansplugins.api.entity.User;
import com.dansplugins.api.repository.ApiKeyRepository;
import com.dansplugins.api.repository.UserRepository;
import com.dansplugins.api.util.HashUtil;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private ApiKeyRepository apiKeyRepository;

    @InjectMocks
    private UserService userService;

    @Test
    void getOrCreate_existingUser_returnsItWithoutSaving() {
        User existing = new User("alice");
        when(userRepository.findByUserauthUsername("alice")).thenReturn(Optional.of(existing));

        assertThat(userService.getOrCreate("alice")).isSameAs(existing);
        verify(userRepository, never()).save(any());
    }

    @Test
    void getOrCreate_newUser_createsAndSaves() {
        when(userRepository.findByUserauthUsername("bob")).thenReturn(Optional.empty());
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        User created = userService.getOrCreate("bob");

        assertThat(created.getUserauthUsername()).isEqualTo("bob");
        verify(userRepository).save(any(User.class));
    }

    @Test
    void createApiKey_returnsRawKeyAndPersistsItsHash() {
        User owner = new User("alice");
        when(apiKeyRepository.save(any(ApiKey.class))).thenAnswer(inv -> inv.getArgument(0));

        ApiKey key = userService.createApiKey(owner, "survival-1");

        assertThat(key.getRawKey()).startsWith("dpc_");
        assertThat(key.getKeyPrefix()).isEqualTo(key.getRawKey().substring(0, 8));
        assertThat(key.getKeyHash()).isEqualTo(HashUtil.sha256(key.getRawKey()));
        assertThat(key.getServerName()).isEqualTo("survival-1");
        assertThat(key.getOwner()).isSameAs(owner);
    }

    @Test
    void getApiKeys_delegatesToRepository() {
        User owner = new User("alice");
        ApiKey key = new ApiKey("hash", "dpc_abcd", "srv", owner);
        when(apiKeyRepository.findByOwner(owner)).thenReturn(List.of(key));

        assertThat(userService.getApiKeys(owner)).containsExactly(key);
    }

    @Test
    void deleteApiKey_byOwner_deletesAndReturnsTrue() {
        UUID ownerId = UUID.randomUUID();
        UUID keyId = UUID.randomUUID();
        User owner = mock(User.class);
        when(owner.getId()).thenReturn(ownerId);
        ApiKey key = new ApiKey("hash", "dpc_abcd", "srv", owner);
        when(apiKeyRepository.findById(keyId)).thenReturn(Optional.of(key));

        assertThat(userService.deleteApiKey(owner, keyId)).isTrue();
        verify(apiKeyRepository).delete(key);
    }

    @Test
    void deleteApiKey_byNonOwner_doesNotDeleteAndReturnsFalse() {
        UUID keyId = UUID.randomUUID();
        User requester = mock(User.class);
        when(requester.getId()).thenReturn(UUID.randomUUID());
        User actualOwner = mock(User.class);
        when(actualOwner.getId()).thenReturn(UUID.randomUUID());
        ApiKey key = new ApiKey("hash", "dpc_abcd", "srv", actualOwner);
        when(apiKeyRepository.findById(keyId)).thenReturn(Optional.of(key));

        assertThat(userService.deleteApiKey(requester, keyId)).isFalse();
        verify(apiKeyRepository, never()).delete(any());
    }

    @Test
    void deleteApiKey_unknownKey_returnsFalse() {
        UUID keyId = UUID.randomUUID();
        when(apiKeyRepository.findById(keyId)).thenReturn(Optional.empty());

        assertThat(userService.deleteApiKey(new User("alice"), keyId)).isFalse();
        verify(apiKeyRepository, never()).delete(any());
    }

    @Test
    void updateProfile_setsFieldsAndSaves() {
        User user = new User("alice");
        when(userRepository.save(user)).thenReturn(user);

        userService.updateProfile(user, "Alice the Brave", "https://img/a.png", "hi there");

        assertThat(user.getDisplayName()).isEqualTo("Alice the Brave");
        assertThat(user.getAvatarUrl()).isEqualTo("https://img/a.png");
        assertThat(user.getBio()).isEqualTo("hi there");
        verify(userRepository).save(user);
    }
}
