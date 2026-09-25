---
name: documentation
description: Use when writing or updating README, API docs, or code-level Javadoc/TSDoc for this project. Keeps documentation style consistent and prevents documentation drift from the actual spec/code.
---

# Documentation Skill

## When generating a README
- Sections, in order: Overview, Tech stack, Prerequisites, Setup (backend), Setup (frontend), Running locally, Running tests, API summary (link to `spec/api-contract.md`, don't duplicate it), Project structure, Known limitations.
- Setup steps must be copy-pasteable commands, not prose descriptions of what to do.
- Never document a feature or endpoint that isn't actually implemented yet — check the code, not just the spec, before writing "supports X".

## When generating API documentation
- Source of truth is `spec/api-contract.md` plus the actual controller code — if they disagree, flag the disagreement instead of picking one silently.
- Document: method, path, request body schema, response schema, all possible status codes with when each occurs (not just the happy path).
- Include one realistic example request/response per endpoint, not a placeholder like `{...}`.

## When generating Javadoc / TSDoc
- Only document the "why", not a restatement of the method name (`// gets the ticket by id` on `getTicketById()` is not acceptable — skip it).
- Document non-obvious constraints (e.g. "must be called after state machine validation" ) and any thrown exceptions with the conditions that trigger them.

## When generating architecture/design docs
- Diagrams as Mermaid where possible so they render in GitHub/Cursor without external tools.
- Every architectural decision should note the alternative considered and why it was rejected, in one line — this is what makes `spec/architecture.md` useful to a reviewer, not just a description of what was built.

## What NOT to do
- Do not auto-generate documentation for code that was itself auto-generated and unreviewed — documentation should follow review, not precede it.
- Do not let documentation become a copy of the spec files; it should reference them, not duplicate them, so there's one source of truth.