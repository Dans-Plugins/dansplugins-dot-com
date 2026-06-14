package com.dansplugins.api.filter;

import com.dansplugins.api.service.UserAuthClient;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.util.List;

/**
 * Authenticates requests by validating the bearer token against UserAuth
 * (see {@link UserAuthClient#validate}). On success the request principal is set to
 * the UserAuth username; downstream authorization (SecurityConfig) decides access.
 * Replaces the former local-JWT filter — dpc-api no longer issues its own tokens.
 */
@Component
@RequiredArgsConstructor
public class UserAuthFilter extends OncePerRequestFilter {

    private final UserAuthClient userAuthClient;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {

        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")
                && SecurityContextHolder.getContext().getAuthentication() == null) {
            String token = authHeader.substring(7);
            try {
                userAuthClient.validate(token).ifPresent(username -> {
                    UsernamePasswordAuthenticationToken auth =
                            new UsernamePasswordAuthenticationToken(username, null, List.of());
                    SecurityContextHolder.getContext().setAuthentication(auth);
                });
            } catch (RuntimeException e) {
                // UserAuth unreachable / errored: leave the request unauthenticated rather than
                // 500 from inside the filter. Protected endpoints then return 401.
                logger.warn("UserAuth token validation failed: " + e.getMessage());
            }
        }

        filterChain.doFilter(request, response);
    }
}
