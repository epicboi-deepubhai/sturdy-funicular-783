# Data model

Status: Draft v2
Last updated: 2026-09-25

No `User` table. Prototype identities are the allowlist `alice`, `bob`, `carol`. Columns below that store identity persist that string as `VARCHAR`.

## Enums

**TicketStatus**: `OPEN`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`, `CANCELLED`

**Priority**: `LOW`, `MEDIUM`, `HIGH`, `URGENT`

## Ticket

| Column | Type | Constraints |
|---|---|---|
| id | BIGINT | PK, generated |
| title | VARCHAR(200) | NOT NULL, not blank |
| description | VARCHAR(5000) | NOT NULL, not blank |
| status | ENUM / VARCHAR | NOT NULL, default `OPEN` on insert |
| priority | ENUM / VARCHAR | NOT NULL |
| assignee | VARCHAR(64) | NOT NULL; allowlisted username; never updated to null |
| created_by | VARCHAR(64) | NOT NULL, allowlisted username (JSON: `createdBy`) |
| updated_by | VARCHAR(64) | NOT NULL, allowlisted username (JSON: `updatedBy`) |
| created_at | TIMESTAMP WITH TIME ZONE | NOT NULL, set on insert |
| updated_at | TIMESTAMP WITH TIME ZONE | NOT NULL, set on insert and on field update, status change, or new comment |

JSON uses camelCase: `createdBy`, `updatedBy`, `createdAt`, `updatedAt`.

## Comment

| Column | Type | Constraints |
|---|---|---|
| id | BIGINT | PK, generated |
| ticket_id | BIGINT | NOT NULL, FK → ticket.id, ON DELETE restrict (tickets are not deleted) |
| body | VARCHAR(2000) | NOT NULL, not blank |
| author | VARCHAR(64) | NOT NULL, allowlisted username from `X-Username` (this is the user-context column for comments) |
| created_at | TIMESTAMP WITH TIME ZONE | NOT NULL, set on insert |

Comments are append-only. No `updated_at`. No edit/delete.

## Relationships

- Ticket 1 — * Comment (`FetchType.LAZY` on the collection in JPA; detail API still returns all comments).
- Order for FR3: `created_at` ascending, then `id` ascending.

## Indexes

- `ticket(updated_at DESC, id DESC)` for default list sort.
- `ticket(status)` for FR8.
- `comment(ticket_id, created_at, id)` for detail comments.

Title/description search uses `ILIKE`; no extra FTS index required for the prototype.

## Integrity rules (enforced in service, not only UI)

- Create: `status = OPEN`; `createdBy` = `updatedBy` = `X-Username`.
- Assignee: on insert, use body value if allowlisted; if omitted or null, set to `X-Username`. Updates cannot set null/blank.
- Terminal tickets: no updates to ticket columns except `updatedAt` / `updatedBy` when adding a comment on `CLOSED`.
- `CANCELLED`: no comment insert.
