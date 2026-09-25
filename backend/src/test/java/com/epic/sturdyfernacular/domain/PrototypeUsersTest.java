package com.epic.sturdyfernacular.domain;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class PrototypeUsersTest {

    @Test
    void allowsAliceBobCarol() {
        assertThat(PrototypeUsers.isAllowed("alice")).isTrue();
        assertThat(PrototypeUsers.isAllowed("bob")).isTrue();
        assertThat(PrototypeUsers.isAllowed("carol")).isTrue();
    }

    @Test
    void rejectsCaseInsensitiveMatch() {
        assertThat(PrototypeUsers.isAllowed("Alice")).isFalse();
    }

    @Test
    void rejectsUnknownUser() {
        assertThat(PrototypeUsers.isAllowed("dave")).isFalse();
    }

    @Test
    void rejectsNullAndBlank() {
        assertThat(PrototypeUsers.isAllowed(null)).isFalse();
        assertThat(PrototypeUsers.isAllowed("")).isFalse();
        assertThat(PrototypeUsers.isAllowed("  ")).isFalse();
    }

    @Test
    void ticketStatusHasFiveValues() {
        assertThat(TicketStatus.values())
                .containsExactly(TicketStatus.OPEN, TicketStatus.IN_PROGRESS,
                        TicketStatus.RESOLVED, TicketStatus.CLOSED, TicketStatus.CANCELLED);
    }

    @Test
    void priorityHasFourValues() {
        assertThat(Priority.values())
                .containsExactly(Priority.LOW, Priority.MEDIUM, Priority.HIGH, Priority.URGENT);
    }
}
