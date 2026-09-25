package com.epic.sturdyfernacular.web.dto;

import com.epic.sturdyfernacular.domain.Priority;
import com.epic.sturdyfernacular.domain.TicketStatus;

import java.time.Instant;

public record TicketListItem(
        Long id,
        String title,
        TicketStatus status,
        Priority priority,
        String assignee,
        Instant updatedAt
) {
}
