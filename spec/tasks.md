# Implementation tasks

Status: Draft v1
Last updated: 2026-09-25

Ordered backlog for the support ticket system. Implement **one task ID at a time**. Do not implement later layers in the same pass.

**Sources:** [requirements.md](requirements.md), [data-model.md](data-model.md), [state-machine.md](state-machine.md), [api-contract.md](api-contract.md), [ui-flow.md](ui-flow.md), [architecture.md](architecture.md).

**Code homes:** backend is Gradle under `backend/` (`com.epic.sturdyfernacular`). Do not add Maven. Frontend does not exist yet (T16).

**Rules:** Controller → Service → Repository → Entity. No `@Data` on JPA entities. Entities never returned from controllers. State machine has zero Spring annotations. No H2. No JWT, User CRUD, `DELETE`, attachments, or extra status edges.

**Out of scope:** auth beyond `X-Username`, User table, ticket/comment delete, extra transitions, i18n, notifications.

Each task is independently implementable. **Done when** must pass without needing later tasks (except T0, which is infra).

---

## T0 — Scaffolding (unblocking)

**Depends on:** none

**Do**
- Add Docker Compose PostgreSQL 16 for local use ([architecture.md](architecture.md)).
- Wire `backend/src/main/resources/application.yaml` datasource from env vars (and/or gitignored `application-local.properties`). Do not commit secrets.
- Schema strategy for the prototype: Hibernate `spring.jpa.hibernate.ddl-auto=update`. Do not add Flyway/Liquibase unless a later task explicitly asks.
- Explicit CORS origin for the Vite dev server (not `*` with credentials).
- Add `spring-boot-starter-validation` to [backend/build.gradle](../backend/build.gradle).
- Confirm `.gitignore` covers local properties and `.env`.

**Done when:** `docker compose up -d` starts Postgres; the Spring app starts against it (empty schema ok); validation starter is on the compile classpath. No domain types required.

---

## Entities

### T1 — Enums and prototype users

**Depends on:** T0

