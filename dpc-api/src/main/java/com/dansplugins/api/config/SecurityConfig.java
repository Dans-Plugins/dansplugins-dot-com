package com.dansplugins.api.config;

import com.dansplugins.api.filter.ApiKeyAuthFilter;
import com.dansplugins.api.filter.UserAuthFilter;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.io.IOException;
import java.time.Instant;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
@Slf4j
public class SecurityConfig {

    private final UserAuthFilter userAuthFilter;
    private final ApiKeyAuthFilter apiKeyAuthFilter;
    private final ObjectMapper objectMapper;

    @Value("${dpc.cors.allowed-origins:*}")
    private String allowedOrigins;

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        List<String> origins = Arrays.stream(allowedOrigins.split(","))
                .map(String::trim)
                .toList();
        config.setAllowedOriginPatterns(origins);
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("Authorization", "Content-Type", "X-API-Key"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(csrf -> csrf.disable())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(ex -> ex.authenticationEntryPoint(jsonAuthenticationEntryPoint()))
                .authorizeHttpRequests(auth -> auth
                        // Public endpoints (auth proxied to UserAuth)
                        .requestMatchers(HttpMethod.POST, "/api/v1/auth/register").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/v1/auth/login").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/factions/**").permitAll()
                        // Public like counts (must precede the authenticated /likes rule below)
                        .requestMatchers(HttpMethod.GET, "/api/v1/likes/counts").permitAll()
                        // Backlog console data is a public aggregation of already-public GitHub data
                        .requestMatchers(HttpMethod.GET, "/api/v1/backlog", "/api/v1/backlog/**").permitAll()
                        // Public single-user profile (GET /api/v1/profile/{username}). The /me rule
                        // is listed first so the authenticated self-profile (which exposes API keys)
                        // is never served by the public path; the single-segment glob then permits
                        // any other username, while the /** rule below still guards PATCH /me and
                        // the /me/api-keys routes.
                        .requestMatchers(HttpMethod.GET, "/api/v1/profile/me").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/v1/profile/*").permitAll()
                        // Swagger/OpenAPI
                        .requestMatchers("/swagger-ui/**", "/swagger-ui.html", "/v3/api-docs/**").permitAll()
                        // Profile, likes, and logout require a valid UserAuth token
                        .requestMatchers("/api/v1/profile/**").authenticated()
                        .requestMatchers("/api/v1/likes", "/api/v1/likes/**").authenticated()
                        .requestMatchers(HttpMethod.POST, "/api/v1/auth/logout").authenticated()
                        // API key auth for faction writes is enforced by ApiKeyAuthFilter (returns 401
                        // before this authorization layer runs); permitAll here avoids a double-reject.
                        .requestMatchers(HttpMethod.POST, "/api/v1/factions").permitAll()
                        .anyRequest().denyAll()
                )
                .addFilterBefore(userAuthFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterAfter(apiKeyAuthFilter, UserAuthFilter.class);

        return http.build();
    }

    private AuthenticationEntryPoint jsonAuthenticationEntryPoint() {
        return (HttpServletRequest request, HttpServletResponse response,
                AuthenticationException authException) -> {
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("timestamp", Instant.now().toString());
            body.put("status", HttpStatus.UNAUTHORIZED.value());
            body.put("error", HttpStatus.UNAUTHORIZED.getReasonPhrase());
            body.put("message", authException.getMessage() != null
                    ? authException.getMessage() : "Authentication required");

            response.setStatus(HttpStatus.UNAUTHORIZED.value());
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            try {
                objectMapper.writeValue(response.getOutputStream(), body);
            } catch (IOException e) {
                log.warn("Failed to write authentication error response", e);
            }
        };
    }
}
