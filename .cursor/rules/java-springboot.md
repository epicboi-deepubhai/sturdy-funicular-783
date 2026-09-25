---
description: General Java Spring Boot project rules and engineering standards
globs:
  - "**/*.java"
  - "**/*.xml"
  - "**/*.yml"
  - "**/*.yaml"
  - "**/*.properties"
alwaysApply: true
---

Applies to all backend code under `backend/`.

## Stack
- Java 21, Spring Boot 4.x, Spring Data JPA, PostgreSQL (prod), H2 (local/test only if explicitly requested).
- Build with Maven (or Gradle — match whatever `pom.xml`/`build.gradle` already exists; never introduce a second build tool).

## Layering (strict)
`Controller → Service → Repository → Entity`
- Controllers: only request/response mapping, validation trigger, calling one service method. No business logic.
- Services: all business logic, including state machine / transition rules. Services depend on repository interfaces, never on other controllers.
- Repositories: `interface XRepository extends JpaRepository<X, Long>` — no custom SQL unless a derived/`@Query` method genuinely can't express it.
- Entities are never returned directly from controllers — always map to a DTO/response record.

## Dependency injection
- Constructor injection only. No `@Autowired` on fields. Use `private final` fields + Lombok `@RequiredArgsConstructor`, or explicit constructors — pick one style and stay consistent within a class.

## Lombok usage
- `@Getter/@Setter` on entities and DTOs is fine.
- Do NOT use `@Data` on JPA entities (it generates `equals`/`hashCode`/`toString` that can trigger lazy-loading issues or infinite recursion on bidirectional relations).
- Use `@Builder` for DTOs/response objects where useful, not required on entities.

## Validation
- All request DTOs use `jakarta.validation` annotations (`@NotNull`, `@NotBlank`, `@Size`, custom validators for enums like status).
- Controllers annotate the request body with `@Valid`.
- Never re-implement null/blank checks manually in the service if a Bean Validation annotation already covers it.

## Error handling
- One global `@RestControllerAdvice` class. No `try/catch` swallowing exceptions in controllers or services to return `null`/generic 500s.
- Business rule violations (e.g. invalid state transition) throw a specific unchecked exception (e.g. `InvalidStateTransitionException`) that the advice maps to `409 CONFLICT` with a structured error body — see `api-standards.md` for the shape.
- Never expose stack traces or raw exception messages to the client in the response body.

## State machine (ticket status)
- Transition rules live in ONE place — a dedicated class (e.g. `TicketStateMachine`), not scattered `if` checks across services.
- This class must have zero Spring annotations / zero dependencies on repositories — it takes a current status + target status and returns allowed/rejected. This makes it trivially unit-testable without Spring context.
- The service calls the state machine before persisting any status change. It must be impossible to bypass by hitting the generic "update ticket" endpoint.

## Persistence
- Use `@CreationTimestamp` / `@UpdateTimestamp` (Hibernate) for audit fields, not manual `LocalDateTime.now()` scattered in code.
- Every entity has a surrogate `Long id` primary key.
- Foreign keys modeled as `@ManyToOne` with explicit `@JoinColumn`, `FetchType.LAZY` by default.

## What NOT to do
- Do not generate an entire feature (entity + repo + service + controller + tests) in a single response. One layer per prompt, so each can be reviewed before the next is built on top of it.
- Do not silently change the API contract in `spec/api-contract.md` while implementing — if something in the spec is impractical, stop and flag it instead of improvising.
- Do not add dependencies not already in `pom.xml`/`build.gradle` without calling it out explicitly.