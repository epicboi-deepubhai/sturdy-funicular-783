package com.epic.sturdyfernacular.web;

import com.epic.sturdyfernacular.domain.PrototypeUsers;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Requires X-Username on every non-OPTIONS /api/v1/** request. OPTIONS is
 * skipped so CORS preflight succeeds (FR14).
 */
@Component
@Order(1)
public class UsernameFilter extends OncePerRequestFilter {

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        return !path.startsWith("/api/v1/") || "OPTIONS".equalsIgnoreCase(request.getMethod());
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        String username = request.getHeader("X-Username");
        if (!PrototypeUsers.isAllowed(username)) {
            response.setStatus(400);
            response.setContentType("application/json");
            String body = """
                    {"timestamp":"%s","status":400,"error":"VALIDATION_ERROR","message":"X-Username header is required and must be one of alice, bob, carol","path":"%s","fieldErrors":[{"field":"X-Username","message":"required and must be a known prototype user"}]}
                    """.formatted(java.time.Instant.now().toString(), request.getRequestURI());
            response.getWriter().write(body);
            return;
        }
        try {
            CurrentUser.set(username);
            chain.doFilter(request, response);
        } finally {
            CurrentUser.clear();
        }
    }
}
