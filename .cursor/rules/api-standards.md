---
description: applies to every REST endpoint under
alwaysApply: true
---

## Base path & versioning
- All endpoints under `/api/v1/...`.
- Resource-based nouns, plural: `/api/v1/tickets`, `/api/v1/tickets/{id}/comments`. No verbs in URLs (`/tickets/create` is wrong).

## HTTP methods & status codes
| Action | Method | Success code |
|---|---|---|
| Create ticket | POST `/tickets` | 201 Created (with `Location` header) |
| List tickets (search/filter) | GET `/tickets?status=&keyword=&page=&size=` | 200 |
| Get ticket detail | GET `/tickets/{id}` | 200 |
| Update ticket fields | PUT/PATCH `/tickets/{id}` | 200 |
| Change status | PATCH `/tickets/{id}/status` (separate endpoint, body `{ "status": "..." }`) | 200, or 409 if transition invalid |
| Add comment | POST `/tickets/{id}/comments` | 201 |

Status transitions go through their own endpoint, not the general PATCH, so the state machine has one obvious entry point to guard.

## Request/response shape
- Request DTOs and response DTOs are separate classes — never reuse the entity or a single DTO for both directions.
- Field names: `camelCase` in JSON, matching Java field names, no manual mapping needed.
- Dates/times: ISO-8601 (`2026-09-25T10:15:30Z`), UTC.
- Pagination: Spring's `Pageable`/`Page<T>` — response includes `content`, `totalElements`, `totalPages`, `pageNumber`.

## Error response shape (consistent across all endpoints)
```json
{
  "timestamp": "2026-09-25T10:15:30Z",
  "status": 409,
  "error": "INVALID_STATE_TRANSITION",
  "message": "Cannot move ticket from CLOSED to OPEN",
  "path": "/api/v1/tickets/42/status"
}
```
- `error` is a stable machine-readable code (UPPER_SNAKE_CASE), `message` is human-readable, safe to show in the UI.
- Validation errors (400) include a `fieldErrors` array: `[{ "field": "title", "message": "must not be blank" }]`.

## Status codes to use consistently
- 400 — request validation failure (bad input shape/missing required field)
- 404 — resource not found
- 409 — valid request, but violates a business rule (e.g. bad state transition)
- 422 — semantically invalid but not a conflict (rare; prefer 400/409 above)
- 500 — reserved for genuine unhandled/unexpected errors only, never for expected business failures

## Search & filter
- `GET /tickets?keyword=login&status=OPEN` — both params optional and combinable.
- Keyword search matches title + description (case-insensitive, `LIKE %keyword%` or full-text if using Postgres `tsvector` — document which one you picked in `spec/architecture.md`).

## Security / secrets
- No API keys, DB passwords, or tokens in code or `application.properties` committed to git — use `application-local.properties` (gitignored) or environment variables, referenced as `${DB_PASSWORD}`.
- CORS: explicit allowed origins list for the frontend dev server, never `*` if credentials are involved.