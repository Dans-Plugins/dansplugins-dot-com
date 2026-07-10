package com.dansplugins.api.service;

import com.dansplugins.api.entity.Claim;
import com.dansplugins.api.entity.User;
import com.dansplugins.api.repository.ClaimRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

/**
 * "I'm working on this" claims on backlog issues/PRs. A claim never grants
 * GitHub write access — it's purely a dpc-api record shown on the /dev console
 * so two people don't unknowingly duplicate the same work, plus a courtesy
 * auto-release after a period of inactivity so an abandoned claim doesn't
 * block others indefinitely.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ClaimService {

    private final ClaimRepository claimRepository;

    @Value("${dpc.claims.auto-release-after-days:30}")
    private int autoReleaseAfterDays;

    /** Claim a target. Idempotent for the same user; conflicts (409) if someone else holds it. */
    @Transactional
    public Claim claim(User user, String repo, int number) {
        Optional<Claim> existing = claimRepository.findByRepoAndNumberAndReleasedAtIsNull(repo, number);
        if (existing.isPresent()) {
            Claim current = existing.get();
            if (sameUser(current.getUser(), user)) {
                return current;
            }
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Already claimed by " + current.getUser().getUserauthUsername());
        }
        return claimRepository.save(new Claim(user, repo, number));
    }

    /** Release the caller's own claim. No-op if they don't hold one; 403 if someone else does. */
    @Transactional
    public void release(User user, String repo, int number) {
        Optional<Claim> existing = claimRepository.findByRepoAndNumberAndReleasedAtIsNull(repo, number);
        if (existing.isEmpty()) {
            return;
        }
        Claim claim = existing.get();
        if (!sameUser(claim.getUser(), user)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "That claim belongs to someone else");
        }
        claim.setReleasedAt(Instant.now());
        claimRepository.save(claim);
    }

    // Compares by the UserAuth username rather than the entity id: id is only
    // populated once persisted, and the two User instances being compared here
    // (one freshly resolved from the auth token, one lazily loaded off a Claim)
    // are never the same JPA-managed instance even when they represent the same
    // person.
    private boolean sameUser(User a, User b) {
        return a.getUserauthUsername().equals(b.getUserauthUsername());
    }

    // Both read paths join-fetch the owning user: the caller (the controller)
    // maps these straight to a DTO after the transaction has closed, and
    // open-in-view is disabled, so a lazy `claim.getUser()` there would throw.
    @Transactional(readOnly = true)
    public List<Claim> activeClaims() {
        return claimRepository.findActiveWithUser();
    }

    @Transactional(readOnly = true)
    public List<Claim> myActiveClaims(User user) {
        return claimRepository.findActiveWithUserByUser(user);
    }

    /** Releases claims idle longer than dpc.claims.auto-release-after-days, once a day. */
    @Scheduled(cron = "${dpc.claims.auto-release-cron:0 0 3 * * *}")
    @Transactional
    public void autoReleaseStaleClaims() {
        Instant cutoff = Instant.now().minus(Duration.ofDays(autoReleaseAfterDays));
        List<Claim> stale = claimRepository.findByReleasedAtIsNullAndClaimedAtBefore(cutoff);
        for (Claim claim : stale) {
            claim.setReleasedAt(Instant.now());
        }
        claimRepository.saveAll(stale);
        if (!stale.isEmpty()) {
            log.info("Auto-released {} claims idle more than {} days", stale.size(), autoReleaseAfterDays);
        }
    }
}