**Do**
- `TicketStatus`: `OPEN`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`, `CANCELLED`.
- `Priority`: `LOW`, `MEDIUM`, `HIGH`, `URGENT`.
- `PrototypeUsers` (or equivalent constant): allowlist `alice`, `bob`, `carol` (case-sensitive). No `User` entity ([data-model.md](data-model.md)).

**Done when:** A unit test (no Spring) asserts enum names and `PrototypeUsers.isAllowed("alice")` / rejects `"Alice"` and `"dave"`.

### T2 — Ticket entity

**Depends on:** T1

**Do**
- JPA `Ticket` per [data-model.md](data-model.md): `Long id`; `title` VARCHAR(200); `description` VARCHAR(5000); `status`; `priority`; `assignee` VARCHAR(64) NOT NULL; `createdBy`; `updatedBy`; `createdAt` / `updatedAt` via `@CreationTimestamp` / `@UpdateTimestamp` (UTC).
- No `@Data`. Constructor injection / Lombok getters-setters only as in project rules.
- Do not add Comment yet (T3).

**Done when:** `@DataJpaTest` (or equivalent) against **Testcontainers PostgreSQL** persists a ticket and reloads `createdAt`/`updatedAt`. Do not use H2. If Testcontainers is not on the classpath yet, add it here for this test only.

### T3 — Comment entity

**Depends on:** T2

**Do**
- JPA `Comment`: `id`, `ticket` `@ManyToOne(LAZY)` + `@JoinColumn`, `body` VARCHAR(2000), `author` VARCHAR(64), `createdAt`.
- Ticket `OneToMany` comments, lazy, append-only (no orphan-delete requirement; tickets are never deleted).
- FK ON DELETE restrict.

**Done when:** Testcontainers test saves a ticket + comment and reloads the comment with `ticket_id` set. No REST.

---

## Repositories

### T4 — TicketRepository and CommentRepository

**Depends on:** T3

**Do**
- `TicketRepository extends JpaRepository<Ticket, Long>`.
- `CommentRepository extends JpaRepository<Comment, Long>` plus `findByTicketIdOrderByCreatedAtAscIdAsc`.

**Done when:** Testcontainers: `save` + `findById`; comments for a ticket come back oldest-first. Do **not** implement `ILIKE` here.

### T5 — Ticket search and list query

**Depends on:** T4

**Do**
- Custom query: optional `status` equality; optional keyword `ILIKE` on `title` **or** `description`; escape `%` and `_` in the keyword ([architecture.md](architecture.md)).
- Blank/whitespace keyword = no text predicate.
- `Pageable`; default sort `updatedAt DESC`, `id DESC` ([requirements.md](requirements.md) FR2).
- Page size limits (1–100, default 10) may wait for T11/T13; this task only implements the repository method.

**Done when:** Testcontainers tests: match on title; match on description; case-insensitive; status+keyword together; blank keyword returns all (for that status if set); sort order on tied `updatedAt` uses higher `id` first. Full HTTP list tests wait for T25.

---

## State machine

### T6 — TicketStateMachine

**Depends on:** T1 (entities/enums only; no repositories)

**Do**
- Plain class, **zero** Spring annotations, zero repository dependencies ([architecture.md](architecture.md), java-springboot rules).
- `(current, target) → allow | reject` exactly as [state-machine.md](state-machine.md). Same-status is reject.
- Used later only from the status-change service method.

**Done when:** **25 named unit tests**, one per matrix cell (5×5). Method names must include from/to. Do not cover the matrix with a single loop only ([generate-tests](../.cursor/commands/generate-tests.md)). No Spring context.

---

## Service layer

Use mocked repositories + **real** `TicketStateMachine`. No controllers. Acting user is a `String` method argument (header comes later).

### T7 — Create ticket

**Depends on:** T4, T1

**Do**
- `status = OPEN`.
- `createdBy` = `updatedBy` = acting username.
- If assignee is null/blank/omitted, set assignee to acting username; if present, must be allowlisted ([requirements.md](requirements.md) FR1).
- Do not take status or audit fields from the client object.

**Done when:** Unit tests: omit assignee → current user; explicit assignee `bob` while actor is `alice` → `bob`; invalid assignee rejected; status always `OPEN`.

### T8 — Get ticket by id

**Depends on:** T4, T3

**Do**
- Load ticket; comments oldest-first.
- Missing id → domain not-found exception (HTTP mapping in T15).

**Done when:** Unit tests: found vs missing. No REST.

### T9 — List / search tickets

**Depends on:** T5

**Do**
- Delegate to T5 query. Treat whitespace keyword as absent (FR7).
- Return a page of tickets (mapping to list DTO in T11).

**Done when:** Unit tests with mocked repo: blank keyword does not pass a text filter; status forwarded; pageable forwarded.

### T10 — Update ticket fields

**Depends on:** T7, T8

**Do**
- Partial update: title, description, priority, assignee only. **Never** change status here (FR4 / FR9).
- Omitted fields unchanged.
- `CLOSED` / `CANCELLED` → read-only exception (`TICKET_READ_ONLY`).
- Assignee null/blank → validation/business reject (400 later). Change to another allowlisted user allowed.
- Set `updatedBy` to acting user ( `updatedAt` via Hibernate).

**Done when:** Unit tests: partial patch; terminal 409-equivalent; assignee cannot clear; status field ignored/not applied.

### T11 — Change status

**Depends on:** T6, T8

**Do**
- Call `TicketStateMachine` then persist. Only code path that writes `status`.
- Reject → `INVALID_STATE_TRANSITION` with current and attempted status in the message.
- Set `updatedBy` to acting user.

**Done when:** Unit tests: each allowed edge succeeds; at least one terminal and one same-status reject; verify state machine is invoked (mock it **or** use real T6 and assert no persist on reject).

### T12 — Add comment

**Depends on:** T8

**Do**
- Body only from input; `author` = acting username.
- Allowed on `OPEN`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`.
- `CANCELLED` → `COMMENTS_NOT_ALLOWED`.
- Refresh ticket `updatedAt` / `updatedBy`.

