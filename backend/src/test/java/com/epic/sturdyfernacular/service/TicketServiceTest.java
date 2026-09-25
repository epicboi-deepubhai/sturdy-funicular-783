package com.epic.sturdyfernacular.service;

import com.epic.sturdyfernacular.domain.Comment;
import com.epic.sturdyfernacular.domain.Priority;
import com.epic.sturdyfernacular.domain.Ticket;
import com.epic.sturdyfernacular.domain.TicketStatus;
import com.epic.sturdyfernacular.repository.CommentRepository;
import com.epic.sturdyfernacular.repository.TicketRepository;
import com.epic.sturdyfernacular.web.dto.CreateTicketRequest;
import com.epic.sturdyfernacular.web.dto.UpdateTicketRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TicketServiceTest {

    @Mock
    private TicketRepository ticketRepository;
    @Mock
    private CommentRepository commentRepository;

    private TicketStateMachine stateMachine = new TicketStateMachine();

    private TicketService service;

    @BeforeEach
    void setUp() {
        service = new TicketService(ticketRepository, commentRepository, stateMachine);
    }

    private Ticket ticket(TicketStatus status) {
        Ticket t = new Ticket();
        t.setId(1L);
        t.setTitle("T");
        t.setDescription("D");
        t.setStatus(status);
        t.setPriority(Priority.MEDIUM);
        t.setAssignee("alice");
        t.setCreatedBy("alice");
        t.setUpdatedBy("alice");
        return t;
    }

    // T7 create
    @Test
    void create_assignsCurrentUserWhenAssigneeOmitted() {
        when(ticketRepository.save(any())).thenAnswer(i -> i.getArgument(0));
        CreateTicketRequest req = new CreateTicketRequest("T", "D", Priority.HIGH, null);
        Ticket t = service.create("alice", req);
        assertThat(t.getAssignee()).isEqualTo("alice");
        assertThat(t.getStatus()).isEqualTo(TicketStatus.OPEN);
        assertThat(t.getCreatedBy()).isEqualTo("alice");
        assertThat(t.getUpdatedBy()).isEqualTo("alice");
    }

    @Test
    void create_usesExplicitAssignee() {
        when(ticketRepository.save(any())).thenAnswer(i -> i.getArgument(0));
        CreateTicketRequest req = new CreateTicketRequest("T", "D", Priority.HIGH, "bob");
        Ticket t = service.create("alice", req);
        assertThat(t.getAssignee()).isEqualTo("bob");
    }

    @Test
    void create_rejectsInvalidAssignee() {
        CreateTicketRequest req = new CreateTicketRequest("T", "D", Priority.HIGH, "dave");
        assertThatThrownBy(() -> service.create("alice", req))
                .isInstanceOf(InvalidAssigneeException.class);
    }

    // T8 get
    @Test
    void getById_returnsTicket() {
        when(ticketRepository.findById(1L)).thenReturn(Optional.of(ticket(TicketStatus.OPEN)));
        assertThat(service.getById(1L).getId()).isEqualTo(1L);
    }

    @Test
    void getById_throwsWhenMissing() {
        when(ticketRepository.findById(9L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.getById(9L)).isInstanceOf(TicketNotFoundException.class);
    }

    // T9 list
    @Test
    void list_blankKeywordPassesNullToRepo() {
        Pageable p = PageRequest.of(0, 10);
        when(ticketRepository.search(any(), any(), any())).thenReturn(new PageImpl<>(List.of()));
        service.list(null, "   ", p);
        verify(ticketRepository).search(null, null, p);
    }

    @Test
    void list_forwardsStatusAndPageable() {
        Pageable p = PageRequest.of(1, 50);
        when(ticketRepository.search(any(), any(), any())).thenReturn(new PageImpl<>(List.of()));
        service.list(TicketStatus.OPEN, "login", p);
        verify(ticketRepository).search("OPEN", "login", p);
    }

    // T10 update
    @Test
    void updateFields_partialPatch() {
        Ticket t = ticket(TicketStatus.OPEN);
        when(ticketRepository.findById(1L)).thenReturn(Optional.of(t));
        when(ticketRepository.save(any())).thenAnswer(i -> i.getArgument(0));
        UpdateTicketRequest req = new UpdateTicketRequest("New title", null, null, null, null);
        Ticket out = service.updateFields(1L, "bob", req);
        assertThat(out.getTitle()).isEqualTo("New title");
        assertThat(out.getDescription()).isEqualTo("D");
        assertThat(out.getUpdatedBy()).isEqualTo("bob");
    }

    @Test
    void updateFields_terminalTicketIsReadOnly() {
        when(ticketRepository.findById(1L)).thenReturn(Optional.of(ticket(TicketStatus.CLOSED)));
        UpdateTicketRequest req = new UpdateTicketRequest("X", null, null, null, null);
        assertThatThrownBy(() -> service.updateFields(1L, "alice", req))
                .isInstanceOf(TicketReadOnlyException.class);
    }

    @Test
    void updateFields_assigneeCannotBeCleared() {
        when(ticketRepository.findById(1L)).thenReturn(Optional.of(ticket(TicketStatus.OPEN)));
        UpdateTicketRequest req = new UpdateTicketRequest(null, null, null, "  ", null);
        assertThatThrownBy(() -> service.updateFields(1L, "alice", req))
                .isInstanceOf(InvalidAssigneeException.class);
    }

    @Test
    void updateFields_doesNotChangeStatus() {
        Ticket t = ticket(TicketStatus.OPEN);
        when(ticketRepository.findById(1L)).thenReturn(Optional.of(t));
        when(ticketRepository.save(any())).thenAnswer(i -> i.getArgument(0));
        UpdateTicketRequest req = new UpdateTicketRequest(null, null, Priority.URGENT, null, "CLOSED");
        Ticket out = service.updateFields(1L, "alice", req);
        assertThat(out.getStatus()).isEqualTo(TicketStatus.OPEN);
        assertThat(out.getPriority()).isEqualTo(Priority.URGENT);
    }

    // T11 changeStatus
    @Test
    void changeStatus_allowedTransitionPersists() {
        Ticket t = ticket(TicketStatus.OPEN);
        when(ticketRepository.findById(1L)).thenReturn(Optional.of(t));
        when(ticketRepository.save(any())).thenAnswer(i -> i.getArgument(0));
        Ticket out = service.changeStatus(1L, "bob", TicketStatus.IN_PROGRESS);
        assertThat(out.getStatus()).isEqualTo(TicketStatus.IN_PROGRESS);
        assertThat(out.getUpdatedBy()).isEqualTo("bob");
    }

    @Test
    void changeStatus_terminalRejects() {
        when(ticketRepository.findById(1L)).thenReturn(Optional.of(ticket(TicketStatus.CLOSED)));
        assertThatThrownBy(() -> service.changeStatus(1L, "alice", TicketStatus.OPEN))
                .isInstanceOf(InvalidStateTransitionException.class);
        verify(ticketRepository, never()).save(any());
    }

    @Test
    void changeStatus_sameStatusRejects() {
        when(ticketRepository.findById(1L)).thenReturn(Optional.of(ticket(TicketStatus.OPEN)));
        assertThatThrownBy(() -> service.changeStatus(1L, "alice", TicketStatus.OPEN))
                .isInstanceOf(InvalidStateTransitionException.class);
    }

    // T12 addComment
    @Test
    void addComment_onClosedSucceeds() {
        Ticket t = ticket(TicketStatus.CLOSED);
        when(ticketRepository.findById(1L)).thenReturn(Optional.of(t));
        when(commentRepository.save(any())).thenAnswer(i -> i.getArgument(0));
        when(ticketRepository.save(any())).thenAnswer(i -> i.getArgument(0));
        Comment c = service.addComment(1L, "carol", "note");
        assertThat(c.getAuthor()).isEqualTo("carol");
    }

    @Test
    void addComment_onCancelledFails() {
        when(ticketRepository.findById(1L)).thenReturn(Optional.of(ticket(TicketStatus.CANCELLED)));
        assertThatThrownBy(() -> service.addComment(1L, "alice", "x"))
                .isInstanceOf(CommentsNotAllowedException.class);
    }
}
