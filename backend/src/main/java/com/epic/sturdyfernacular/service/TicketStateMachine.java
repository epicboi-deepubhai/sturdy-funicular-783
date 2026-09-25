package com.epic.sturdyfernacular.service;

import com.epic.sturdyfernacular.domain.TicketStatus;

import java.util.Map;
import java.util.Set;

/**
 * Ticket status transition rules. Zero Spring annotations, zero repository
 * dependencies. See spec/state-machine.md. CLOSED and CANCELLED are terminal.
 */
public class TicketStateMachine {

    private static final Map<TicketStatus, Set<TicketStatus>> ALLOWED = Map.of(
            TicketStatus.OPEN, Set.of(TicketStatus.IN_PROGRESS, TicketStatus.CANCELLED),
            TicketStatus.IN_PROGRESS, Set.of(TicketStatus.RESOLVED, TicketStatus.CANCELLED),
            TicketStatus.RESOLVED, Set.of(TicketStatus.CLOSED),
            TicketStatus.CLOSED, Set.of(),
            TicketStatus.CANCELLED, Set.of()
    );

    /**
     * Returns true if the transition current → target is allowed.
     * Same-status and any pair not in the allowed set are rejected.
     */
    public boolean isAllowed(TicketStatus current, TicketStatus target) {
        if (current == null || target == null) {
            return false;
        }
        return ALLOWED.getOrDefault(current, Set.of()).contains(target);
    }
}
