package com.dansplugins.api.filter;

import com.dansplugins.api.service.ApiKeyService;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;

@Component
@RequiredArgsConstructor
@Slf4j
public class ApiKeyAuthFilter extends OncePerRequestFilter {

    private static final String API_KEY_HEADER = "X-API-Key";
    private static final Set<String> WRITE_METHODS = Set.of(
            HttpMethod.POST.name(),
            HttpMethod.PUT.name(),
            HttpMethod.PATCH.name(),
            HttpMethod.DELETE.name()
    );
    private static final Set<String> EXEMPT_SUFFIXES = Set.of(
            "/api/v1/accounts/register",
            "/api/v1/accounts/login"
    );

    private final ApiKeyService apiKeyService;
    private final ObjectMapper objectMapper;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {

        String requestUri = request.getRequestURI();
        String contextPath = request.getContextPath();

        // Skip auth for exempt paths
        for (String suffix : EXEMPT_SUFFIXES) {
            String path = contextPath + suffix;
            if (path.equals(requestUri) || (path + "/").equals(requestUri)) {
                filterChain.doFilter(request, response);
                return;
            }
        }

        // Skip auth for account management endpoints (handled by JWT)
        String accountsPath = contextPath + "/api/v1/accounts/";
        if (requestUri.startsWith(accountsPath)) {
            filterChain.doFilter(request, response);
            return;
        }

        if (WRITE_METHODS.contains(request.getMethod())) {
            String providedKey = request.getHeader(API_KEY_HEADER);
            // Trim accidental whitespace from copy/paste; this never accepts a key that
            // didn't already match after trim, so it cannot create a security regression.
            if (providedKey != null) {
                providedKey = providedKey.trim();
            }
            if (providedKey == null || providedKey.isEmpty()
                    || !apiKeyService.isValidKey(providedKey)) {
                // Log just a short prefix to help ops debug a misconfigured plugin
                // without ever logging the secret in full.
                String prefix = (providedKey == null || providedKey.isEmpty())
                        ? "<missing>"
                        : providedKey.substring(0, Math.min(8, providedKey.length()));
                log.warn("Rejected write to {} {}: invalid or missing API key (prefix={})",
                        request.getMethod(), requestUri, prefix);
                writeErrorResponse(response, HttpStatus.UNAUTHORIZED, "Invalid or missing API key");
                return;
            }
        }

        filterChain.doFilter(request, response);
    }

    private void writeErrorResponse(HttpServletResponse response, HttpStatus status, String message)
            throws IOException {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("timestamp", Instant.now().toString());
        body.put("status", status.value());
        body.put("error", status.getReasonPhrase());
        body.put("message", message);

        response.setStatus(status.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        objectMapper.writeValue(response.getOutputStream(), body);
    }
}
