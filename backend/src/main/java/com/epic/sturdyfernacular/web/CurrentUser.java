package com.epic.sturdyfernacular.web;

/**
 * Holds the acting username for the current request, set by UsernameFilter.
 */
public final class CurrentUser {

    private static final ThreadLocal<String> CURRENT = new ThreadLocal<>();

    private CurrentUser() {
    }

    static void set(String username) {
        CURRENT.set(username);
    }

    public static String get() {
        return CURRENT.get();
    }

    static void clear() {
        CURRENT.remove();
    }
}
