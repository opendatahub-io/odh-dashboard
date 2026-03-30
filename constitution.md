# ODH Dashboard Constitution

ODH Dashboard is a React/TypeScript monorepo providing the web UI for Red Hat OpenShift AI (RHOAI) and Open Data Hub. It comprises a main frontend application, a Node.js/Fastify backend, and multiple feature packages (model-registry, model-serving, gen-ai, and others). Some packages include Go-based BFF (Backend-for-Frontend) services.

This constitution establishes non-negotiable development principles for all components: frontend, backend, feature packages, and BFF services. It supersedes conflicting practices found in other documents or conventions.

---

## Core Principles

### I. Code Quality

All production code MUST adhere to the following standards:

- Code MUST be clean, readable, and self-documenting. Favor clarity over cleverness.
- Functions and methods MUST have a single responsibility. Extract only when duplication is real, not hypothetical.
- All code MUST pass configured linting and formatting rules before commit. No suppressions without documented justification.
- Dead code, unused imports, and unreachable branches MUST be removed, not commented out.
- Naming MUST be consistent and domain-appropriate. Variables, functions, and files MUST convey intent without requiring additional comments.
- Error handling MUST be explicit at system boundaries (user input, external APIs, I/O). Internal code MAY trust framework guarantees without redundant checks.

---

### II. Test-Driven Development

All new and modified code MUST include meaningful test coverage. Follow TDD (Red-Green-Refactor) where practical:

- **Unit tests** (Jest): Business logic, utility functions, hooks, branches, and edge cases.
- **Cypress mock tests**: Component-level behavior that requires browser rendering or PatternFly interaction patterns.
- **Contract tests**: BFF API endpoints and service interfaces (packages with BFF services).
- **Quality**: Tests MUST be deterministic. No flaky tests, no timing dependencies, no reliance on external services without mocks.
- Test names MUST describe the behavior being verified, not the implementation detail.
- All existing tests MUST continue to pass after changes are made. If a test fails, fix the issue before committing.

---

### III. User Experience Consistency

All user-facing features MUST deliver a consistent, predictable experience:

- UI components MUST follow established PatternFly design system patterns. No one-off styling or ad hoc component variants.

---

## Development Standards

### TypeScript / React (Frontend & Packages)

- **Formatting**: ESLint and Prettier rules MUST pass. No warnings or errors at commit time.
- **Type Safety**: Prefer strict types over `any`. Define interfaces for all API responses.
- **Components**: Follow PatternFly v6 patterns. Compose from existing components before creating new ones.
- **State**: Use React context and hooks. Avoid prop drilling beyond two levels.

### Go (BFF Services)

- **Formatting**: `gofmt` and configured linters MUST pass.
- **Error Handling**: No panic in handlers. Use explicit error returns with context.

---

## Amendment History

### Version 1.0.0 (2026-03-11)

- Initial ratification with 3 core principles

---

**See Also**: [AGENTS.md](AGENTS.md) for agent-specific guidance and rules.

**Version**: 1.0.0 | **Ratified**: 2026-03-11 | **Last Amended**: 2026-03-11
