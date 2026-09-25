---
description: Vite + React frontend development rules for all code under frontend/
globs: frontend/**
alwaysApply: false
---

# Vite + React Frontend Rules

Applies to all code under `frontend/`.

## Stack
- Vite + React (TypeScript, not plain JS).
- Fetch layer: a single typed API client module (`src/api/client.ts`), not `fetch()` calls scattered across components.
- Styling: plain CSS Modules or Tailwind — pick one at project start and stay consistent; don't mix.

## Structure
```
src/
  api/          # typed client functions per resource (tickets.ts, comments.ts)
  components/   # dumb/presentational components
  pages/        # route-level components (TicketList, TicketDetail, CreateTicket)
  hooks/        # custom hooks (useTickets, useTicket)
  types/        # shared TS types/interfaces mirroring backend DTOs
```

## API client rules
- Every backend DTO in `spec/api-contract.md` gets a matching TS `interface` in `src/types/`. Don't use `any`.
- API functions return typed promises and throw a typed `ApiError` on non-2xx responses, parsed from the backend's error shape (`error`, `message`, `fieldErrors`).
- Base URL comes from `import.meta.env.VITE_API_BASE_URL`, never hardcoded.

## State & data fetching
- Use React state/hooks (or a light library like `@tanstack/react-query` if already installed) — no need to introduce Redux for this app's size.
- Loading and error states are explicit in every data-fetching component: don't render blank screens on error or infinite spinners with no timeout/error path.

## Forms & validation
- Client-side validation mirrors backend constraints (required fields, max lengths) purely for fast feedback — the backend remains the source of truth. Never skip a check just because the client already validated it.
- On a 400/409 from the API, surface `message` (and per-field `fieldErrors`) next to the relevant form field — never a raw console error or a generic "Something went wrong" when the backend gave a specific reason.

## Status transitions in the UI
- The status-change control (e.g. a dropdown) only ever offers the currently-valid next statuses for that ticket — but the backend is still the enforcement point. If the backend rejects a transition, show its `message` verbatim to the user, don't hide the error.

## What NOT to do
- Do not generate a full page + all its components + API calls in one shot — build one component at a time so each can be checked against `spec/ui-flow.md`.
- Do not introduce a UI component library not already agreed (e.g. don't silently add MUI if the project didn't ask for it).
- Do not commit `.env` files with real API URLs/secrets — only `.env.example`.