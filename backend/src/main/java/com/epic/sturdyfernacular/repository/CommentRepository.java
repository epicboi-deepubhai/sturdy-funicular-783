package com.epic.sturdyfernacular.repository;

import com.epic.sturdyfernacular.domain.Comment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CommentRepository extends JpaRepository<Comment, Long> {

    List<Comment> findByTicketIdOrderByCreatedAtAscIdAsc(Long ticketId);
}
