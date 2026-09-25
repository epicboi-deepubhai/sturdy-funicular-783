# Requirements — Support Ticket Management System

Status: Draft v1
Owner: <your name>
Last updated: 2026-09-25

## 1. Purpose

A system for a support team to log, track, and resolve customer/internal support tickets end-to-end: creation, assignment, status progression, commenting, and search — with all business rules enforced server-side regardless of what the UI allows.

## 2. Scope

**In scope**
- Single ticket entity with comments, no multi-tenant/organization concept.
- One implicit "system" of agents who can be assigned tickets (no auth/login flow required unless separately assigned).
- REST API backend + a web frontend.
- Persistent storage across restarts.

**Out of scope (explicitly, to prevent AI scope creep during implementation)**
- Authentication / authorization / multi-user permissions.
- Email or push notifications.
- File/attachment uploads on tickets or comments.
- SLA timers, priority-based auto-escalation.
- Multi-language / i18n.
- Comment editing or deletion (comments are append-only).
- Audit trail / history of who changed what (beyond `createdAt`/`updatedAt` timestamps).

If any of the above turns out to be needed, it must be added to this document and re-approved before implementation — not improvised mid-build.

## 3. Actors

- **Agent** — creates tickets, updates them, is assignable to tickets, adds comments. No distinct roles/permissions in v1; every agent can do everything.

## 4. Functional Requirements

### FR1 — Create a ticket
- Fields at creation: `title` (required), `description` (required), `priority` (required, enum), `assignee` (optional at creation).
- New tickets are created with status `OPEN`.
- Server returns the created ticket including its generated `id` and `createdAt`.

### FR2 — List tickets
- Returns a paginated list of tickets.
- Each list item shows at minimum: `id`, `title`, `status`, `priority`, `assignee`, `updatedAt`.
- Default sort: most recently updated first.

### FR3 — View ticket details
- Returns full ticket: all fields plus its full list of comments (chronological, oldest first).
- 404 if the ticket id doesn't exist.

### FR4 — Update ticket fields
- Editable fields: `title`, `description`, `priority`, `assignee`.
- Status is **not** changed through this endpoint — see FR9.
- Validation identical to creation (title/description required, priority must be a valid enum value).
- Editing is rejected (409) if the ticket is in a terminal status — see section 6 — *decision needed: confirm whether CLOSED/CANCELLED tickets should be fully read-only or only status-locked. Default assumption below is status-locked only (fields remain editable); flip this if the team decides otherwise.*

### FR5 — Change assignee
- Covered by FR4 (assignee is one of the updatable fields) — no separate endpoint needed unless the team wants assignment history tracked (out of scope per section 2).

### FR6 — Add comments
- A comment has: `body` (required, non-blank), `author` (required — free text or reference to an agent, TBD in data-model.md), `createdAt` (server-generated).
- Comments can be added regardless of ticket status (you can comment on a closed ticket) — *decision needed: confirm this is desired; default assumption is yes, since closing discussion is common in support workflows.*
- Comments are returned in chronological order with the ticket detail (FR3).

### FR7 — Search tickets by keyword
- Keyword matches against `title` and `description`, case-insensitive, partial match.
- Combinable with the status filter (FR8) and pagination (FR2) in the same request.
- Empty/missing keyword returns the unfiltered list.

### FR8 — Filter tickets by status
- Filter by exactly one status value at a time (`OPEN`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`, `CANCELLED`).
- No filter = all statuses.
- Combinable with keyword search.

### FR9 — Status transitions (state machine)
Allowed transitions only:
```
OPEN         → IN_PROGRESS
OPEN         → CANCELLED
IN_PROGRESS  → RESOLVED
IN_PROGRESS  → CANCELLED
RESOLVED     → CLOSED
```
Explicitly forbidden (must be rejected by the backend with 409, never silently ignored):
```
CLOSED       → OPEN
CLOSED       → anything
RESOLVED     → OPEN
CANCELLED    → OPEN
CANCELLED    → anything
```
`CLOSED` and `CANCELLED` are terminal — no outbound transitions at all. Full formal table lives in `spec/state-machine.md`; this section is the plain-English source of truth if the two ever disagree.

- Status changes go through a dedicated endpoint/action, distinct from the general field update (FR4), so there is exactly one code path to guard.
- An invalid transition attempt returns a clear error identifying current status, attempted status, and why it's rejected — this error message must be shown to the user in the UI, not swallowed.

### FR10 — Backend input validation
- All required fields enforced server-side regardless of what the client sends (never trust client-side validation alone).
- Invalid `priority` or `status` enum values rejected with 400, not silently defaulted.
- `title`/`description`/`comment body` reject blank/whitespace-only strings.
- Field length limits: `title` ≤ 200 chars, `description` ≤ 5000 chars, `comment.body` ≤ 2000 chars (adjust if the team disagrees — these are placeholder sane defaults, not from the original ask).

### FR11 — Meaningful UI errors
- Every backend error (validation 400, not-found 404, invalid transition 409) is rendered in the UI as a specific, human-readable message tied to the relevant field or action — never a generic "Something went wrong" when the backend provided a specific reason.
- Network/unexpected errors (5xx, connection failure) get a distinct generic fallback message, so users can tell "you did something invalid" apart from "the system is having trouble."

## 5. Data Model (summary — full detail in `spec/data-model.md`)

**Ticket**: id, title, description, status (enum), priority (enum), assignee, createdAt, updatedAt, comments (one-to-many).
**Comment**: id, ticketId (FK), body, author, createdAt.

**Priority enum** (assumed, not stated in the original ask — confirm before build): `LOW`, `MEDIUM`, `HIGH`, `URGENT`.

## 6. Non-Functional Requirements

- **Persistence**: data must survive an application restart — PostgreSQL in all real environments; H2 acceptable only for quick local dev, and only if configured in file mode (not in-memory) if it's meant to demonstrate restart-persistence.
- **No secrets committed**: DB credentials, any API keys, via environment variables or a gitignored local properties file only.
- **Testability**: state machine logic must be unit-testable in isolation, without a Spring context or database.
- **API errors are structured** (see `spec/api-contract.md`) so the frontend can reliably parse and display them.

## 7. Acceptance Criteria (traceable to the assignment)

- [ ] Ticket can be created from the UI (FR1)
- [ ] Tickets can be listed (FR2)
- [ ] Ticket details can be viewed (FR3)
- [ ] Ticket fields can be updated (FR4)
- [ ] Assignee can be changed (FR5)
- [ ] Comments can be added (FR6)
- [ ] Search works (FR7)
- [ ] Status filter works (FR8)
- [ ] Valid status transitions work (FR9)
- [ ] Invalid status transitions are rejected by the backend (FR9)
- [ ] Data survives application restart (NFR)
- [ ] Backend validation works even if the UI is bypassed (FR10)
- [ ] UI shows meaningful, specific errors (FR11)
- [ ] State-machine integration tests pass, covering every transition — valid and invalid — listed in section 4/FR9
- [ ] No secrets committed to the repository

## 8. Open Questions (resolve before/during Specification phase — do not let AI silently decide these during implementation)

1. Are `CLOSED`/`CANCELLED` tickets fully read-only, or only status-locked (other fields still editable)?
2. Can comments be added to a `CLOSED`/`CANCELLED` ticket?
3. Is `assignee` a free-text name, or a reference to a real `Agent`/`User` entity? (Affects data-model and whether an "agents" endpoint is needed.)
4. What are the actual allowed `priority` values? (Assumed LOW/MEDIUM/HIGH/URGENT above.)
5. Any max length limits the grading rubric cares about, or are the ones in FR10 fine as engineering defaults?