**Done when:** Unit tests: comment on `CLOSED` succeeds; on `CANCELLED` fails; author not taken from input.

---

## DTOs / validation

### T13 — Request and response DTOs

**Depends on:** T1

**Do**
- Separate request vs response types per [api-contract.md](api-contract.md): create, patch, status body `{ "status" }`, comment `{ "body" }`; `TicketListItem`, `TicketDetail`, `CommentResponse`.
- Bean Validation: title ≤ 200, description ≤ 5000, comment body ≤ 2000; `@NotBlank` where required.
- Create: assignee optional.
- Patch: all fields optional; if `status` is present on field-patch DTO, fail validation (400). At least one updatable field required (custom validator or service check documented here).
- Page query: `page` default 0 (≥ 0), `size` default 10 (1–100).
- Mapper: entity → response DTOs. `TicketListItem` is the FR2 minimum only.

**Done when:** Unit tests (validator factory, no web layer): blank title fails; oversize fails; valid create passes; patch with only status fails.

---

## Controllers

`/api/v1` only. One service call per method. `@Valid` on bodies. Do not put business rules in controllers. `X-Username` enforcement is T16 (requests may be unsecured until then).

### T14 — Create, list, get

**Depends on:** T7, T8, T9, T13

**Do**
- `POST /api/v1/tickets` → 201, `Location: /api/v1/tickets/{id}`.
- `GET /api/v1/tickets` query `status`, `keyword`, `page`, `size`; body `content`, `totalElements`, `totalPages`, `pageNumber`.
- `GET /api/v1/tickets/{id}` → 200 detail including comments.

**Done when:** `@WebMvcTest` with **mocked service**: 201 + Location; 200 list shape; 200 detail. Missing-header behavior is T16. If advice is not wired yet, not-found may be 500 — acceptable until T15.

### T15 — Patch fields, patch status, add comment

**Depends on:** T10, T11, T12, T13, T14

**Do**
- `PATCH /api/v1/tickets/{id}`
- `PATCH /api/v1/tickets/{id}/status`
- `POST /api/v1/tickets/{id}/comments` → 201

**Done when:** `@WebMvcTest` mocked service: each mapping hits the matching service method with parsed body. HTTP error mapping is T16.

---

## Exception handling

### T16 — Advice, domain exceptions, username filter

**Depends on:** T14, T15 (and T7–T12 exceptions)

**Do**
- One `@RestControllerAdvice`. Error JSON: `timestamp`, `status`, `error`, `message`, `path`; 400 includes `fieldErrors` ([api-contract.md](api-contract.md), [api-standards](../.cursor/rules/api-standards.md)).
- Map: not-found → 404 `NOT_FOUND`; illegal transition → 409 `INVALID_STATE_TRANSITION`; terminal field update → 409 `TICKET_READ_ONLY`; comment on cancelled → 409 `COMMENTS_NOT_ALLOWED`; Bean Validation → 400 `VALIDATION_ERROR`. No stack traces in body. 500 only for unexpected (`INTERNAL_ERROR`).
- Interceptor/filter: every `/api/v1/**` request requires `X-Username` in `{alice, bob, carol}`. Missing/blank/unknown → 400 `VALIDATION_ERROR` with `fieldErrors` field `X-Username`.
- Resolve acting user for controllers (argument resolver or request attribute).

**Done when:** `@WebMvcTest`: missing header 400; `X-Username: dave` 400; valid header reaches controller; mocked not-found → 404 shape; mocked transition reject → 409 message contains from/to statuses.

---

