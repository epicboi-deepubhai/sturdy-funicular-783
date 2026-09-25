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
class TicketEntityTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16");

    @Autowired
    private TestEntityManager em;

    @Test
    void persistsTicketWithAuditTimestamps() {
        Ticket t = new Ticket();
        t.setTitle("Cannot login");
        t.setDescription("SSO redirect loops");
        t.setStatus(TicketStatus.OPEN);
        t.setPriority(Priority.HIGH);
        t.setAssignee("alice");
        t.setCreatedBy("alice");
        t.setUpdatedBy("alice");

        Ticket saved = em.persistFlushFind(t);

        assertThat(saved.getId()).isNotNull();
        assertThat(saved.getCreatedAt()).isNotNull();
        assertThat(saved.getUpdatedAt()).isNotNull();
        assertThat(saved.getStatus()).isEqualTo(TicketStatus.OPEN);
    }
}
