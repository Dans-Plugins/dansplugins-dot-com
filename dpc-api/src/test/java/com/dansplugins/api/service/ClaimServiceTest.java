package com.dansplugins.api.service;

import com.dansplugins.api.entity.Claim;
import com.dansplugins.api.entity.User;
import com.dansplugins.api.repository.ClaimRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ClaimServiceTest {

    @Mock
    private ClaimRepository claimRepository;

    private ClaimService claimService;

    private final User alice = new User("alice");
    private final User bob = new User("bob");

    private ClaimService service() {
        ClaimService service = new ClaimService(claimRepository);
        ReflectionTestUtils.setField(service, "autoReleaseAfterDays", 30);
        return service;
    }

    @Test
    void claim_whenUnclaimed_savesANewClaim() {
        claimService = service();
        when(claimRepository.findByRepoAndNumberAndReleasedAtIsNull("Fiefs", 136)).thenReturn(Optional.empty());
        when(claimRepository.save(any(Claim.class))).thenAnswer(inv -> inv.getArgument(0));

        Claim result = claimService.claim(alice, "Fiefs", 136);

        assertThat(result.getUser()).isEqualTo(alice);
        assertThat(result.getRepo()).isEqualTo("Fiefs");
        assertThat(result.getNumber()).isEqualTo(136);
    }

    @Test
    void claim_bySameUserAgain_isIdempotent() {
        claimService = service();
        Claim existing = new Claim(alice, "Fiefs", 136);
        when(claimRepository.findByRepoAndNumberAndReleasedAtIsNull("Fiefs", 136)).thenReturn(Optional.of(existing));

        Claim result = claimService.claim(alice, "Fiefs", 136);

        assertThat(result).isSameAs(existing);
        verify(claimRepository, never()).save(any(Claim.class));
    }

    @Test
    void claim_alreadyHeldBySomeoneElse_throwsConflict() {
        claimService = service();
        Claim existing = new Claim(bob, "Fiefs", 136);
        when(claimRepository.findByRepoAndNumberAndReleasedAtIsNull("Fiefs", 136)).thenReturn(Optional.of(existing));

        assertThatThrownBy(() -> claimService.claim(alice, "Fiefs", 136))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("bob");
    }

    @Test
    void release_ownClaim_setsReleasedAt() {
        claimService = service();
        Claim existing = new Claim(alice, "Fiefs", 136);
        when(claimRepository.findByRepoAndNumberAndReleasedAtIsNull("Fiefs", 136)).thenReturn(Optional.of(existing));

        claimService.release(alice, "Fiefs", 136);

        assertThat(existing.getReleasedAt()).isNotNull();
        verify(claimRepository).save(existing);
    }

    @Test
    void release_someoneElsesClaim_throwsForbidden() {
        claimService = service();
        Claim existing = new Claim(bob, "Fiefs", 136);
        when(claimRepository.findByRepoAndNumberAndReleasedAtIsNull("Fiefs", 136)).thenReturn(Optional.of(existing));

        assertThatThrownBy(() -> claimService.release(alice, "Fiefs", 136))
                .isInstanceOf(ResponseStatusException.class);
        verify(claimRepository, never()).save(any(Claim.class));
    }

    @Test
    void release_whenNothingClaimed_isANoOp() {
        claimService = service();
        when(claimRepository.findByRepoAndNumberAndReleasedAtIsNull("Fiefs", 136)).thenReturn(Optional.empty());

        claimService.release(alice, "Fiefs", 136);

        verify(claimRepository, never()).save(any(Claim.class));
    }

    @Test
    void autoReleaseStaleClaims_releasesEverythingPastTheCutoff() {
        claimService = service();
        Claim stale = new Claim(alice, "Fiefs", 136);
        when(claimRepository.findByReleasedAtIsNullAndClaimedAtBefore(any(Instant.class)))
                .thenReturn(List.of(stale));

        claimService.autoReleaseStaleClaims();

        assertThat(stale.getReleasedAt()).isNotNull();
        verify(claimRepository, times(1)).saveAll(List.of(stale));
    }
}
