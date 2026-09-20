package com.dansplugins.api.service;

import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

class GitHubReleaseClientTest {

    @Test
    void lastPageUrl_readsTheRelLastTarget_offAGitHubLinkHeader() {
        String link = "<https://api.github.com/repositories/1/releases?per_page=1&page=2>; rel=\"next\", "
                + "<https://api.github.com/repositories/1/releases?per_page=1&page=87>; rel=\"last\"";

        assertThat(GitHubReleaseClient.lastPageUrl(link))
                .contains("https://api.github.com/repositories/1/releases?per_page=1&page=87");
    }

    @Test
    void lastPageUrl_isEmpty_whenTheHeaderIsAbsentOrNamesNoLastPage() {
        // A single-page result carries no Link header at all, and the last
        // page of a paged one links only to prev and first.
        assertThat(GitHubReleaseClient.lastPageUrl(null)).isEqualTo(Optional.empty());
        assertThat(GitHubReleaseClient.lastPageUrl(
                "<https://api.github.com/repositories/1/releases?per_page=1&page=86>; rel=\"prev\", "
                        + "<https://api.github.com/repositories/1/releases?per_page=1&page=1>; rel=\"first\""))
                .isEmpty();
    }
}
