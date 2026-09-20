package com.dansplugins.api.controller;

import com.dansplugins.api.service.UserAuthClient;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * The two auth routes that exist for a caller who holds no valid access token — refreshing
 * an expired session and redeeming a password reset — must be reachable without one, and
 * must not need an X-API-Key either.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthControllerRoutesTest {

    @Autowired
    private MockMvc mockMvc;
    @MockBean
    private UserAuthClient userAuthClient;

    @Test
    void refresh_isPublic_andReturnsTheRotatedPair() throws Exception {
        when(userAuthClient.refresh("rt-1"))
                .thenReturn(Map.of("token", "jwt-2", "tokenType", "Bearer", "refreshToken", "rt-2"));

        mockMvc.perform(post("/api/v1/auth/refresh").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"refreshToken\":\"rt-1\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").value("jwt-2"))
                .andExpect(jsonPath("$.refreshToken").value("rt-2"));
    }

    @Test
    void refresh_withoutAToken_is400_andAStaleOne_is401() throws Exception {
        mockMvc.perform(post("/api/v1/auth/refresh").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest());
        verify(userAuthClient, never()).refresh(anyString());

        when(userAuthClient.refresh("stale"))
                .thenThrow(new ResponseStatusException(HttpStatus.UNAUTHORIZED, "invalid refresh token"));
        mockMvc.perform(post("/api/v1/auth/refresh").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"refreshToken\":\"stale\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void passwordReset_isPublic_andAnswersNoContent() throws Exception {
        mockMvc.perform(post("/api/v1/auth/password/reset").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"token\":\"reset-1\",\"newPassword\":\"NewPassword1!\"}"))
                .andExpect(status().isNoContent());
        verify(userAuthClient).resetPassword("reset-1", "NewPassword1!");
    }

    @Test
    void passwordReset_propagatesABadToken_andRequiresBothFields() throws Exception {
        doThrow(new ResponseStatusException(HttpStatus.UNAUTHORIZED, "invalid password reset token"))
                .when(userAuthClient).resetPassword("bad", "NewPassword1!");
        mockMvc.perform(post("/api/v1/auth/password/reset").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"token\":\"bad\",\"newPassword\":\"NewPassword1!\"}"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(post("/api/v1/auth/password/reset").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"token\":\"reset-1\"}"))
                .andExpect(status().isBadRequest());
    }
}
