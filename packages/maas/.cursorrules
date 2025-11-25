# Cursor Rules for mod-arch-starter

These rules travel with every project created through `npx mod-arch-installer`. Keep the feature flow aligned with the starter docs in `docs/`.

## Mandatory development flow

1. **Contract first** – Describe every capability in `api/openapi/mod-arch.yaml` (or a new file under `api/openapi/`). All request/response objects must be documented before coding.
2. **BFF stub second** – Add handlers and mock-returning services in `bff/internal/api` and `bff/internal/mocks` that satisfy the new contract. Wire them in `bff/cmd/main.go` and expose feature flags/env vars as needed.
3. **Frontend third** – Build UI routes inside `frontend/src/app` only after the stub endpoints respond with realistic shapes. Consume generated types instead of duplicating schemas.
4. **Production BFF last** – Replace mocks with Kubernetes-aware logic (repositories, clients, RBAC) before shipping. Verify the BFF against a real cluster or the manifests in `manifests/`.

Never skip or reorder these stages. A PR that implements UI before the API contract is rejected.

## Project-wide expectations

- Use Go 1.24+ for the BFF and Node 18+ for the frontend. Keep tooling in sync with `package.json`/`go.mod`.
- Stick to PatternFly components and utilities; Material UI appears only when the Kubeflow flavor explicitly requires it.
- Run `npm run test` inside `frontend/` and `make lint && make test` inside `bff/` before pushing.
- Keep docs updated (`mod-arch-starter/docs/*.md`) whenever you change workflows, env vars, or deployment steps.

## API contract rules (api/)

- One OpenAPI document per module capability. Reference shared schemas to avoid drift.
- Add examples for every schema and response so mock servers can generate useful data.
- After updating the spec, regenerate clients/types for both Go and TypeScript if your workflow requires them.
- Reviewers must see a diff in the OpenAPI file alongside code changes.

## BFF rules (bff/)

- Organize code using the provided structure: `cmd/` for wiring, `internal/api` for handlers, `internal/models` for DTOs, `internal/repositories` for integrations, and `internal/mocks` for stub data.
- Keep stub implementations close to production ones: identical signatures, logged TODOs, and mock data that matches the OpenAPI examples.
- Every new handler must include request validation, structured logging, and unit tests (`internal/api/*_test.go`).
- Use the Makefile targets (`make run`, `make lint`, `make test`, `make docker-build`) instead of custom scripts.
- When the feature is ready for production, connect to Kubernetes through the helpers under `internal/helpers/k8s.go` and gate risky behavior behind flags/env vars defined in `cmd/main.go`.

## Frontend rules (frontend/)

- React + TypeScript + PatternFly only; keep state in React Query hooks or existing context providers from `mod-arch-core`.
- Namespace awareness is mandatory. Use `useNamespaceSelector` / `useNamespaces` hooks instead of inventing new global state.
- All remote calls flow through API clients generated from the OpenAPI spec or thin wrappers in `src/api/`. Do not fetch directly from hard-coded URLs.
- Follow the routing conventions in `src/app/routes.tsx` and the layout primitives (`ApplicationsPage`, `DashboardEmptyTableView`, etc.).
- Lint (`npm run lint`), test (`npm run test`), and ensure module federation metadata stays correct in `config/moduleFederation.js` before shipping.
