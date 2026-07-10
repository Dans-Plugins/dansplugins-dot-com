package com.dansplugins.api.service;

import com.dansplugins.api.config.AdminProperties;
import com.dansplugins.api.entity.FeatureRequest;
import com.dansplugins.api.entity.User;
import com.dansplugins.api.exception.ResourceNotFoundException;
import com.dansplugins.api.repository.FeatureRequestRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

/**
 * Community-submitted plugin ideas, and their one-way trip into a real GitHub
 * issue once triaged. GitHub stays the eventual home for every idea that goes
 * anywhere — this is intake, not a permanent second backlog.
 */
@Service
@RequiredArgsConstructor
public class FeatureRequestService {

    private final FeatureRequestRepository featureRequestRepository;
    private final AdminProperties adminProperties;
    private final GitHubIssueClient gitHubIssueClient;

    @Transactional
    public FeatureRequest create(User author, String repo, String title, String description) {
        return featureRequestRepository.save(new FeatureRequest(repo, title, description, author));
    }

    @Transactional(readOnly = true)
    public List<FeatureRequest> list(String repo) {
        return (repo == null || repo.isBlank())
                ? featureRequestRepository.findAllWithAuthorOrderByCreatedAtDesc()
                : featureRequestRepository.findByRepoWithAuthorOrderByCreatedAtDesc(repo);
    }

    /**
     * Converts a feature request into a real GitHub issue. Admin-only (see
     * {@link AdminProperties}); idempotent if it's already been converted —
     * repeat clicks don't create duplicate issues.
     */
    @Transactional
    public FeatureRequest convert(String requestingUsername, UUID id) {
        if (!adminProperties.isAdmin(requestingUsername)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only an admin can convert a feature request");
        }
        FeatureRequest featureRequest = featureRequestRepository.findByIdWithAuthor(id)
                .orElseThrow(() -> new ResourceNotFoundException("No feature request with id " + id));

        if (featureRequest.getStatus() == FeatureRequest.Status.CONVERTED) {
            return featureRequest;
        }

        String body = featureRequest.getDescription()
                + "\n\n---\n_Submitted via the dansplugins.com dev portal by "
                + featureRequest.getAuthor().getUserauthUsername() + "._";
        String issueUrl = gitHubIssueClient.createIssue(featureRequest.getRepo(), featureRequest.getTitle(), body);

        featureRequest.setStatus(FeatureRequest.Status.CONVERTED);
        featureRequest.setConvertedIssueUrl(issueUrl);
        return featureRequestRepository.save(featureRequest);
    }
}
