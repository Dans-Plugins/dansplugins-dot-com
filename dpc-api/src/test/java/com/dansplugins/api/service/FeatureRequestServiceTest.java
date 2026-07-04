package com.dansplugins.api.service;

import com.dansplugins.api.config.AdminProperties;
import com.dansplugins.api.entity.FeatureRequest;
import com.dansplugins.api.entity.User;
import com.dansplugins.api.exception.ResourceNotFoundException;
import com.dansplugins.api.repository.FeatureRequestRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FeatureRequestServiceTest {

    @Mock
    private FeatureRequestRepository featureRequestRepository;

    @Mock
    private GitHubIssueClient gitHubIssueClient;

    private final User alice = new User("alice");

    private FeatureRequestService service(List<String> admins) {
        return new FeatureRequestService(featureRequestRepository, new AdminProperties(admins), gitHubIssueClient);
    }

    @Test
    void create_savesANewOpenRequest() {
        FeatureRequestService service = service(List.of());
        when(featureRequestRepository.save(any(FeatureRequest.class))).thenAnswer(inv -> inv.getArgument(0));

        FeatureRequest result = service.create(alice, "Fiefs", "Add X", "Because Y");

        assertThat(result.getRepo()).isEqualTo("Fiefs");
        assertThat(result.getStatus()).isEqualTo(FeatureRequest.Status.OPEN);
        assertThat(result.getAuthor()).isEqualTo(alice);
    }

    @Test
    void convert_byNonAdmin_throwsForbidden_andNeverCallsGitHub() {
        FeatureRequestService service = service(List.of("dmccoystephenson"));
        UUID id = UUID.randomUUID();

        assertThatThrownBy(() -> service.convert("alice", id))
                .isInstanceOf(ResponseStatusException.class);
        verify(gitHubIssueClient, never()).createIssue(anyString(), anyString(), anyString());
    }

    @Test
    void convert_missingRequest_throwsNotFound() {
        FeatureRequestService service = service(List.of("dmccoystephenson"));
        UUID id = UUID.randomUUID();
        when(featureRequestRepository.findByIdWithAuthor(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.convert("dmccoystephenson", id))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void convert_byAdmin_createsTheIssue_andMarksConverted() {
        FeatureRequestService service = service(List.of("dmccoystephenson"));
        FeatureRequest request = new FeatureRequest("Fiefs", "Add X", "Because Y", alice);
        UUID id = UUID.randomUUID();
        when(featureRequestRepository.findByIdWithAuthor(id)).thenReturn(Optional.of(request));
        when(gitHubIssueClient.createIssue("Fiefs", "Add X", request.getDescription()
                + "\n\n---\n_Submitted via the dansplugins.com dev portal by alice._"))
                .thenReturn("https://github.com/Dans-Plugins/Fiefs/issues/200");
        when(featureRequestRepository.save(request)).thenReturn(request);

        FeatureRequest result = service.convert("dmccoystephenson", id);

        assertThat(result.getStatus()).isEqualTo(FeatureRequest.Status.CONVERTED);
        assertThat(result.getConvertedIssueUrl()).isEqualTo("https://github.com/Dans-Plugins/Fiefs/issues/200");
    }

    @Test
    void convert_alreadyConverted_isIdempotent_andNeverCallsGitHubAgain() {
        FeatureRequestService service = service(List.of("dmccoystephenson"));
        FeatureRequest request = new FeatureRequest("Fiefs", "Add X", "Because Y", alice);
        request.setStatus(FeatureRequest.Status.CONVERTED);
        request.setConvertedIssueUrl("https://github.com/Dans-Plugins/Fiefs/issues/200");
        UUID id = UUID.randomUUID();
        when(featureRequestRepository.findByIdWithAuthor(id)).thenReturn(Optional.of(request));

        FeatureRequest result = service.convert("dmccoystephenson", id);

        assertThat(result.getConvertedIssueUrl()).isEqualTo("https://github.com/Dans-Plugins/Fiefs/issues/200");
        verify(gitHubIssueClient, never()).createIssue(anyString(), anyString(), anyString());
        verify(featureRequestRepository, never()).save(any());
    }
}
