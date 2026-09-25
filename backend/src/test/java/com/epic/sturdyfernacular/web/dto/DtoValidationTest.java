package com.epic.sturdyfernacular.web.dto;

import com.epic.sturdyfernacular.domain.Priority;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class DtoValidationTest {

    private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

    @Test
    void create_blankTitleFails() {
        var req = new CreateTicketRequest("  ", "D", Priority.HIGH, null);
        assertThat(validator.validate(req)).isNotEmpty();
    }

    @Test
    void create_oversizeTitleFails() {
        var req = new CreateTicketRequest("x".repeat(201), "D", Priority.HIGH, null);
        assertThat(validator.validate(req)).isNotEmpty();
    }

    @Test
    void create_validPasses() {
        var req = new CreateTicketRequest("Title", "Desc", Priority.HIGH, "bob");
        assertThat(validator.validate(req)).isEmpty();
    }

    @Test
    void create_nullPriorityFails() {
        var req = new CreateTicketRequest("Title", "Desc", null, null);
        assertThat(validator.validate(req)).isNotEmpty();
    }

    @Test
    void comment_blankBodyFails() {
        assertThat(validator.validate(new AddCommentRequest(" "))).isNotEmpty();
    }

    @Test
    void comment_oversizeBodyFails() {
        assertThat(validator.validate(new AddCommentRequest("x".repeat(2001)))).isNotEmpty();
    }

    @Test
    void update_withOnlyStatusHasNoUpdatableField() {
        var req = new UpdateTicketRequest(null, null, null, null, "CLOSED");
        assertThat(req.hasUpdatableField()).isFalse();
    }

    @Test
    void update_withTitleHasUpdatableField() {
        var req = new UpdateTicketRequest("T", null, null, null, null);
        assertThat(req.hasUpdatableField()).isTrue();
    }
}
