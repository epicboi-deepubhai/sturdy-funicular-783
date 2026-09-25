# Requirements — Support Ticket Management System

Status: Draft v3 (decisions closed)
Owner: <your name>
Last updated: 2026-09-25

## 1. Purpose

A system for a support team to log, track, and resolve customer/internal support tickets end-to-end: creation, assignment, status progression, commenting, and search — with all business rules enforced server-side regardless of what the UI allows.

## 2. Scope

**In scope**
- Single ticket entity with comments, no multi-tenant/organization concept.
- Three prototype agents (`alice`, `bob`, `carol`). No login, sessions, passwords, or JWT. The UI exposes a header switcher; every API request sends the selected username; the server requires and validates it.
- REST API backend (Gradle, existing `backend/`) + a Vite React TypeScript frontend (`frontend/`).
- Persistent storage across restarts (PostgreSQL only, including tests — no H2).
- A documented local run: Docker Compose Postgres + backend + frontend, with no secrets in git.

**Out of scope (explicitly, to prevent AI scope creep during implementation)**
- Authentication / authorization / multi-user permissions (beyond the prototype username header).
- A `User` table, password storage, or roles. Usernames are an allowlist of three strings.
- Email or push notifications.
- File/attachment uploads on tickets or comments.
- SLA timers, priority-based auto-escalation.
- Multi-language / i18n.
- Comment editing or deletion (comments are append-only).
- Ticket deletion.
- Audit trail / history of who changed what (beyond `createdBy` / `updatedBy` / `author` plus `createdAt` / `updatedAt`).
- Reopening terminal tickets or extra status edges not listed in FR9.
- OpenAPI/Swagger UI, Spring Actuator, a Maven build (Gradle already exists).
- H2 or any in-memory database in main or test runtime.

If any of the above turns out to be needed, it must be added to this document and re-approved before implementation — not improvised mid-build.

## 3. Actors

- **Agent** — one of `alice`, `bob`, `carol`. Creates tickets, updates them, is assignable, adds comments. No distinct roles; every listed agent can do everything. The acting agent for a request is the username on that request, not a server-side session.

## 4. Functional Requirements

### FR1 — Create a ticket
- Fields at creation: `title` (required), `description` (required), `priority` (required, enum), `assignee` (optional in the request).
- If `assignee` is present and non-null, it must be one of the three prototype usernames. If it is omitted or JSON `null`, the **backend** sets `assignee` to the request username (`X-Username`). The stored ticket always has an assignee after create.
- Assignee cannot be cleared later (FR4).
- New tickets are created with status `OPEN`.
- `createdBy` and `updatedBy` are set from the request username (not from the body).
- Server returns the created ticket including its generated `id`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`.

### FR2 — List tickets
- Returns a paginated list of tickets.
- Each list item shows at minimum: `id`, `title`, `status`, `priority`, `assignee`, `updatedAt`. Do not require extra list fields.
- Default sort: most recently updated first; if `updatedAt` ties, higher `id` first.
- Pagination: 0-based `page` (default `0`), `size` default `10`, maximum `100`. The UI offers 10 / 50 / 100.

### FR3 — View ticket details
- Returns full ticket: all fields plus its full list of comments (chronological, oldest first).
- 404 if the ticket id doesn't exist.

### FR4 — Update ticket fields
- Method: `PATCH`. Editable fields: `title`, `description`, `priority`, `assignee`. Omitted fields stay unchanged.
- Status is **not** changed through this endpoint — see FR9.
- Present fields use the same validation as create (non-blank title/description, valid priority).
- `assignee`, if present in the body, must be one of the three usernames. Sending `null` or blank is rejected (400). Assignee may be changed to another username; it must never become empty. Auto-assign-to-current-user applies on **create only**, not on PATCH.
- `updatedBy` is set from the request username; `updatedAt` is refreshed.
- `CLOSED` and `CANCELLED` tickets are **fully read-only** for field updates: `PATCH` returns 409. Status is also immutable (FR9). Comments: FR6.

### FR5 — Change assignee
- Covered by FR4. No separate endpoint. No assignment history.

### FR6 — Add comments
- Request body: `body` only (required, non-blank). `author` is **not** client-supplied; it is the request username, stored as a raw string.
- `createdAt` is server-generated.
- Comments **are** allowed when status is `CLOSED`.
- Comments **are not** allowed when status is `CANCELLED` (409).
- Comments are allowed in `OPEN`, `IN_PROGRESS`, and `RESOLVED`.
- Adding a comment refreshes the ticket `updatedAt` and `updatedBy` (acting username).
- Comments are append-only and are returned in chronological order with the ticket detail (FR3).

### FR7 — Search tickets by keyword
- Keyword matches against `title` and `description`, case-insensitive, partial match (PostgreSQL `ILIKE`, see `spec/architecture.md`).
- Combinable with the status filter (FR8) and pagination (FR2) in the same request.
- Missing `keyword`, or a keyword that is empty / whitespace-only, is treated as no keyword (unfiltered by text).

### FR8 — Filter tickets by status
- Filter by exactly one status value at a time (`OPEN`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`, `CANCELLED`).
- No `status` param = all statuses.
- Unknown `status` values: 400 (not silently ignored).
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
All other pairs, including same-status (`OPEN` → `OPEN`, etc.), are rejected with 409. Terminal states have no outbound transitions.

