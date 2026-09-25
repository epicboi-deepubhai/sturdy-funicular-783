# API Contract

Status: Draft v2
Last updated: 2026-09-25
Base path: `/api/v1`

All JSON field names are camelCase. Timestamps are ISO-8601 UTC (`2026-09-25T10:15:30Z`).

There is no `DELETE` for tickets or comments. There is no users CRUD API. There is no login API.

## Identity header

Every endpoint requires:

```
X-Username: alice
```

Allowed values (case-sensitive): `alice`, `bob`, `carol`.

| Condition | Status | `error` |
|---|---|---|
| Header missing or blank | 400 | `VALIDATION_ERROR` |
| Value not in the allowlist | 400 | `VALIDATION_ERROR` |

`fieldErrors` should include `{ "field": "X-Username", "message": "..." }`.

The header is the acting user. It is not read from the body. Comment `author`, ticket `createdBy` / `updatedBy` are copied from it on write.

## Error response

All errors:

```json
{
  "timestamp": "2026-09-25T10:15:30Z",
  "status": 409,
  "error": "INVALID_STATE_TRANSITION",
  "message": "Cannot move ticket from CLOSED to OPEN",
  "path": "/api/v1/tickets/42/status"
}
```

Validation (400) also includes:

```json
"fieldErrors": [
  { "field": "title", "message": "must not be blank" }
]
```

| HTTP | When | Typical `error` |
|---|---|---|
| 400 | Validation, unknown enum, bad page/size, bad header | `VALIDATION_ERROR` |
| 404 | Ticket id does not exist | `NOT_FOUND` |
| 409 | Illegal status transition; field update on terminal ticket; comment on `CANCELLED` | `INVALID_STATE_TRANSITION`, `TICKET_READ_ONLY`, `COMMENTS_NOT_ALLOWED` |
| 500 | Unexpected only | `INTERNAL_ERROR` |

Do not put stack traces in the body.

## Shared shapes

### Ticket list item (`TicketListItem`)

```json
{
  "id": 42,
  "title": "Cannot login",
  "status": "OPEN",
  "priority": "HIGH",
  "assignee": "bob",
  "updatedAt": "2026-09-25T10:15:30Z"
}
```

`assignee` is always a username string after persist (never `null`).

### Comment (`CommentResponse`)

```json
{
  "id": 7,
  "body": "Reproduced on staging.",
  "author": "alice",
  "createdAt": "2026-09-25T10:16:00Z"
}
```

### Ticket detail (`TicketDetail`)

```json
{
  "id": 42,
  "title": "Cannot login",
  "description": "SSO redirect loops.",
  "status": "OPEN",
  "priority": "HIGH",
  "assignee": "bob",
  "createdBy": "alice",
  "updatedBy": "alice",
  "createdAt": "2026-09-25T10:15:30Z",
  "updatedAt": "2026-09-25T10:16:00Z",
  "comments": []
}
```

`comments` is omitted on create/update/status responses that do not reload the thread; clients that need comments use `GET /tickets/{id}`. **Create, update, and status success bodies are `TicketDetail` without requiring comments to be populated** — include `comments` as the current list (possibly empty) for a stable type.

## Endpoints

### POST /tickets

Create a ticket. Success: **201** with `Location: /api/v1/tickets/{id}`.

Request:

```json
{
  "title": "Cannot login",
  "description": "SSO redirect loops.",
  "priority": "HIGH",
  "assignee": "bob"
}
```

| Field | Required | Rules |
|---|---|---|
| title | yes | 1–200 after trim; blank rejected |
| description | yes | 1–5000 after trim |
| priority | yes | `LOW` \| `MEDIUM` \| `HIGH` \| `URGENT` |
| assignee | no | If present and non-null: allowlisted username. `null` or omitted: **backend** sets assignee to `X-Username` |

Do not accept `status`, `createdBy`, `updatedBy`, ids, or timestamps from the client.

Response: `TicketDetail` with `status` `OPEN`, `createdBy`/`updatedBy` = `X-Username`, `assignee` = request value or `X-Username` if omitted/null, `comments: []`.

### GET /tickets

List / search / filter. Success: **200**.

Query:

| Param | Default | Rules |
|---|---|---|
| status | (none) | One of the five statuses; invalid → 400 |
| keyword | (none) | Optional; blank/whitespace = no text filter |
| page | 0 | Integer ≥ 0 |
| size | 10 | Integer 1–100 |

Sort is not client-controlled: `updatedAt` DESC, `id` DESC.

Keyword: case-insensitive partial match on `title` **or** `description` (`ILIKE '%' \|\| escaped keyword \|\| '%'`). Combinable with `status`.

Response (Spring page fields required by project rules):

```json
{
  "content": [],
  "totalElements": 0,
  "totalPages": 0,
  "pageNumber": 0
}
```

`content` is `TicketListItem[]`. Extra Spring page fields may be present; clients must not require them.

### GET /tickets/{id}

Success: **200** `TicketDetail` with `comments` oldest-first. **404** if missing.

### PATCH /tickets/{id}

Partial field update. Success: **200** `TicketDetail`.

Request (all keys optional; at least one of the four must be present):

```json
{
  "title": "Cannot login (SSO)",
  "description": "Updated repro steps.",
  "priority": "URGENT",
  "assignee": "carol"
}
```

| Field | If present |
|---|---|
| title | same as create |
| description | same as create |
| priority | same as create |
| assignee | must be allowlisted username; `null`/blank → 400 |

Unknown JSON fields ignored or 400 (either is fine; prefer ignoring extras). `status` in body is not applied; prefer 400 if `status` is present so clients cannot think it worked.

| Condition | Status | `error` |
|---|---|---|
| Ticket missing | 404 | `NOT_FOUND` |
| Status is `CLOSED` or `CANCELLED` | 409 | `TICKET_READ_ONLY` |
| Empty body (no updatable fields) | 400 | `VALIDATION_ERROR` |

### PATCH /tickets/{id}/status

Success: **200** `TicketDetail`.

Request:

```json
{
  "status": "IN_PROGRESS"
}
```

`status` required, valid enum. Transition rules: `spec/state-machine.md`.

| Condition | Status | `error` |
|---|---|---|
| Ticket missing | 404 | `NOT_FOUND` |
| Transition not allowed (including same status) | 409 | `INVALID_STATE_TRANSITION` |

### POST /tickets/{id}/comments

Success: **201**. Body: `CommentResponse`. `Location` optional (`/api/v1/tickets/{id}` is enough; no comment GET-by-id).

Request:

```json
{
  "body": "Reproduced on staging."
}
```

Do not accept `author`. Server sets `author` from `X-Username`.

| Condition | Status | `error` |
|---|---|---|
| Ticket missing | 404 | `NOT_FOUND` |
| Status is `CANCELLED` | 409 | `COMMENTS_NOT_ALLOWED` |
| Blank body | 400 | `VALIDATION_ERROR` |

`CLOSED` is allowed.
