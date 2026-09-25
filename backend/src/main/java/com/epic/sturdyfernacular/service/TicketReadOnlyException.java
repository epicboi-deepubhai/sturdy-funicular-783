package com.epic.sturdyfernacular.service;

public class TicketReadOnlyException extends RuntimeException {
    public TicketReadOnlyException(Long id) {
        super("Ticket " + id + " is in a terminal status and is read-only");
    }
}
