package com.epic.sturdyfernacular.service;

import com.epic.sturdyfernacular.domain.TicketStatus;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static com.epic.sturdyfernacular.domain.TicketStatus.CANCELLED;
import static com.epic.sturdyfernacular.domain.TicketStatus.CLOSED;
import static com.epic.sturdyfernacular.domain.TicketStatus.IN_PROGRESS;
import static com.epic.sturdyfernacular.domain.TicketStatus.OPEN;
import static com.epic.sturdyfernacular.domain.TicketStatus.RESOLVED;

/**
 * Full 5x5 transition matrix from spec/state-machine.md. One named test per cell.
 */
class TicketStateMachineTest {

    private final TicketStateMachine sm = new TicketStateMachine();

    // OPEN row
    @Test void openToOpen_isRejected() { assertThat(sm.isAllowed(OPEN, OPEN)).isFalse(); }
    @Test void openToInProgress_isAllowed() { assertThat(sm.isAllowed(OPEN, IN_PROGRESS)).isTrue(); }
    @Test void openToResolved_isRejected() { assertThat(sm.isAllowed(OPEN, RESOLVED)).isFalse(); }
    @Test void openToClosed_isRejected() { assertThat(sm.isAllowed(OPEN, CLOSED)).isFalse(); }
    @Test void openToCancelled_isAllowed() { assertThat(sm.isAllowed(OPEN, CANCELLED)).isTrue(); }

    // IN_PROGRESS row
    @Test void inProgressToOpen_isRejected() { assertThat(sm.isAllowed(IN_PROGRESS, OPEN)).isFalse(); }
    @Test void inProgressToInProgress_isRejected() { assertThat(sm.isAllowed(IN_PROGRESS, IN_PROGRESS)).isFalse(); }
    @Test void inProgressToResolved_isAllowed() { assertThat(sm.isAllowed(IN_PROGRESS, RESOLVED)).isTrue(); }
    @Test void inProgressToClosed_isRejected() { assertThat(sm.isAllowed(IN_PROGRESS, CLOSED)).isFalse(); }
    @Test void inProgressToCancelled_isAllowed() { assertThat(sm.isAllowed(IN_PROGRESS, CANCELLED)).isTrue(); }

    // RESOLVED row
    @Test void resolvedToOpen_isRejected() { assertThat(sm.isAllowed(RESOLVED, OPEN)).isFalse(); }
    @Test void resolvedToInProgress_isRejected() { assertThat(sm.isAllowed(RESOLVED, IN_PROGRESS)).isFalse(); }
    @Test void resolvedToResolved_isRejected() { assertThat(sm.isAllowed(RESOLVED, RESOLVED)).isFalse(); }
    @Test void resolvedToClosed_isAllowed() { assertThat(sm.isAllowed(RESOLVED, CLOSED)).isTrue(); }
    @Test void resolvedToCancelled_isRejected() { assertThat(sm.isAllowed(RESOLVED, CANCELLED)).isFalse(); }

    // CLOSED row (terminal)
    @Test void closedToOpen_isRejected() { assertThat(sm.isAllowed(CLOSED, OPEN)).isFalse(); }
    @Test void closedToInProgress_isRejected() { assertThat(sm.isAllowed(CLOSED, IN_PROGRESS)).isFalse(); }
    @Test void closedToResolved_isRejected() { assertThat(sm.isAllowed(CLOSED, RESOLVED)).isFalse(); }
    @Test void closedToClosed_isRejected() { assertThat(sm.isAllowed(CLOSED, CLOSED)).isFalse(); }
    @Test void closedToCancelled_isRejected() { assertThat(sm.isAllowed(CLOSED, CANCELLED)).isFalse(); }

    // CANCELLED row (terminal)
    @Test void cancelledToOpen_isRejected() { assertThat(sm.isAllowed(CANCELLED, OPEN)).isFalse(); }
    @Test void cancelledToInProgress_isRejected() { assertThat(sm.isAllowed(CANCELLED, IN_PROGRESS)).isFalse(); }
    @Test void cancelledToResolved_isRejected() { assertThat(sm.isAllowed(CANCELLED, RESOLVED)).isFalse(); }
    @Test void cancelledToClosed_isRejected() { assertThat(sm.isAllowed(CANCELLED, CLOSED)).isFalse(); }
    @Test void cancelledToCancelled_isRejected() { assertThat(sm.isAllowed(CANCELLED, CANCELLED)).isFalse(); }

    @Test
    void nullCurrentOrTarget_isRejected() {
        assertThat(sm.isAllowed(null, OPEN)).isFalse();
        assertThat(sm.isAllowed(OPEN, null)).isFalse();
    }
}
