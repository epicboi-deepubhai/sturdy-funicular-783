# State machine

Status: Draft v2
Last updated: 2026-09-25

Product source of truth if this file disagrees: `spec/requirements.md` FR9.

## Statuses

`OPEN`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`, `CANCELLED`

Terminal (no outbound transitions): `CLOSED`, `CANCELLED`

## Allowed (200)

| From | To |
|---|---|
| OPEN | IN_PROGRESS |
| OPEN | CANCELLED |
| IN_PROGRESS | RESOLVED |
| IN_PROGRESS | CANCELLED |
| RESOLVED | CLOSED |

Exactly these five. Same-status is not allowed.

## Full matrix

Rows = current status. Columns = requested status. **Allow** = persist and return 200. **Reject** = 409 `INVALID_STATE_TRANSITION`.

|  | OPEN | IN_PROGRESS | RESOLVED | CLOSED | CANCELLED |
|---|---|---|---|---|---|
| OPEN | Reject | Allow | Reject | Reject | Allow |
| IN_PROGRESS | Reject | Reject | Allow | Reject | Allow |
| RESOLVED | Reject | Reject | Reject | Allow | Reject |
| CLOSED | Reject | Reject | Reject | Reject | Reject |
| CANCELLED | Reject | Reject | Reject | Reject | Reject |

## Enforcement

- Evaluate in a dedicated class with no Spring dependencies: `(current, target) → allow | reject`.
- The ticket service must call it before persisting a status change.
- `PATCH /tickets/{id}` must not accept or change `status`.
- Unknown enum values never reach this table (400 at deserialization / validation).

## Error message

On Reject, `message` must identify current status and attempted status, e.g. `Cannot move ticket from CLOSED to OPEN`.
