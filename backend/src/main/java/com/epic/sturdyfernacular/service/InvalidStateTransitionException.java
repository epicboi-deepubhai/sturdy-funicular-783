package com.epic.sturdyfernacular.service;

import com.epic.sturdyfernacular.domain.TicketStatus;

public class InvalidStateTransitionException extends RuntimeException {
    public InvalidStateTransitionException(TicketStatus current, TicketStatus target) {
        super("Cannot move ticket from " + current + " to " + target);
    }
}
