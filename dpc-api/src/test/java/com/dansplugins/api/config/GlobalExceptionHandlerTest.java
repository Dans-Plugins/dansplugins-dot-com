package com.dansplugins.api.config;

import com.dansplugins.api.exception.ResourceNotFoundException;
import jakarta.validation.ConstraintViolationException;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.BindingResult;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Collections;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    void handleValidation_returns400WithFieldErrors() {
        BindingResult bindingResult = mock(BindingResult.class);
        when(bindingResult.getFieldErrors()).thenReturn(List.of(
                new FieldError("request", "username", "must not be blank"),
                new FieldError("request", "password", "size must be between 8 and 64")));
        MethodArgumentNotValidException ex = mock(MethodArgumentNotValidException.class);
        when(ex.getBindingResult()).thenReturn(bindingResult);

        ProblemDetail problem = handler.handleValidation(ex);

        assertThat(problem.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST.value());
        assertThat(problem.getTitle()).isEqualTo("Bad Request");
        assertThat(problem.getProperties()).containsKey("errors");
        @SuppressWarnings("unchecked")
        var errors = (java.util.Map<String, String>) problem.getProperties().get("errors");
        assertThat(errors)
                .containsEntry("username", "must not be blank")
                .containsEntry("password", "size must be between 8 and 64");
    }

    @Test
    void handleMethodValidation_returns400() {
        HandlerMethodValidationException ex = mock(HandlerMethodValidationException.class);

        ProblemDetail problem = handler.handleMethodValidation(ex);

        assertThat(problem.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST.value());
        assertThat(problem.getTitle()).isEqualTo("Bad Request");
        assertThat(problem.getDetail()).isEqualTo("Validation failed");
    }

    @Test
    void handleConstraintViolation_returns400() {
        ConstraintViolationException ex = new ConstraintViolationException(Collections.emptySet());

        ProblemDetail problem = handler.handleConstraintViolation(ex);

        assertThat(problem.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST.value());
        assertThat(problem.getDetail()).isEqualTo("Validation failed");
    }

    @Test
    void handleUnreadable_returns400() {
        HttpMessageNotReadableException ex = mock(HttpMessageNotReadableException.class);

        ProblemDetail problem = handler.handleUnreadable(ex);

        assertThat(problem.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST.value());
        assertThat(problem.getDetail()).isEqualTo("Malformed request body");
    }

    @Test
    void handleTypeMismatch_returns400WithParameterName() {
        MethodArgumentTypeMismatchException ex = mock(MethodArgumentTypeMismatchException.class);
        when(ex.getName()).thenReturn("factionId");

        ProblemDetail problem = handler.handleTypeMismatch(ex);

        assertThat(problem.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST.value());
        assertThat(problem.getDetail()).isEqualTo("Invalid value for parameter 'factionId'");
    }

    @Test
    void handleIllegalArgument_returns400WithMessage() {
        ProblemDetail problem = handler.handleIllegalArgument(
                new IllegalArgumentException("bad argument"));

        assertThat(problem.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST.value());
        assertThat(problem.getDetail()).isEqualTo("bad argument");
    }

    @Test
    void handleResourceNotFound_returns404WithMessage() {
        ProblemDetail problem = handler.handleResourceNotFound(
                new ResourceNotFoundException("Account not found"));

        assertThat(problem.getStatus()).isEqualTo(HttpStatus.NOT_FOUND.value());
        assertThat(problem.getTitle()).isEqualTo("Not Found");
        assertThat(problem.getDetail()).isEqualTo("Account not found");
    }

    @Test
    void handleResponseStatus_propagatesStatusAndReason() {
        ProblemDetail problem = handler.handleResponseStatus(
                new ResponseStatusException(HttpStatus.FORBIDDEN, "no access"));

        assertThat(problem.getStatus()).isEqualTo(HttpStatus.FORBIDDEN.value());
        assertThat(problem.getTitle()).isEqualTo(HttpStatus.FORBIDDEN.getReasonPhrase());
        assertThat(problem.getDetail()).isEqualTo("no access");
    }

    @Test
    void handleResponseStatus_fallsBackToReasonPhraseWhenReasonNull() {
        ProblemDetail problem = handler.handleResponseStatus(
                new ResponseStatusException(HttpStatus.FORBIDDEN));

        assertThat(problem.getStatus()).isEqualTo(HttpStatus.FORBIDDEN.value());
        assertThat(problem.getDetail()).isEqualTo(HttpStatus.FORBIDDEN.getReasonPhrase());
    }

    @Test
    void handleGeneral_returns500GenericMessage() {
        ProblemDetail problem = handler.handleGeneral(new RuntimeException("boom"));

        assertThat(problem.getStatus()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR.value());
        assertThat(problem.getTitle()).isEqualTo("Internal Server Error");
        // The raw exception message is deliberately NOT leaked to the client.
        assertThat(problem.getDetail()).isEqualTo("Internal server error");
    }
}
