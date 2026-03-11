<!--
Sync Impact Report
==================
Version: 1.0.0 (initial ratification)
Principles:
  - I. Code Quality
  - II. Testing Standards
  - III. User Experience Consistency
Follow-up TODOs: None
-->

# Spec Kit Constitution

## Core Principles

### I. Code Quality

All production code MUST adhere to the following non-negotiable standards:

- Code MUST be clean, readable, and self-documenting. Favor
  clarity over cleverness.
- Functions and methods MUST have a single responsibility.
  Extract only when duplication is real, not hypothetical.
- All code MUST pass configured linting and formatting rules
  before merge. No suppressions without documented justification.
- Dead code, unused imports, and unreachable branches MUST be
  removed, not commented out.
- Naming MUST be consistent and domain-appropriate. Variables,
  functions, and files MUST convey intent without requiring
  additional comments.
- Error handling MUST be explicit at system boundaries (user
  input, external APIs, I/O). Internal code MAY trust framework
  guarantees without redundant checks.

**Rationale**: Consistent code quality reduces cognitive load,
accelerates onboarding, and prevents defect accumulation.

### II. Testing Standards

Testing is mandatory and MUST achieve 100% code coverage on
all new and modified code (the changes you make), not the
entire existing codebase:

- Unit tests MUST cover every new or modified function,
  branch, and edge case introduced by the changes.
- Cypress tests MUST only be added when unit tests are
  inadequate, specifically for end-to-end user flows, browser
  interactions, or integration scenarios that cannot be
  meaningfully validated at the unit level.
- Tests MUST be deterministic. No flaky tests, no timing
  dependencies, no reliance on external services without mocks.
- Test names MUST describe the behavior being verified, not
  the implementation detail.
- After the agent finishes the implementation step, a MANDATORY
  final sweep MUST be performed to verify and achieve 100%
  coverage on all changed code by adding or modifying unit
  tests and Cypress tests.
- After the final coverage sweep, `npm run test-unit` MUST be
  executed at the repository root to confirm all tests pass.

**Rationale**: 100% coverage on changes is the quality gate.
Unit tests run fast and catch regressions early. Cypress tests
fill gaps that unit tests cannot reach. The final sweep ensures
no coverage gaps slip through in the code you touched.

### III. User Experience Consistency

All user-facing features MUST deliver a consistent, predictable
experience:

- UI components MUST follow established design system patterns
  (PatternFly or Material UI, depending on the package).
  No one-off styling or ad hoc component variants.

**Rationale**: Consistency builds user trust and reduces
support burden. Predictable interfaces lower the learning
curve and improve task completion rates.

## Post-Implementation Compliance

This section defines mandatory steps that MUST be executed
after the agent completes the implementation step:

1. **Final Coverage Sweep**: After all implementation tasks
   are complete, perform a systematic review of every new
   and modified file. Add or modify unit tests to achieve
   100% code coverage on the changes made. Only add Cypress
   tests for scenarios where unit tests are inadequate
   (e.g., full browser interaction flows, cross-component
   integration).

2. **Test Execution Gate**: Run `npm run test-unit` at the
   repository root. All tests MUST pass. If any test fails,
   fix the issue and re-run until green.

3. **Coverage Verification**: Confirm that code coverage
   on new and modified code meets the 100% target. If gaps
   remain, add targeted tests before declaring the feature
   complete.

## Development Workflow

- All features MUST follow the spec-kit methodology:
  specification, planning, task breakdown, implementation.
- Constitution compliance MUST be verified at the plan
  stage (Constitution Check) and again after implementation
  (Post-Implementation Compliance).
- Code review MUST verify adherence to all core principles
  before approval.
- Any deviation from these principles MUST be documented
  with justification in the Complexity Tracking table of
  the implementation plan.

## Governance

This constitution is the authoritative source of development
standards for the project. It supersedes conflicting practices
found in other documents or conventions.

- **Amendments**: Any change to this constitution MUST be
  documented with rationale, reviewed, and versioned per
  semantic versioning (MAJOR for principle removals/
  redefinitions, MINOR for additions/expansions, PATCH for
  clarifications).
- **Compliance Reviews**: Every implementation plan MUST
  include a Constitution Check section validating alignment
  with these principles.
- **Enforcement**: Post-implementation compliance steps are
  non-negotiable. Skipping the final coverage sweep or test
  execution gate is a blocking defect.

**See Also**: For additional documentation and rules, refer to
[AGENTS.md](AGENTS.md).

**Version**: 1.0.0 | **Ratified**: 2026-03-11 | **Last Amended**: 2026-03-11
