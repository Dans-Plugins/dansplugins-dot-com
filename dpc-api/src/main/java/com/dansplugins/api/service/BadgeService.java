package com.dansplugins.api.service;

import com.dansplugins.api.dto.Badge;
import com.dansplugins.api.entity.User;
import com.dansplugins.api.repository.ApiKeyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

/**
 * Computes the badges a user has earned. Badges are <em>derived</em> from
 * existing state rather than stored, so they cannot drift out of sync. Today the
 * only badge is {@link Badge#SERVER_OWNER} (the user owns at least one API key,
 * i.e. runs a server that syncs with DPC); additional derived or assigned badges
 * plug in here.
 */
@Service
@RequiredArgsConstructor
public class BadgeService {

    private final ApiKeyRepository apiKeyRepository;

    @Transactional(readOnly = true)
    public List<Badge> badgesFor(User user) {
        List<Badge> badges = new ArrayList<>();
        if (apiKeyRepository.existsByOwner(user)) {
            badges.add(Badge.SERVER_OWNER);
        }
        return badges;
    }
}
