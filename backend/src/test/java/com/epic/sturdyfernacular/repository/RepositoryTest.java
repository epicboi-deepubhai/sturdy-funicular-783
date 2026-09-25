package com.epic.sturdyfernacular.repository;

import com.epic.sturdyfernacular.domain.Comment;
import com.epic.sturdyfernacular.domain.Priority;
import com.epic.sturdyfernacular.domain.Ticket;
import com.epic.sturdyfernacular.domain.TicketStatus;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@Testcontainers
class RepositoryTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16");

    @Autowired
    private TicketRepository ticketRepository;

    @Autowired
    private CommentRepository commentRepository;

    private Ticket newTicket(String title) {
        Ticket t = new Ticket();
        t.setTitle(title);
        t.setDescription("desc");
        t.setStatus(TicketStatus.OPEN);
        t.setPriority(Priority.MEDIUM);
        t.setAssignee("alice");
        t.setCreatedBy("alice");
        t.setUpdatedBy("alice");
        return t;
    }

    @Test
    void savesAndFindsTicketById() {
        Ticket saved = ticketRepository.save(newTicket("Login bug"));
        assertThat(ticketRepository.findById(saved.getId())).isPresent();
    }

    @Test
    void findsCommentsOldestFirst() throws InterruptedException {
        Ticket t = ticketRepository.save(newTicket("T"));
        Comment c1 = new Comment();
        c1.setTicket(t);
        c1.setBody("first");
        c1.setAuthor("alice");
        commentRepository.save(c1);
        Thread.sleep(5);
        Comment c2 = new Comment();
        c2.setTicket(t);
        c2.setBody("second");
        c2.setAuthor("bob");
        commentRepository.save(c2);

        List<Comment> comments = commentRepository.findByTicketIdOrderByCreatedAtAscIdAsc(t.getId());
        assertThat(comments).hasSize(2);
        assertThat(comments.get(0).getBody()).isEqualTo("first");
        assertThat(comments.get(1).getBody()).isEqualTo("second");
    }
}
