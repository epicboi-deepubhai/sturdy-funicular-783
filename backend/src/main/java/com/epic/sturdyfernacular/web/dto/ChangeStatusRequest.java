package com.epic.sturdyfernacular.web.dto;

import com.epic.sturdyfernacular.domain.TicketStatus;
import jakarta.validation.constraints.NotNull;

public record ChangeStatusRequest(@NotNull TicketStatus status) {
}
