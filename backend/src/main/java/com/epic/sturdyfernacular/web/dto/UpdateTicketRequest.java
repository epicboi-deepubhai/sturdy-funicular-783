package com.epic.sturdyfernacular.web.dto;

import com.epic.sturdyfernacular.domain.Priority;
import jakarta.validation.constraints.Size;

/**
 * Partial update. All fields optional; at least one must be present (enforced
 * by service). Status is not updatable here; if present it is rejected.
 */
public record UpdateTicketRequest(
        @Size(max = 200) String title,
        @Size(max = 5000) String description,
        Priority priority,
        @Size(max = 64) String assignee,
        String status
) {
    public boolean hasUpdatableField() {
        return title != null || description != null || priority != null || assignee != null;
    }
}
