package com.epic.sturdyfernacular.web.dto;

import com.epic.sturdyfernacular.domain.Comment;
import com.epic.sturdyfernacular.domain.Ticket;

import java.util.List;

public final class TicketMapper {

    private TicketMapper() {
    }

    public static TicketListItem toListItem(Ticket t) {
        return new TicketListItem(t.getId(), t.getTitle(), t.getStatus(),
                t.getPriority(), t.getAssignee(), t.getUpdatedAt());
    }

    public static CommentResponse toCommentResponse(Comment c) {
        return new CommentResponse(c.getId(), c.getBody(), c.getAuthor(), c.getCreatedAt());
    }

    public static TicketDetail toDetail(Ticket t, List<Comment> comments) {
        List<CommentResponse> cs = comments == null ? List.of()
                : comments.stream().map(TicketMapper::toCommentResponse).toList();
        return new TicketDetail(t.getId(), t.getTitle(), t.getDescription(), t.getStatus(),
                t.getPriority(), t.getAssignee(), t.getCreatedBy(), t.getUpdatedBy(),
                t.getCreatedAt(), t.getUpdatedAt(), cs);
    }
}
