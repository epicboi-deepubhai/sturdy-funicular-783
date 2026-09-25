package com.epic.sturdyfernacular.service;

import com.epic.sturdyfernacular.domain.Priority;
import com.epic.sturdyfernacular.domain.Ticket;
import com.epic.sturdyfernacular.domain.TicketStatus;
import com.epic.sturdyfernacular.repository.CommentRepository;
import com.epic.sturdyfernacular.repository.TicketRepository;
import com.epic.sturdyfernacular.web.dto.CreateTicketRequest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Integration test against real PostgreSQL (Testcontainers). Verifies ILIKE
 * search and comment rules end-to-end through the service. No H2.
 */
@SpringBootTest
@Testcontainers
class TicketServiceIntegrationTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16");

    @Autowired
    private TicketService service;
    @Autowired
    private TicketRepository ticketRepository;
    @Autowired
    private CommentRepository commentRepository;

    private static final Sort SORT = Sort.by(Sort.Direction.DESC, "updated_at")
            .and(Sort.by(Sort.Direction.DESC, "id"));

    @Test
    void keywordSearchUsesIlikeAcrossTitleAndDescription() {
        service.create("alice", new CreateTicketRequest("Login broken", "SSO loops", Priority.HIGH, null));
        service.create("alice", new CreateTicketRequest("Billing", "Invoice wrong", Priority.LOW, null));

        Page<Ticket> byTitle = service.list(null, "login", PageRequest.of(0, 10, SORT));
        assertThat(byTitle.getContent()).extracting(Ticket::getTitle).contains("Login broken");

        Page<Ticket> byDesc = service.list(null, "INVOICE", PageRequest.of(0, 10, SORT));
        assertThat(byDesc.getContent()).extracting(Ticket::getTitle).contains("Billing");
    }

    @Test
    void commentOnClosedAllowed_onCancelledRejected() {
        Ticket t = service.create("alice", new CreateTicketRequest("T", "D", Priority.MEDIUM, null));
        service.changeStatus(t.getId(), "alice", TicketStatus.IN_PROGRESS);
        service.changeStatus(t.getId(), "alice", TicketStatus.RESOLVED);
        service.changeStatus(t.getId(), "alice", TicketStatus.CLOSED);
        // comment on CLOSED allowed
        service.addComment(t.getId(), "bob", "post-close note");
        assertThat(commentRepository.findByTicketIdOrderByCreatedAtAscIdAsc(t.getId())).hasSize(1);

        Ticket t2 = service.create("alice", new CreateTicketRequest("T2", "D2", Priority.LOW, null));
        service.changeStatus(t2.getId(), "alice", TicketStatus.CANCELLED);
        assertThatThrownBy(() -> service.addComment(t2.getId(), "bob", "nope"))
                .isInstanceOf(CommentsNotAllowedException.class);
    }

    @Test
    void createWithoutAssigneeAutoAssignsActor_andPersistsAcrossReload() {
        Ticket t = service.create("carol", new CreateTicketRequest("T", "D", Priority.MEDIUM, null));
        assertThat(t.getAssignee()).isEqualTo("carol");
        Ticket reloaded = ticketRepository.findById(t.getId()).orElseThrow();
        assertThat(reloaded.getAssignee()).isEqualTo("carol");
        assertThat(reloaded.getCreatedBy()).isEqualTo("carol");
    }
}
