package com.epic.sturdyfernacular.domain;

import java.util.Set;

/**
 * Prototype identity allowlist. Not authentication; no User entity.
 * See spec/requirements.md FR12.
 */
public final class PrototypeUsers {

    public static final Set<String> ALLOWED = Set.of("alice", "bob", "carol");

    private PrototypeUsers() {
    }

    public static boolean isAllowed(String username) {
        return username != null && ALLOWED.contains(username);
    }
}
