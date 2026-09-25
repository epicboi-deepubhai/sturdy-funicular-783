package com.epic.sturdyfernacular.web;

import com.epic.sturdyfernacular.domain.Comment;
import com.epic.sturdyfernacular.domain.Priority;
import com.epic.sturdyfernacular.domain.Ticket;
import com.epic.sturdyfernacular.domain.TicketStatus;
import com.epic.sturdyfernacular.service.InvalidStateTransitionException;
import com.epic.sturdyfernacular.service.TicketNotFoundException;
import com.epic.sturdyfernacular.service.TicketService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(TicketController.class)
class TicketControllerTest {

    @Autowired
    private MockMvc mvc;

    @MockitoBean
    private TicketService service;

    private Ticket ticket() {
        Ticket t = new Ticket();
        t.setId(42L);
        t.setTitle("Cannot login");
        t.setDescription("SSO redirect loops.");
        t.setStatus(TicketStatus.OPEN);
        t.setPriority(Priority.HIGH);
        t.setAssignee("bob");
        t.setCreatedBy("alice");
        t.setUpdatedBy("alice");
        t.setCreatedAt(Instant.parse("2026-09-25T10:15:30Z"));
        t.setUpdatedAt(Instant.parse("2026-09-25T10:16:00Z"));
        return t;
    }

    // T14 create
    @Test
    void create_returns201WithLocation() throws Exception {
        when(service.create(anyString(), any())).thenReturn(ticket());
        mvc.perform(post("/api/v1/tickets")
                        .header("X-Username", "alice")
                        .contentType("application/json")
                        .content("{\"title\":\"Cannot login\",\"description\":\"SSO\",\"priority\":\"HIGH\"}"))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", org.hamcrest.Matchers.endsWith("/api/v1/tickets/42")))
                .andExpect(jsonPath("$.status").value("OPEN"))
                .andExpect(jsonPath("$.assignee").value("bob"));
    }

    @Test
    void create_blankTitle_returns400WithFieldErrors() throws Exception {
        mvc.perform(post("/api/v1/tickets")
                        .header("X-Username", "alice")
                        .contentType("application/json")
                        .content("{\"title\":\"  \",\"description\":\"SSO\",\"priority\":\"HIGH\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.fieldErrors").isArray());
    }

    // T14 list
    @Test
    void list_returnsPageShape() throws Exception {
        when(service.list(any(), any(), any()))
                .thenReturn(new PageImpl<>(List.of(ticket()), PageRequest.of(0, 10), 1));
        mvc.perform(get("/api/v1/tickets").header("X-Username", "alice"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray())
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.totalPages").value(1))
                .andExpect(jsonPath("$.pageNumber").value(0));
    }

    @Test
    void list_invalidSize_returns400() throws Exception {
        mvc.perform(get("/api/v1/tickets?size=500").header("X-Username", "alice"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("VALIDATION_ERROR"));
    }

    @Test
    void list_invalidStatusEnum_returns400() throws Exception {
        mvc.perform(get("/api/v1/tickets?status=BOGUS").header("X-Username", "alice"))
                .andExpect(status().isBadRequest());
    }

    // T14 get
    @Test
    void getById_returnsDetail() throws Exception {
        when(service.getById(42L)).thenReturn(ticket());
        when(service.getComments(42L)).thenReturn(List.of());
        mvc.perform(get("/api/v1/tickets/42").header("X-Username", "alice"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(42))
                .andExpect(jsonPath("$.comments").isArray());
    }

    @Test
    void getById_missing_returns404() throws Exception {
        when(service.getById(99L)).thenThrow(new TicketNotFoundException(99L));
        mvc.perform(get("/api/v1/tickets/99").header("X-Username", "alice"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("NOT_FOUND"));
    }

    @Test
    void getById_nonNumericId_returns400() throws Exception {
        mvc.perform(get("/api/v1/tickets/abc").header("X-Username", "alice"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("VALIDATION_ERROR"));
    }

    // T15 patch fields
    @Test
    void updateFields_returns200() throws Exception {
        when(service.updateFields(anyLong(), anyString(), any())).thenReturn(ticket());
        when(service.getComments(42L)).thenReturn(List.of());
        mvc.perform(patch("/api/v1/tickets/42")
                        .header("X-Username", "alice")
                        .contentType("application/json")
                        .content("{\"title\":\"New\"}"))
                .andExpect(status().isOk());
    }

    @Test
    void updateFields_withStatusInBody_returns400() throws Exception {
        mvc.perform(patch("/api/v1/tickets/42")
                        .header("X-Username", "alice")
                        .contentType("application/json")
                        .content("{\"status\":\"CLOSED\"}"))
                .andExpect(status().isBadRequest());
    }

    // T15 patch status
    @Test
    void changeStatus_invalidTransition_returns409() throws Exception {
        when(service.changeStatus(anyLong(), anyString(), any()))
                .thenThrow(new InvalidStateTransitionException(TicketStatus.CLOSED, TicketStatus.OPEN));
        mvc.perform(patch("/api/v1/tickets/42/status")
                        .header("X-Username", "alice")
                        .contentType("application/json")
                        .content("{\"status\":\"OPEN\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error").value("INVALID_STATE_TRANSITION"))
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("CLOSED")))
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("OPEN")));
    }

    // T15 add comment
    @Test
    void addComment_returns201() throws Exception {
        Comment c = new Comment();
        c.setId(7L);
        c.setBody("note");
        c.setAuthor("alice");
        c.setCreatedAt(Instant.parse("2026-09-25T10:16:00Z"));
        when(service.addComment(anyLong(), anyString(), anyString())).thenReturn(c);
        mvc.perform(post("/api/v1/tickets/42/comments")
                        .header("X-Username", "alice")
                        .contentType("application/json")
                        .content("{\"body\":\"note\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.author").value("alice"));
    }

    // T16 header enforcement
    @Test
    void missingUsernameHeader_returns400() throws Exception {
        mvc.perform(get("/api/v1/tickets"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.fieldErrors[0].field").value("X-Username"));
    }

    @Test
    void unknownUsername_returns400() throws Exception {
        mvc.perform(get("/api/v1/tickets").header("X-Username", "dave"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void optionsPreflightWithoutHeader_isNot400() throws Exception {
        mvc.perform(options("/api/v1/tickets")
                        .header("Origin", "http://localhost:5173")
                        .header("Access-Control-Request-Method", "GET"))
                .andExpect(status().isOk());
    }

    // T25 malformed JSON
    @Test
    void malformedJson_returns400() throws Exception {
        mvc.perform(post("/api/v1/tickets")
                        .header("X-Username", "alice")
                        .contentType("application/json")
                        .content("{not json"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("VALIDATION_ERROR"));
    }
}
