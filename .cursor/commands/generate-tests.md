/generate-tests

Generate tests for the file/class/component I specify, following `.cursor/rules/testing.md`.

Rules for this command specifically:
- For `TicketStateMachine` or any state-machine-related class: enumerate EVERY transition pair explicitly from `spec/state-machine.md` — both the valid ones (assert success) and every invalid one named in the spec (assert rejection with the correct exception/status). Do not use a generic loop that "covers all combinations" without listing them — I need to be able to see each case named in the test method name.
- For service/repository layers touching PostgreSQL-specific behavior (e.g. keyword search): use Testcontainers with a real Postgres image, not H2, so SQL dialect differences don't get masked.
- For controllers: use `@WebMvcTest` with mocked service layer; assert status codes and error response shape, not just 200/404.
- For frontend components: use React Testing Library; test the loading/error/empty states, not just the happy path.
- After generating, tell me explicitly which acceptance criteria (from `spec/requirements.md`) each new test file covers, so I can cross-check coverage against the assignment's acceptance list.