## Frontend types / API client

### T17 — Vite + React + TypeScript scaffold

**Depends on:** none (can run parallel with backend after T0)

**Do**
- Create `frontend/` Vite + React + TypeScript.
- Pick **one** of CSS Modules or Tailwind and stay with it ([vite-react](../.cursor/rules/vite-react.md), [architecture.md](architecture.md)).
- `.env.example` with `VITE_API_BASE_URL` only. No real secrets.
- Folders: `src/api/`, `src/types/`, `src/pages/`, `src/components/`, `src/hooks/`.

**Done when:** `npm run dev` (or equivalent) serves a blank app; TypeScript build succeeds.

### T18 — Types

**Depends on:** T17

**Do**
- TypeScript interfaces matching [api-contract.md](api-contract.md) DTOs and error body (`fieldErrors` optional). No `any`.

**Done when:** `tsc --noEmit` passes; types are imported from `src/types/` only (no inline duplicates in the client yet).

### T19 — API client and ticket resource

**Depends on:** T18

**Do**
- `src/api/client.ts`: base URL `import.meta.env.VITE_API_BASE_URL`; parse error JSON into typed `ApiError` (`status`, `error`, `message`, `fieldErrors`).
- Inject `X-Username` on **every** call, including GET. Username supplied by a small getter (shell in T20 will own storage).
- `src/api/tickets.ts`: create, list, get, patch, patchStatus, addComment — typed promises.

**Done when:** Unit or RTL-free tests (mock `fetch`): header attached; non-2xx throws `ApiError`; list function passes `page`/`size`/`status`/`keyword`.

---

## Frontend components (one per ui-flow screen)

Implement **one screen per task**. Do not generate list + create + detail in one pass.

### T20 — App shell (user switcher)

**Depends on:** T19

**Do**
- Header: app title + switcher `alice` | `bob` | `carol`.
- Persist selection in `localStorage`; default `alice`.
- Provide current username to the API client getter.
- Global banner for network / 5xx, distinct from validation copy (FR11).
- Routes can be placeholders until T21–T24.

**Done when:** RTL: default `alice`; changing user updates what the client would send (mock getter or inspect storage); refresh keeps selection.

### T21 — Ticket list (`/`)

**Depends on:** T20

**Do**
- Columns: id, title, status, priority, assignee, updatedAt (FR2 minimum).
- Keyword search, status filter (All + five statuses), page size 10 / 50 / 100 (default 10), pager from `totalPages` / `pageNumber`. Reset `page` to 0 when size/keyword/status change.
- Loading (not blank), empty `totalElements === 0`, API `message` on error.
- Create → `/tickets/new`; row → `/tickets/{id}`.

**Done when:** RTL: loading, empty, error, and a populated row; size options 10/50/100. Do not implement create/detail pages here.

### T22 — Create ticket (`/tickets/new`)

**Depends on:** T20, T21 (navigation target)

**Do**
- Fields: title, description, priority default `MEDIUM`, assignee optional (blank omits field — **backend** auto-assigns; do not fill assignee in the client).
- Helper: new tickets are `OPEN`. Cancel → `/`.
- Submit `POST /tickets`; 201 → `/tickets/{id}`; 400 → `fieldErrors` on fields.

**Done when:** RTL: submit omits assignee when blank; shows field errors from mocked 400; does not set status in the body.

### T23 — Ticket detail (`/tickets/{id}`)

**Depends on:** T20

**Do**
- Show all detail fields + comments oldest-first.
- 404 state + link to list.
- Field edit **hidden** when `CLOSED` or `CANCELLED`; assignee dropdown is the three names only.
- Status control: **only** next statuses from [state-machine.md](state-machine.md) / [ui-flow.md](ui-flow.md). Terminal = read-only label. 409 shows `message` next to the control.
- Comment form hidden when `CANCELLED`; visible on `CLOSED`. Author not a field; “Commenting as {user}”.

