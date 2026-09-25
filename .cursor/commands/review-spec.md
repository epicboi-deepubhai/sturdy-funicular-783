/review-spec

Review the current repository implementation against the specifications in spec/.

Scope

Compare both backend and frontend against all relevant files under spec/, with particular attention to:

spec/api-contract.md

spec/state-machine.md

spec/ui-flow.md (if present)

Inspect the actual implementation, including:

Backend routes/controllers

Request/response DTOs and validation

HTTP status codes and error responses

State-transition logic

Frontend API client/types

Frontend state-transition controls and UI behavior

Do not rely on filenames or assumptions. Trace the implementation far enough to verify the behavior against the spec.

Required checks
1. API contract

For every endpoint documented in spec/api-contract.md, verify:

The endpoint exists.

HTTP method and path match.

Request body/query/path parameters match.

Required fields and validation constraints match.

Response shape matches.

Response status codes match.

Error response shape matches.

Frontend API types/client usage matches the contract.

Also identify:

Specified endpoints with no implementation.

Implemented endpoints not documented in the spec.

Implemented request/response fields not documented in the spec.

Spec fields that are missing from the implementation.

Any type, validation, or status-code drift.

2. State machine

Compare the implementation against spec/state-machine.md exactly.

For every documented transition, verify:

Source state

Target state

Whether the transition is allowed

Backend enforcement

Frontend options/controls, where applicable

Explicitly verify that CANCELLED and CLOSED are terminal states if the spec defines them as terminal.

Also identify:

Missing transitions

Extra transitions

Incorrectly permitted transitions

Incorrectly rejected transitions

States present in code but absent from the spec

States present in the spec but absent from code

Do not infer intended transitions. The specification is the reference.

3. Undocumented implementation drift

Find behavior, endpoints, fields, states, or other contract-level functionality present in the code but absent from spec/.

Report these as undocumented drift, without assuming they are bugs.

4. Missing implementation

Find requirements explicitly present in spec/ that have no corresponding implementation.

Report these as missing implementation.

Output

Return only a review report. Do not modify any files.

Use this table as the primary output:

Spec item	Implemented?	Drift / notes
GET /tickets	Yes	Response is missing createdAt
OPEN → IN_PROGRESS	Yes	Matches spec
CANCELLED terminal	No	CANCELLED → OPEN is permitted in ...

Group the table into these sections:

API Contract

State Machine

Frontend / UI Flow

Undocumented Drift

Missing Implementation

For every finding, include the relevant file path and, where useful, the symbol/function/route responsible.

Rules

Do not fix anything.

Do not edit files.

Do not create migrations, tests, commits, or patches.

Do not recommend whether the spec or implementation should change.

Report facts and discrepancies only.

Do not mark something as drift merely because it is implemented differently internally; only report differences that affect the behavior or contract described by the spec.

If the spec is ambiguous or contradictory, explicitly report the ambiguity instead of guessing.

If something cannot be verified from the repository, mark it Unable to verify and explain why.

Prefer concrete evidence over assumptions.

Be exhaustive: check every endpoint, field, status code, state, and transition defined by the relevant specs.