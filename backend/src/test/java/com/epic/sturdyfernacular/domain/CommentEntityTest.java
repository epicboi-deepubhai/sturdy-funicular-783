package com.epic.sturdyfernacular.domain;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@Testcontainers
class CommentEntityTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16");

    @Autowired
    private TestEntityManager em;

    @Test
    void persistsCommentLinkedToTicket() {
        Ticket t = new Ticket();
        t.setTitle("T");
        t.setDescription("D");
        t.setStatus(TicketStatus.OPEN);
        t.setPriority(Priority.LOW);
        t.setAssignee("bob");
        t.setCreatedBy("bob");
        t.setUpdatedBy("bob");
        Ticket savedTicket = em.persist(t);

        Comment c = new Comment();
        c.setTicket(savedTicket);
        c.setBody("Reproduced on staging.");
        c.setAuthor("alice");
        Comment saved = em.persistFlushFind(c);

        assertThat(saved.getId()).isNotNull();
        assertThat(saved.getCreatedAt()).isNotNull();
        assertThat(saved.getTicket().getId()).isEqualTo(savedTicket.getId());
    }
}