**Done when:** RTL: 404; closed ticket shows comment form and hides field edit; cancelled hides comment form; OPEN status options are `IN_PROGRESS` and `CANCELLED` only.

### T24 — Not-found route

**Depends on:** T20–T23

**Do**
- Unknown paths: simple not-found + link to `/` ([ui-flow.md](ui-flow.md)).
- Wire routes: `/`, `/tickets/new`, `/tickets/{id}`.

**Done when:** RTL or router test: `/nope` shows not-found and a link home.

---

## Tests

Layer tests above stay the source of truth for that slice. This section is remaining coverage and assignment traceability. Do **not** re-loop the 25 state-machine cells (already T6).

### T25 — Controller WebMvcTest (full contract)

**Depends on:** T16

**Do**
- `@WebMvcTest` for every endpoint: success codes; error JSON shape; `X-Username` required; 409 bodies for transition / read-only / comments-not-allowed (service mocked to throw).
- Invalid enum query `status` → 400.

**Done when:** Tests named per endpoint + outcome. Map files to FR1–FR11 in the PR/task notes ([generate-tests](../.cursor/commands/generate-tests.md)).

### T26 — PostgreSQL integration (search / persistence)

**Depends on:** T5, T7, T12, T0

**Do**
- Testcontainers: keyword `ILIKE`; restart-survival is a manual/NFR check (data still present after app restart against the same volume) — document how to run it; automated: persist + find after new context if practical.
- Comment on closed vs cancelled through service + real DB optional if T12 mocks were insufficient.

**Done when:** ILIKE tests run on Postgres image, not H2. NFR restart noted as checklist in [requirements.md](requirements.md) §7.

### T27 — Frontend RTL remaining states

**Depends on:** T21–T24

**Do**
- Fill gaps: list filter/pager; create happy path; detail 409 on status; network fallback banner (T20).

**Done when:** Each screen has loading **or** empty **or** error coverage as applicable; no screen is happy-path-only.

### T28 — Acceptance traceability

**Depends on:** T25–T27

**Do**
- List which test files cover which §7 checkboxes in [requirements.md](requirements.md). Do not mark checkboxes in requirements unless the user asks.

**Done when:** A short table exists (in this file’s “Coverage” subsection below, or `spec/test-coverage.md` if the table is long). Prefer appending a **Coverage** section here.

---

## Coverage

Fill during T28.

| Acceptance (requirements §7) | Test / task |
|---|---|
| Ticket created from UI (FR1) | T22, T25 |
| List (FR2) | T21, T25 |
| Detail (FR3) | T23, T25 |
| Fields updated (FR4) | T10, T23, T25 |
| Assignee changed not cleared (FR5) | T10, T7 |
| Create auto-assign current user (FR1) | T7 |
| Comments including CLOSED (FR6) | T12, T23 |
| Comments rejected on CANCELLED (FR6) | T12, T25 |
| Search (FR7) | T5, T26 |
| Status filter (FR8) | T5, T21 |
| Valid / invalid transitions (FR9) | T6, T11, T25 |
| Terminal field updates rejected (FR4) | T10, T25 |
| Username required (FR10, FR12) | T16 |
| Persistence / no H2 (NFR) | T0, T2, T26 |
| Validation if UI bypassed (FR10) | T13, T25 |
| UI-specific errors (FR11) | T20–T23, T27 |
| State-machine every cell | T6 |
| No secrets in repo | T0, T17 |

---

## Suggested sequence

```
T0 → T1 → T2 → T3 → T4 → T5
         ↘ T6
T5+T6 → T7 → T8 → T9 → T10 → T11 → T12 → T13 → T14 → T15 → T16
T17 → T18 → T19 → T20 → T21 → T22 → T23 → T24
T16+T5 → T25 → T26 → T27 → T28
```

T17–T20 may overlap T1–T13 if the API contract is treated as stable.
