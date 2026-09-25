package com.epic.sturdyfernacular.service;

public class InvalidAssigneeException extends RuntimeException {
    public InvalidAssigneeException(String assignee) {
        super("Invalid assignee: " + assignee);
    }
}
