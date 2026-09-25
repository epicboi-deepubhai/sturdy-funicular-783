package com.epic.sturdyfernacular.web;

import com.epic.sturdyfernacular.service.CommentsNotAllowedException;
import com.epic.sturdyfernacular.service.InvalidAssigneeException;
import com.epic.sturdyfernacular.service.InvalidStateTransitionException;
import com.epic.sturdyfernacular.service.TicketNotFoundException;
import com.epic.sturdyfernacular.service.TicketReadOnlyException;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import java.time.Instant;
import java.util.List;

@RestControllerAdvice
public class GlobalExceptionHandler {

    public record FieldErrorItem(String field, String message) {
    }

    public record ErrorBody(Instant timestamp, int status, String error, String message,
                            String path, List<FieldErrorItem> fieldErrors) {
    }

    private ResponseEntity<ErrorBody> build(HttpStatus status, String error, String message,
                                            String path, List<FieldErrorItem> fieldErrors) {
        return ResponseEntity.status(status)
                .body(new ErrorBody(Instant.now(), status.value(), error, message, path, fieldErrors));
    }

    @ExceptionHandler(TicketNotFoundException.class)
    public ResponseEntity<ErrorBody> notFound(TicketNotFoundException ex, HttpServletRequest req) {
        return build(HttpStatus.NOT_FOUND, "NOT_FOUND", ex.getMessage(), req.getRequestURI(), null);
    }

    @ExceptionHandler(InvalidStateTransitionException.class)
    public ResponseEntity<ErrorBody> invalidTransition(InvalidStateTransitionException ex, HttpServletRequest req) {
        return build(HttpStatus.CONFLICT, "INVALID_STATE_TRANSITION", ex.getMessage(), req.getRequestURI(), null);
    }

    @ExceptionHandler(TicketReadOnlyException.class)
    public ResponseEntity<ErrorBody> readOnly(TicketReadOnlyException ex, HttpServletRequest req) {
        return build(HttpStatus.CONFLICT, "TICKET_READ_ONLY", ex.getMessage(), req.getRequestURI(), null);
    }

    @ExceptionHandler(CommentsNotAllowedException.class)
    public ResponseEntity<ErrorBody> commentsNotAllowed(CommentsNotAllowedException ex, HttpServletRequest req) {
        return build(HttpStatus.CONFLICT, "COMMENTS_NOT_ALLOWED", ex.getMessage(), req.getRequestURI(), null);
    }

    @ExceptionHandler(InvalidAssigneeException.class)
    public ResponseEntity<ErrorBody> invalidAssignee(InvalidAssigneeException ex, HttpServletRequest req) {
        return build(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", ex.getMessage(), req.getRequestURI(), null);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorBody> validation(MethodArgumentNotValidException ex, HttpServletRequest req) {
        List<FieldErrorItem> fields = ex.getBindingResult().getFieldErrors().stream()
                .map(this::toItem).toList();
        return build(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Validation failed",
                req.getRequestURI(), fields);
    }

    private FieldErrorItem toItem(FieldError fe) {
        return new FieldErrorItem(fe.getField(), fe.getDefaultMessage());
    }

    @ExceptionHandler({HttpMessageNotReadableException.class, MethodArgumentTypeMismatchException.class,
            IllegalArgumentException.class})
    public ResponseEntity<ErrorBody> badRequest(Exception ex, HttpServletRequest req) {
        return build(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", ex.getMessage(), req.getRequestURI(), null);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorBody> unexpected(Exception ex, HttpServletRequest req) {
        return build(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_ERROR",
                "Unexpected error", req.getRequestURI(), null);
    }
}
