package com.epic.sturdyfernacular.service;

import com.epic.sturdyfernacular.domain.Comment;
import com.epic.sturdyfernacular.domain.PrototypeUsers;
import com.epic.sturdyfernacular.domain.Ticket;
import com.epic.sturdyfernacular.domain.TicketStatus;
import com.epic.sturdyfernacular.repository.CommentRepository;
import com.epic.sturdyfernacular.repository.TicketRepository;
import com.epic.sturdyfernacular.web.dto.CreateTicketRequest;
import com.epic.sturdyfernacular.web.dto.UpdateTicketRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class TicketService {

    private final TicketRepository ticketRepository;
    private final CommentRepository commentRepository;
    private final TicketStateMachine stateMachine;

    public TicketService(TicketRepository ticketRepository,
                         CommentRepository commentRepository,
                         TicketStateMachine stateMachine) {
        this.ticketRepository = ticketRepository;
        this.commentRepository = commentRepository;
        this.stateMachine = stateMachine;
    }

    @Transactional
    public Ticket create(String actingUsername, CreateTicketRequest request) {
        Ticket t = new Ticket();
        t.setTitle(request.title());
        t.setDescription(request.description());
        t.setPriority(request.priority());
        t.setStatus(TicketStatus.OPEN);
        t.setAssignee(resolveAssignee(actingUsername, request.assignee()));
        t.setCreatedBy(actingUsername);
        t.setUpdatedBy(actingUsername);
        return ticketRepository.save(t);
    }

    private String resolveAssignee(String actingUsername, String requested) {
        if (requested == null || requested.isBlank()) {
            return actingUsername;
        }
        if (!PrototypeUsers.isAllowed(requested)) {
            throw new InvalidAssigneeException(requested);
        }
        return requested;
    }

    @Transactional(readOnly = true)
    public Ticket getById(Long id) {
        return ticketRepository.findById(id)
                .orElseThrow(() -> new TicketNotFoundException(id));
    }

    @Transactional(readOnly = true)
    public List<Comment> getComments(Long ticketId) {
        return commentRepository.findByTicketIdOrderByCreatedAtAscIdAsc(ticketId);
    }

    @Transactional(readOnly = true)
    public Page<Ticket> list(TicketStatus status, String keyword, Pageable pageable) {
        String statusText = status == null ? null : status.name();
        String kw = normalizeKeyword(keyword);
        return ticketRepository.search(statusText, kw, pageable);
    }

    private String normalizeKeyword(String keyword) {
        if (keyword == null || keyword.isBlank()) {
            return null;
        }
        String trimmed = keyword.trim();
        return trimmed.replace("\\", "\\\\")
                .replace("%", "\\%")
                .replace("_", "\\_");
    }

    @Transactional
    public Ticket updateFields(Long id, String actingUsername, UpdateTicketRequest request) {
        Ticket t = getById(id);
        if (isTerminal(t.getStatus())) {
            throw new TicketReadOnlyException(id);
        }
        if (request.title() != null) {
            t.setTitle(request.title());
        }
        if (request.description() != null) {
            t.setDescription(request.description());
        }
        if (request.priority() != null) {
            t.setPriority(request.priority());
        }
        if (request.assignee() != null) {
            if (request.assignee().isBlank() || !PrototypeUsers.isAllowed(request.assignee())) {
                throw new InvalidAssigneeException(request.assignee());
            }
            t.setAssignee(request.assignee());
        }
        t.setUpdatedBy(actingUsername);
        return ticketRepository.save(t);
    }

    @Transactional
    public Ticket changeStatus(Long id, String actingUsername, TicketStatus target) {
        Ticket t = getById(id);
        if (!stateMachine.isAllowed(t.getStatus(), target)) {
            throw new InvalidStateTransitionException(t.getStatus(), target);
        }
        t.setStatus(target);
        t.setUpdatedBy(actingUsername);
        return ticketRepository.save(t);
    }

    @Transactional
    public Comment addComment(Long ticketId, String actingUsername, String body) {
        Ticket t = getById(ticketId);
        if (t.getStatus() == TicketStatus.CANCELLED) {
            throw new CommentsNotAllowedException(ticketId);
        }
        Comment c = new Comment();
        c.setTicket(t);
        c.setBody(body);
        c.setAuthor(actingUsername);
        Comment saved = commentRepository.save(c);
        t.setUpdatedBy(actingUsername);
        ticketRepository.save(t);
        return saved;
    }

    private boolean isTerminal(TicketStatus status) {
        return status == TicketStatus.CLOSED || status == TicketStatus.CANCELLED;
    }
}
