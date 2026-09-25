package com.epic.sturdyfernacular.repository;

import com.epic.sturdyfernacular.domain.Priority;
import com.epic.sturdyfernacular.domain.Ticket;
import com.epic.sturdyfernacular.domain.TicketStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@Testcontainers
class TicketSearchRepositoryTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16");

    @Autowired
    private TicketRepository ticketRepository;

    private static final Sort SORT = Sort.by(Sort.Direction.DESC, "updated_at")
            .and(Sort.by(Sort.Direction.DESC, "id"));

    private Ticket ticket(String title, String description, TicketStatus status) {
        return ticket(title, description, status, "alice", "alice");
    }

    private Ticket ticket(String title, String description, TicketStatus status,
                          String createdBy, String assignee) {
        Ticket t = new Ticket();
        t.setTitle(title);
        t.setDescription(description);
        t.setStatus(status);
        t.setPriority(Priority.MEDIUM);
        t.setAssignee(assignee);
        t.setCreatedBy(createdBy);
        t.setUpdatedBy(createdBy);
        return ticketRepository.save(t);
    }

    @BeforeEach
    void seed() {
        ticketRepository.deleteAll();
        ticket("Login page broken", "SSO redirect loops forever", TicketStatus.OPEN);
        ticket("Password reset", "User cannot reset their LOGIN credentials", TicketStatus.IN_PROGRESS);
        ticket("Billing question", "Invoice is wrong", TicketStatus.OPEN);
    }

    @Test
    void matchesKeywordOnTitle() {
        Page<Ticket> r = ticketRepository.search("alice", null, "billing", PageRequest.of(0, 10, SORT));
        assertThat(r.getContent()).extracting(Ticket::getTitle).containsExactly("Billing question");
    }

    @Test
    void matchesKeywordOnDescription() {
        Page<Ticket> r = ticketRepository.search("alice", null, "invoice", PageRequest.of(0, 10, SORT));
        assertThat(r.getContent()).extracting(Ticket::getTitle).containsExactly("Billing question");
    }

    @Test
    void keywordIsCaseInsensitive() {
        Page<Ticket> r = ticketRepository.search("alice", null, "LOGIN", PageRequest.of(0, 10, SORT));
        assertThat(r.getContent()).hasSize(2);
    }

    @Test
    void combinesStatusAndKeyword() {
        Page<Ticket> r = ticketRepository.search("alice", "IN_PROGRESS", "login",
                PageRequest.of(0, 10, SORT));
        assertThat(r.getContent()).extracting(Ticket::getTitle).containsExactly("Password reset");
    }

    @Test
    void nullKeywordReturnsAllForStatus() {
        Page<Ticket> r = ticketRepository.search("alice", "OPEN", null, PageRequest.of(0, 10, SORT));
        assertThat(r.getContent()).hasSize(2);
    }

    @Test
    void sortsByUpdatedAtDescThenIdDesc() {
        Page<Ticket> r = ticketRepository.search("alice", null, null, PageRequest.of(0, 10, SORT));
        assertThat(r.getContent()).hasSize(3);
        // Most recently updated first; ties broken by higher id first.
        for (int i = 0; i < r.getContent().size() - 1; i++) {
            Ticket a = r.getContent().get(i);
            Ticket b = r.getContent().get(i + 1);
            int cmp = a.getUpdatedAt().compareTo(b.getUpdatedAt());
            assertThat(cmp >= 0).isTrue();
            if (cmp == 0) {
                assertThat(a.getId()).isGreaterThan(b.getId());
            }
        }
    }

    @Test
    void scopesResultsAndCountsToCreatorOrAssignee() {
        ticket("Shared ticket", "Visible to creator and assignee",
                TicketStatus.OPEN, "bob", "carol");

        Page<Ticket> bob = ticketRepository.search(
                "bob", null, null, PageRequest.of(0, 10, SORT));
        Page<Ticket> carol = ticketRepository.search(
                "carol", null, null, PageRequest.of(0, 10, SORT));
        Page<Ticket> alice = ticketRepository.search(
                "alice", null, null, PageRequest.of(0, 10, SORT));

        assertThat(bob.getContent()).extracting(Ticket::getTitle)
                .containsExactly("Shared ticket");
        assertThat(carol.getContent()).extracting(Ticket::getTitle)
                .containsExactly("Shared ticket");
        assertThat(bob.getTotalElements()).isEqualTo(1);
        assertThat(carol.getTotalElements()).isEqualTo(1);
        assertThat(alice.getContent()).extracting(Ticket::getTitle)
                .doesNotContain("Shared ticket");
        assertThat(alice.getTotalElements()).isEqualTo(3);
    }

    @Test
    void accessibleLookupAllowsCreatorAndAssigneeButNotOtherUsers() {
        Ticket shared = ticket("Restricted", "Access test",
                TicketStatus.OPEN, "bob", "carol");

        assertThat(ticketRepository.findAccessibleById(shared.getId(), "bob")).isPresent();
        assertThat(ticketRepository.findAccessibleById(shared.getId(), "carol")).isPresent();
        assertThat(ticketRepository.findAccessibleById(shared.getId(), "alice")).isEmpty();
    }
}
