package com.epic.sturdyfernacular.web;

import com.epic.sturdyfernacular.domain.Comment;
import com.epic.sturdyfernacular.domain.Ticket;
import com.epic.sturdyfernacular.domain.TicketStatus;
import com.epic.sturdyfernacular.service.TicketService;
import com.epic.sturdyfernacular.web.dto.AddCommentRequest;
import com.epic.sturdyfernacular.web.dto.ChangeStatusRequest;
import com.epic.sturdyfernacular.web.dto.CommentResponse;
import com.epic.sturdyfernacular.web.dto.CreateTicketRequest;
import com.epic.sturdyfernacular.web.dto.TicketDetail;
import com.epic.sturdyfernacular.web.dto.TicketListItem;
import com.epic.sturdyfernacular.web.dto.TicketMapper;
import com.epic.sturdyfernacular.web.dto.UpdateTicketRequest;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/v1/tickets")
public class TicketController {

    private final TicketService service;

    public TicketController(TicketService service) {
        this.service = service;
    }

    private String actingUser() {
        return CurrentUser.get();
    }

    @PostMapping
    public ResponseEntity<TicketDetail> create(@Valid @RequestBody CreateTicketRequest request) {
        Ticket t = service.create(actingUser(), request);
        TicketDetail body = TicketMapper.toDetail(t, List.of());
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}").buildAndExpand(t.getId()).toUri();
        return ResponseEntity.created(location).body(body);
    }

    @GetMapping
    public PageResponse<TicketListItem> list(
            @RequestParam(required = false) TicketStatus status,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        if (page < 0 || size < 1 || size > 100) {
            throw new IllegalArgumentException("Invalid page/size");
        }
        Pageable pageable = PageRequest.of(page, size,
                Sort.by(Sort.Direction.DESC, "updated_at").and(Sort.by(Sort.Direction.DESC, "id")));
        Page<Ticket> result = service.list(actingUser(), status, keyword, pageable);
        List<TicketListItem> content = result.getContent().stream()
                .map(TicketMapper::toListItem).toList();
        return new PageResponse<>(content, result.getTotalElements(),
                result.getTotalPages(), result.getNumber());
    }

    @GetMapping("/{id}")
    public TicketDetail getById(@PathVariable Long id) {
        Ticket t = service.getById(id, actingUser());
        return TicketMapper.toDetail(t, service.getComments(id));
    }

    @PatchMapping("/{id}")
    public TicketDetail updateFields(@PathVariable Long id,
                                     @Valid @RequestBody UpdateTicketRequest request) {
        if (request.status() != null) {
            throw new IllegalArgumentException("status cannot be updated via this endpoint");
        }
        if (!request.hasUpdatableField()) {
            throw new IllegalArgumentException("At least one updatable field is required");
        }
        Ticket t = service.updateFields(id, actingUser(), request);
        return TicketMapper.toDetail(t, service.getComments(id));
    }

    @PatchMapping("/{id}/status")
    public TicketDetail changeStatus(@PathVariable Long id,
                                     @Valid @RequestBody ChangeStatusRequest request) {
        Ticket t = service.changeStatus(id, actingUser(), request.status());
        return TicketMapper.toDetail(t, service.getComments(id));
    }

    @PostMapping("/{id}/comments")
    public ResponseEntity<CommentResponse> addComment(@PathVariable Long id,
                                                      @Valid @RequestBody AddCommentRequest request) {
        Comment c = service.addComment(id, actingUser(), request.body());
        return ResponseEntity.status(201).body(TicketMapper.toCommentResponse(c));
    }

    public record PageResponse<T>(List<T> content, long totalElements, int totalPages, int pageNumber) {
    }
}