Explicitly forbidden examples (not exhaustive — the full matrix is `spec/state-machine.md`):
```
CLOSED       → anything (including CLOSED)
CANCELLED    → anything (including CANCELLED)
RESOLVED     → OPEN
RESOLVED     → IN_PROGRESS
RESOLVED     → CANCELLED
OPEN         → RESOLVED
OPEN         → CLOSED
IN_PROGRESS  → OPEN
```

If `spec/state-machine.md` and this section ever disagree, **this section is the product source of truth**.

- Status changes go through a dedicated endpoint, distinct from FR4.
- An invalid transition returns a clear error identifying current status, attempted status, and why it is rejected — the UI must show `message` verbatim.
- Successful transition sets `updatedBy` from the request username and refreshes `updatedAt`.

### FR10 — Backend input validation
- All required fields and the username header are enforced server-side.
- Invalid `priority` or `status` enum values: 400, not silently defaulted.
- `title` / `description` / comment `body` reject blank/whitespace-only strings.
- Lengths: `title` ≤ 200, `description` ≤ 5000, comment `body` ≤ 2000, username / assignee / createdBy / updatedBy / author ≤ 64.
- Every request requires header `X-Username` equal to `alice`, `bob`, or `carol` (case-sensitive). Missing, blank, or unknown: 400.

### FR11 — Meaningful UI errors
- Every backend error (validation 400, not-found 404, invalid transition / read-only / cancelled-comment 409) is rendered as the backend `message` (and `fieldErrors` next to fields when present) — never a generic "Something went wrong" when the backend provided a specific reason.
- Network/unexpected errors (5xx, connection failure) get a distinct generic fallback so users can tell invalid input apart from system failure.

### FR12 — Prototype identity
- The frontend header lists the three usernames; changing the selection applies to all subsequent API calls.
- No endpoint exists to create users. The allowlist is specified here and duplicated as a server constant.

### FR13 — Local stack and configuration
- Repository includes Docker Compose for PostgreSQL 16 and a backend datasource configuration that reads URL/username/password from the environment (or a gitignored local file). Committed `application.yaml` must not contain real passwords.
- `spring-boot-starter-validation` is a required backend dependency so FR10 can be enforced.
- Hibernate schema for the prototype: `ddl-auto=update`. No Flyway/Liquibase unless this document is updated.
- JSON timestamps serialize as ISO-8601 UTC. Java 21, Spring Boot 4.x, Gradle only.
- The Spring application must start against Compose Postgres (empty schema is fine). `contextLoads` (or equivalent) must use Testcontainers Postgres or an explicit Compose-backed profile — it must not assume an unconfigured datasource.

### FR14 — CORS for the prototype UI
- Browser calls from the Vite origin (`http://localhost:5173`) must succeed. Allowed methods: GET, POST, PATCH, OPTIONS. Allowed headers must include `Content-Type` and `X-Username`.
- CORS `OPTIONS` preflight must **not** require `X-Username` (browsers do not send it on preflight). All other `/api/v1/**` requests still follow FR10.
- Do not use `Access-Control-Allow-Origin: *` if credentials are enabled; list the explicit origin even if credentials are unused.

### FR15 — Malformed HTTP input
- Malformed JSON body: 400 `VALIDATION_ERROR`.
- Path `{id}` that is not a number: 400 `VALIDATION_ERROR` (not 500).
- `size` outside 1–100, or `page` less than 0: 400 `VALIDATION_ERROR`.

