# UI flow

Status: Draft v3
Last updated: 2026-09-25

Stack: Vite + React + TypeScript in `frontend/`. CSS Modules. Typed client in `src/api/`. Types mirror `spec/api-contract.md`. Dev server port **5173**. `VITE_API_BASE_URL` default `http://localhost:8080`.

## Shell (all screens)

- App header: title + **user switcher** (`alice` | `bob` | `carol`).
- Selected user is sent as `X-Username` on every request (API client interceptor). Persist the selection in `localStorage` so refresh keeps it; default `alice` if unset.
- Changing user does not log in; it changes the acting identity and immediately refetches list/detail data. If the new user cannot access an open ticket detail, replace-navigate to `/` and show the global banner `Ticket not found`.
- Global fallback banner for network / 5xx: distinct copy from validation errors (FR11).
- No login page. No user admin.

## Screen: Ticket list (`/`)

**Shows (FR2 minimum):** id, title, status, priority, assignee, updatedAt. Results
include only tickets created by or currently assigned to the selected user.

**Controls**
- Keyword search (debounced or explicit Submit; empty = no keyword param).
- Status filter: All + the five statuses.
- Page size: 10 / 50 / 100 (default 10). `page` resets to 0 when size, keyword, or status changes.
- Pager using `totalPages` / `pageNumber`.
- Primary action: Create ticket → `/tickets/new`.
- Row click → `/tickets/{id}`.

**States**
- Loading: list skeleton or spinner, not a blank page.
- Empty: message when `totalElements === 0` (including “no matches”).
- 400: show `message` and field errors if the filter enum is invalid (should not happen from the UI).

## Screen: Create ticket (`/tickets/new`)

**Fields**
- title, description (required)
- priority: dropdown LOW / MEDIUM / HIGH / URGENT (no default that hides the choice — require an explicit selection, or default `MEDIUM`; use **default `MEDIUM`**)
- assignee: optional dropdown (blank = “assign to me”); values alice / bob / carol. If left blank, the request omits `assignee` and the **backend** sets it to the current `X-Username`. Do not implement auto-assign only in the UI.

Status is not shown as editable; helper text: new tickets are `OPEN`.

Submit → `POST /tickets`. On 201, navigate to `/tickets/{id}`. On 400, show `fieldErrors` on the fields.

Cancel → `/`.

## Screen: Ticket detail (`/tickets/{id}`)

**Shows:** all detail fields including `createdBy`, `updatedBy`, timestamps, comments oldest-first.

**404:** a directly opened missing or inaccessible ticket shows the dedicated
not-found message with a link back to the list. If a user switch makes a
previously loaded ticket inaccessible, redirect to the list and show
`Ticket not found` in the global banner.

### Field edit

Visible only when status is **not** `CLOSED` and not `CANCELLED`.

- Same fields as create.
- Assignee: the three usernames only (no Unassigned). Current value is always set.
- Save → `PATCH /tickets/{id}`. 409 read-only: show `message` (should not appear if UI hid the form).

### Status

Control lists **only allowed next statuses** from `spec/state-machine.md` for the current status.

| Current | Options |
|---|---|
| OPEN | IN_PROGRESS, CANCELLED |
| IN_PROGRESS | RESOLVED, CANCELLED |
| RESOLVED | CLOSED |
| CLOSED | none (read-only label) |
| CANCELLED | none (read-only label) |

Change → `PATCH /tickets/{id}/status`. On 409, show `message` next to the control, do not hide it.

### Comments

- Thread oldest-first.
- Form (body textarea + submit) when status is not `CANCELLED` (includes `CLOSED`).
- Author is not a field; UI may show “Commenting as {username}”.
- Submit → `POST /tickets/{id}/comments`, then append or refetch. 409 on cancelled: show `message`.

## Routing

| Path | Screen |
|---|---|
| `/` | List |
| `/tickets/new` | Create |
| `/tickets/{id}` | Detail |

Unknown paths: simple not-found with link to `/`.

## Client validation

Mirrors FR10 lengths and required fields for fast feedback. Backend remains authoritative; never skip sending a request solely because the client already validated, for writes the user confirmed — client may disable submit while empty, but 400/409 from the server must still be displayed.

## API client

- Base URL: `import.meta.env.VITE_API_BASE_URL`.
- Throws typed `ApiError` with `status`, `error`, `message`, `fieldErrors`.
- Attaches `X-Username` on every call, including GET.
