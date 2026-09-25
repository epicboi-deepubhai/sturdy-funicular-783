package com.epic.sturdyfernacular.service;

public class CommentsNotAllowedException extends RuntimeException {
    public CommentsNotAllowedException(Long id) {
        super("Comments are not allowed on a CANCELLED ticket: " + id);
    }
}