## 5. Data Model (summary — full detail in `spec/data-model.md`)

**Ticket**: id, title, description, status, priority, assignee (username, never null after persist), createdBy (username), updatedBy (username), createdAt, updatedAt, comments (one-to-many).
**Comment**: id, ticketId (FK), body, author (username), createdAt.

No `User` entity. User-attributed columns store the raw username string.

**Priority enum**: `LOW`, `MEDIUM`, `HIGH`, `URGENT`.

## 6. Non-Functional Requirements

- **Persistence**: PostgreSQL in all environments (local and otherwise). Do not use H2 in main or test.
- **Local Postgres**: Docker Compose service named `postgres`, database `tickets`, host port `5432`, named volume so data survives container and application restarts (FR + §7).
- **No secrets committed**: DB credentials via environment variables (`SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`, `SPRING_DATASOURCE_PASSWORD`) or gitignored `application-local.properties` / `.env`. Example values only in `.env.example`.
- **Testability**: state machine unit-testable without Spring. JPA/`ILIKE` tests use Testcontainers PostgreSQL. `@WebMvcTest` for HTTP mapping and error shape.
- **API errors are structured** (see `spec/api-contract.md`) so the frontend can reliably parse and display them.
- **Styling**: frontend uses CSS Modules only (no Tailwind unless this document changes).

## 7. Acceptance Criteria (traceable to the assignment)

- [ ] Ticket can be created from the UI (FR1)
- [ ] Tickets can be listed (FR2)
- [ ] Ticket details can be viewed (FR3)
- [ ] Ticket fields can be updated (FR4)
- [ ] Create without assignee assigns the current user (FR1)
- [ ] Assignee can be changed but not cleared (FR5)
- [ ] Comments can be added on non-cancelled tickets, including `CLOSED` (FR6)
- [ ] Comments on `CANCELLED` tickets are rejected (FR6)
- [ ] Search works (FR7)
- [ ] Status filter works (FR8)
- [ ] Valid status transitions work (FR9)
- [ ] Invalid status transitions are rejected by the backend (FR9)
- [ ] Terminal tickets reject field updates (FR4)
- [ ] Every API call requires a valid prototype username (FR10, FR12)
- [ ] Data survives application restart (NFR)
- [ ] Backend validation works even if the UI is bypassed (FR10)
- [ ] UI shows meaningful, specific errors (FR11)
- [ ] State-machine tests pass, covering every transition — valid and invalid — in FR9 / `spec/state-machine.md`
- [ ] No secrets committed to the repository
- [ ] Local Compose Postgres + configured datasource; backend starts (FR13)
- [ ] CORS allows the Vite origin and `X-Username`; OPTIONS does not require the header (FR14)
- [ ] Malformed JSON and non-numeric ids return 400, not 500 (FR15)
- [ ] JPA and search tests use Testcontainers Postgres, not H2 (NFR)

## 8. Decisions (closed)

1. `CLOSED` / `CANCELLED` tickets are fully read-only for field and status updates. Exception: comments on `CLOSED` only (decision 2).
2. Comments allowed on `CLOSED`; not allowed on `CANCELLED`.
3. Three prototype users `alice`, `bob`, `carol`; no login. `X-Username` on every API call. User-attributed persistence is the raw username string (`createdBy`, `updatedBy`, `author`).
4. Priority values: `LOW`, `MEDIUM`, `HIGH`, `URGENT`.
5. Field length limits as in FR10 (prototype defaults).
6. PostgreSQL only. Page size default 10; UI sizes 10 / 50 / 100; server max 100.
7. Create with missing/`null` assignee: backend assigns `X-Username`. Assignee is never null after persist and cannot be cleared. FR2 list fields stay the documented minimum.
8. Same-status PATCH is 409. No extra transitions beyond FR9. Blank keyword = no text filter. Search is `ILIKE` on title and description. No `DELETE` for tickets or comments. Field updates are `PATCH`.
9. Gradle only (existing `backend/`). Hibernate `ddl-auto=update`. CSS Modules. Vite origin `http://localhost:5173`.
10. Username filter skips `OPTIONS`. Env-based datasource; Testcontainers for persistence tests; `contextLoads` must not require a developer’s uncommitted DB without a container.
