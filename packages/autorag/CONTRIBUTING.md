# Contributing to AutoRAG

Welcome to the AutoRAG project! We appreciate your interest in contributing to the automated RAG optimization system for ODH.

## Getting Started

> **📌 Important:** Before contributing to AutoRAG, please review the main [ODH Dashboard Contributing Guide](/CONTRIBUTING.md) for general contribution guidelines, code of conduct, and git workflow.

For detailed prerequisites, setup instructions, and configuration options, see the [AutoRAG README](README.md).

---

## Development Workflow

### Quick Start

**Start both frontend and BFF together:**

```bash

cd packages/autorag

# With mocked services (fastest for local development)
make dev-start
```
---

## Testing Your Changes

Before submitting a pull request, ensure all tests pass.

### Frontend Tests

Run from the `frontend/` directory:

```bash
# Lint check
npm run test:lint

# Unit tests
npm run test:unit
```

### BFF Tests

Run from the `bff/` directory:

```bash
# Lint Go code
make lint

# Fix lint issues automatically
make lint-fix

# Run unit tests
make test
```

### Pre-Submission Checklist

Before creating a pull request, verify:

- [ ] All linters pass (`make lint` for BFF, `npm run test:lint` for frontend)
- [ ] Unit tests pass (both BFF and frontend)
- [ ] Code follows existing patterns and conventions
- [ ] No sensitive data or credentials committed
- [ ] `.env.local` changes not committed (only `.env.local.example` updated if needed)

---

## Contribution Standards

### Code Quality Expectations

**Architecture Consistency:**
- Follow established patterns in the codebase
- BFF code should follow Go best practices and project structure
- Frontend code should use React hooks and functional components
- Use PatternFly v6 components for ODH/federated mode
- Use Material UI components for Kubeflow mode

**Security:**
- Never commit hardcoded credentials or sensitive data
- Validate and sanitize user inputs
- Follow authentication patterns established in the BFF
- Ensure proper error handling without exposing sensitive information

**Code Style:**
- Frontend: Follow ESLint and Prettier configurations
- BFF: Follow `golangci-lint` standards
- Write clear, self-documenting code with minimal comments
- Keep functions small and focused on single responsibilities

### Git Commit Guidelines

Use conventional commit format for clear history:

```
<type>: <brief description (max 72 chars)>

<optional detailed explanation>

Related to <JIRA-ISSUE-KEY>
```

**Commit Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation changes
- `refactor` - Code refactoring without behavior changes
- `test` - Adding or updating tests
- `chore` - Maintenance tasks, dependency updates

**Example:**
```
feat: Add experiment status polling to dashboard

Implement automatic polling every 30s to fetch experiment
status from Kubeflow Pipelines. Improves UX by showing
real-time progress without manual refresh.

Related to RHOAIENG-5678
```

### Pull Request Requirements

**Every PR must:**
1. Link to a Jira issue in the description
2. Include a clear description of changes and rationale
3. Pass all CI checks (lint, tests, build)
4. Be reviewed by at least one maintainer
5. Update relevant documentation if behavior or APIs changed

**PR Checklist:**
- [ ] Linked to Jira issue
- [ ] All tests passing
- [ ] OpenAPI spec updated (if API endpoints changed)
- [ ] README updated (if configuration changed)
- [ ] No breaking changes (or clearly documented if unavoidable)
- [ ] Follows conventional commit message format

---

## Documentation Guidelines

### When to Update Documentation

**Update the [README](README.md) when:**
- Adding new environment variables
- Changing configuration options
- Adding new `make` targets or npm scripts
- Modifying deployment modes or startup procedures
- Updating prerequisites or system requirements

**Update the [OpenAPI Specification](api/openapi/autorag.yaml) when:**
- Adding new API endpoints to the BFF
- Modifying request or response schemas
- Changing authentication requirements
- Updating endpoint paths or HTTP methods

### Documentation Best Practices

- Keep README up-to-date as the single source of truth for getting started
- Use clear, concise language
- Include code examples where helpful
- Update table of contents when adding new sections
- Test all command examples to ensure they work
- Link related documentation for easier navigation

---

## Support and Resources

### Helpful Documentation

**AutoRAG Specific:**
- [AutoRAG README](README.md) - Getting started and quick reference

**AutoRAG Architecture:**
- [AutoRAG Architecture](https://github.com/LukaszCmielowski/architecture-decision-records/blob/autox_arch_docs/documentation/components/autorag/README.md) - Overall design
- [AutoRAG Engine ADRs](https://github.com/LukaszCmielowski/architecture-decision-records/tree/autorag_adr_docs/architecture-decision-records/autorag) - Core optimization engine decisions

**ODH Dashboard:**
- [ODH Contributing Guide](/CONTRIBUTING.md) - General contribution guidelines
- [ODH Best Practices](/docs/best-practices.md) - Coding standards
- [Definition of Ready](/docs/definition-of-ready.md) - Before starting work
- [Definition of Done](/docs/definition-of-done.md) - Before marking complete

### Reporting Issues

When creating an issue:
1. Search existing issues first to avoid duplicates
2. Provide a clear, descriptive title
3. Include steps to reproduce (for bugs)
4. Specify your environment (OS, Node version, Go version)
5. Include relevant logs or error messages
6. Tag with appropriate labels (bug, enhancement, documentation, etc.)

---

## License

AutoRAG is licensed under the Apache License 2.0. See [LICENSE](/LICENSE) for full details.

