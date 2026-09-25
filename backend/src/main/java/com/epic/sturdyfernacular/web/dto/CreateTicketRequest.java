package com.epic.sturdyfernacular.web.dto;

import com.epic.sturdyfernacular.domain.Priority;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateTicketRequest(
        @NotBlank @Size(max = 200) String title,
        @NotBlank @Size(max = 5000) String description,
        @NotNull Priority priority,
        @Size(max = 64) String assignee
) {
}
