package com.dansplugins.api.filter;

import com.dansplugins.api.service.ApiKeyService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import jakarta.servlet.FilterChain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ApiKeyAuthFilterTest {

    @Mock
    private ApiKeyService apiKeyService;

    @Mock
    private FilterChain filterChain;

    private ApiKeyAuthFilter filter;

    @BeforeEach
    void setUp() {
        // Real ObjectMapper so the 401 error body is serialized exactly as in production.
        filter = new ApiKeyAuthFilter(apiKeyService, new ObjectMapper());
    }

    private MockHttpServletRequest request(String method, String uri) {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setMethod(method);
        request.setRequestURI(uri);
        return request;
    }

    @Test
    void doFilterInternal_exemptRegisterPath_passesThroughWithoutKey() throws Exception {
        MockHttpServletRequest request = request("POST", "/api/v1/accounts/register");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilterInternal(request, response, filterChain);

        verify(filterChain, times(1)).doFilter(request, response);
        verifyNoInteractions(apiKeyService);
    }

    @Test
    void doFilterInternal_exemptLoginPath_passesThroughWithoutKey() throws Exception {
        MockHttpServletRequest request = request("POST", "/api/v1/accounts/login");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilterInternal(request, response, filterChain);

        verify(filterChain, times(1)).doFilter(request, response);
        verifyNoInteractions(apiKeyService);
    }

    @Test
    void doFilterInternal_accountManagementPath_passesThroughWithoutKey() throws Exception {
        MockHttpServletRequest request = request("DELETE", "/api/v1/accounts/me/keys/abc");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilterInternal(request, response, filterChain);

        verify(filterChain, times(1)).doFilter(request, response);
        verifyNoInteractions(apiKeyService);
    }

    @Test
    void doFilterInternal_readMethod_isNotGatedByApiKey() throws Exception {
        MockHttpServletRequest request = request("GET", "/api/v1/factions");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilterInternal(request, response, filterChain);

        verify(filterChain, times(1)).doFilter(request, response);
        verifyNoInteractions(apiKeyService);
    }

    @Test
    void doFilterInternal_writeWithValidKey_passesThrough() throws Exception {
        MockHttpServletRequest request = request("POST", "/api/v1/factions");
        request.addHeader("X-API-Key", "valid-key");
        MockHttpServletResponse response = new MockHttpServletResponse();
        when(apiKeyService.isValidKey("valid-key")).thenReturn(true);

        filter.doFilterInternal(request, response, filterChain);

        verify(filterChain, times(1)).doFilter(request, response);
        assertThat(response.getStatus()).isEqualTo(HttpStatus.OK.value());
    }

    @Test
    void doFilterInternal_writeWithMissingKey_returns401AndDoesNotProceed() throws Exception {
        MockHttpServletRequest request = request("POST", "/api/v1/factions");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilterInternal(request, response, filterChain);

        verify(filterChain, never()).doFilter(request, response);
        assertThat(response.getStatus()).isEqualTo(HttpStatus.UNAUTHORIZED.value());
        assertThat(response.getContentAsString()).contains("Invalid or missing API key");
    }

    @Test
    void doFilterInternal_writeWithInvalidKey_returns401AndDoesNotProceed() throws Exception {
        MockHttpServletRequest request = request("POST", "/api/v1/factions");
        request.addHeader("X-API-Key", "bogus");
        MockHttpServletResponse response = new MockHttpServletResponse();
        when(apiKeyService.isValidKey("bogus")).thenReturn(false);

        filter.doFilterInternal(request, response, filterChain);

        verify(filterChain, never()).doFilter(request, response);
        assertThat(response.getStatus()).isEqualTo(HttpStatus.UNAUTHORIZED.value());
    }

    @Test
    void doFilterInternal_writeWithWhitespacePaddedKey_isTrimmedBeforeValidation() throws Exception {
        MockHttpServletRequest request = request("PUT", "/api/v1/factions");
        request.addHeader("X-API-Key", "  valid-key  ");
        MockHttpServletResponse response = new MockHttpServletResponse();
        // Only the trimmed form is a valid key; the padded form must be trimmed first.
        when(apiKeyService.isValidKey("valid-key")).thenReturn(true);

        filter.doFilterInternal(request, response, filterChain);

        verify(filterChain, times(1)).doFilter(request, response);
        assertThat(response.getStatus()).isEqualTo(HttpStatus.OK.value());
    }
}
