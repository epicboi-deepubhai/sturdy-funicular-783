package com.epic.sturdyfernacular.web.dto;

import com.epic.sturdyfernacular.domain.Priority;
import com.epic.sturdyfernacular.domain.TicketStatus;

import java.time.Instant;
import java.util.List;

public record TicketDetail(
        Long id,
        String title,
        String description,
        TicketStatus status,
        Priority priority,
        String assignee,
        String createdBy,
        String updatedBy,
        Instant createdAt,
        Instant updatedAt,
        List<CommentResponse> comments
) {
}
