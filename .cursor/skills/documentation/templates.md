# Spec templates

Use these skeletons when the file does not exist. Fill from `spec/requirements.md` and user decisions. Leave TBD only for still-open questions.

## spec/api-contract.md

```markdown
# API Contract

Status: Draft
Last updated: YYYY-MM-DD
Base path: `/api/v1`

## Error response

Standard body (all errors):

\`\`\`json
{
  "timestamp": "2026-09-25T10:15:30Z",
  "status": 409,
  "error": "INVALID_STATE_TRANSITION",
  "message": "Cannot move ticket from CLOSED to OPEN",
  "path": "/api/v1/tickets/42/status"
}
\`\`\`

Validation (400) also includes `"fieldErrors": [{ "field": "title", "message": "must not be blank" }]`.

## Endpoints

### POST /tickets
- Success: 201, `Location` header
- Body / response: fields, required vs optional, enums

### GET /tickets
- Query: `status`, `keyword`, `page`, `size`
- Success: 200, Spring `Page` shape: `content`, `totalElements`, `totalPages`, `pageNumber`
- List item fields

### GET /tickets/{id}
- Success: 200 with comments (oldest first)
- 404 if missing

### PATCH /tickets/{id}
- Editable fields only (not status)
- 409 if terminal tickets are field-locked (only if requirements decide that)

### PATCH /tickets/{id}/status
- Body: `{ "status": "IN_PROGRESS" }`
- 200 or 409

### POST /tickets/{id}/comments
- Success: 201
```

## spec/state-machine.md

```markdown
# State machine

Statuses: OPEN, IN_PROGRESS, RESOLVED, CLOSED, CANCELLED

Terminal: CLOSED, CANCELLED

## Allowed

| From | To |
|---|---|
| OPEN | IN_PROGRESS |
| OPEN | CANCELLED |
| IN_PROGRESS | RESOLVED |
| IN_PROGRESS | CANCELLED |
| RESOLVED | CLOSED |

## Rejected (409)

Include at least: CLOSED → anything, CANCELLED → anything, RESOLVED → OPEN, CLOSED → OPEN, CANCELLED → OPEN.

Full matrix: every pair listed as Allow or Reject. Do not omit cells.
```

## spec/data-model.md

```markdown
# Data model

## Ticket
id, title, description, status, priority, assignee, createdAt, updatedAt, comments

## Comment
id, ticketId, body, author, createdAt

## Enums
- Status: OPEN, IN_PROGRESS, RESOLVED, CLOSED, CANCELLED
- Priority: only values confirmed in requirements (default assumption LOW, MEDIUM, HIGH, URGENT until decided)

## Relationships
Ticket 1—* Comment; comments append-only
```

## spec/ui-flow.md

```markdown
# UI flow

Screens: list, detail, create (and edit if distinct).

For each screen:
- Data shown
- Actions (create, search, filter, update, transition, comment)
- Valid next statuses only in the status control
- Loading, empty, 400/404/409, network/5xx fallback
```

## spec/architecture.md

```markdown
# Architecture

- Backend: Java 21, Spring Boot, JPA, PostgreSQL
- Frontend: Vite + React + TypeScript; API client in `src/api/`; types in `src/types/`
- Layers: Controller → Service → Repository → Entity
- State machine: dedicated class, no Spring, called only from service on status endpoint
- Search: document ILIKE vs tsvector once chosen
- CORS: explicit frontend origin, not `*` with credentials
- Secrets: env / gitignored local properties only
```
