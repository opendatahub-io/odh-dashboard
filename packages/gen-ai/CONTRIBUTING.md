# Contributing to Gen AI

Thank you for your interest in contributing to the Gen AI package!

> **📖 Start Here:** For general ODH Dashboard contribution guidelines, code of conduct, and git workflow, please review the main [ODH CONTRIBUTING.md](/CONTRIBUTING.md).

## Setup and Development

For development setup, prerequisites, and environment configuration, see the [Gen AI README](README.md).

**Quick Start:**
```bash
cd packages/gen-ai
make dev-start-mock    # Full development with mocks (fastest)
make dev-start         # Full development with real services
```

See [README](README.md) for all available commands and configuration options.

## Before Submitting a Pull Request

Run these checks from the `packages/gen-ai` directory:

```bash
# BFF
cd bff && make lint && make test

# Frontend
cd frontend && npm run test:lint && npm run test:unit

# Contract tests (from gen-ai root)
npm run test:contract
```

**PR Checklist:**
- [ ] All tests passing (lint, unit, contract)
- [ ] ADR created/updated (if architectural decision made)
- [ ] OpenAPI spec updated (if API endpoint added/modified)
- [ ] README updated (if configuration or setup changed)
- [ ] Commit message follows convention (see below)
- [ ] PR description links to Jira issue

## Documentation Requirements

### When to Update Documentation

**Create or update an ADR when:**
- Making architectural decisions with long-term impact
- Choosing between multiple viable alternatives
- Setting standards or patterns for the codebase
- See [ADR Guidelines](docs/adr/README.md) and [template](docs/adr/template.md)

**Update OpenAPI spec when:**
- Adding new API endpoints
- Changing request/response formats
- Modifying authentication requirements
- Location: `bff/openapi/src/gen-ai.yaml`

**Update README when:**
- Adding new environment variables
- Changing configuration options
- Adding new make targets or npm scripts

## Code Review Expectations

Gen-AI reviewers check for:

- **Architecture Alignment**: Code follows established patterns
  - Factory pattern for clients (see [ADR-0006](docs/adr/0006-factory-pattern-client-management.md))
  - Repository pattern for domain logic (see [ADR-0007](docs/adr/0007-domain-repository-pattern.md))
  - Authentication via RequestIdentity (see [ADR-0005](docs/adr/0005-authentication-authorization-architecture.md))
- **Security**: No hardcoded credentials, proper data redaction in logs
- **Testing**: Unit tests for new code, contract tests pass
- **Logging**: Proper log levels, no sensitive data (see [ADR-0004](docs/adr/0004-logging-strategy-and-observability.md))
- **Documentation**: ADRs and OpenAPI updated as needed

## Commit Message Convention

```
<type>: <short summary (max 72 chars)>

<optional detailed description>

Related to <JIRA-ISSUE-KEY>
```

**Types:** `feat`, `fix`, `docs`, `refactor`, `test`, `chore`

**Example:**
```
feat: Add MaaS model token caching

Implement in-memory cache for MaaS access tokens with 30min TTL.
Reduces API calls by 90% and improves response latency by 40%.

Related to RHOAIENG-1234
```

## Useful Resources

**For Development:**
- [Gen AI README](README.md) - Setup, commands, environment variables
- [BFF README](bff/README.md) - BFF testing and development guide
- [Frontend README](frontend/README.md) - Frontend development setup
- [BFF Overview](docs/developer/BFF_OVERVIEW.md) - Detailed BFF architecture

**For Architecture:**
- [Architecture Decision Records](docs/adr/) - Why we made key decisions
- [ADR Index](docs/adr/README.md) - Complete list of all ADRs
- [System Architecture](docs/adr/0002-system-architecture.md) - Overall system design

**For Standards:**
- [ODH Best Practices](/docs/best-practices.md) - Coding standards
- [ODH PR Review Guidelines](/docs/pr-review-guidelines.md) - Review process
- [Definition of Ready](/docs/definition-of-ready.md) - Before starting work
- [Definition of Done](/docs/definition-of-done.md) - Before marking complete

## Getting Help

- **Documentation:** Check [ADRs](docs/adr/) and [developer docs](docs/developer/) first
- **Team:** Slack #team-dashboard-crimson (Red Hat internal)
- **Issues:** Create a GitHub discussion or comment on Jira issues

## License

Apache License 2.0 - see [LICENSE](/LICENSE)
