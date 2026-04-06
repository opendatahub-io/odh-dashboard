# Contributing to MLflow UI

Thank you for your interest in contributing to the MLflow package!

> **Start Here:** For general ODH Dashboard contribution guidelines, code of conduct, and git workflow, please review the main [ODH CONTRIBUTING.md](/CONTRIBUTING.md).

## Setup and Development

For development setup, prerequisites, and environment configuration, see the [MLflow README](README.md).

**Quick Start:**
```bash
cd packages/mlflow
make dev-start-mock-static   # Static in-memory mocks, no external dependencies (fastest)
make dev-start-mock          # Mocked K8s + local MLflow via uv with sample data
make dev-start-mock-local    # Mocked K8s + external local MLflow (start first with make dev-mlflow-up)
make dev-start               # Full development with a remote MLflow instance
```

**Available Commands:**

| Command | Description |
|---------|-------------|
| `make dev-start-mock-static` | Run frontend + BFF with static in-memory mock data (no uv, no mlflow.db) |
| `make dev-start-mock` | Run frontend + BFF with mocked K8s + local MLflow via uv (falls back to static) |
| `make dev-start-mock-local` | Run frontend + BFF with mocked K8s + external local MLflow (start first with `make dev-mlflow-up`) |
| `make dev-start` | Run frontend + BFF connecting to a remote MLflow instance |
| `make dev-bff-mock-static` | Run only the BFF with static in-memory mock data |
| `make dev-bff-mock` | Run only the BFF with mocked K8s + local MLflow via uv (falls back to static) |
| `make dev-bff-mock-local` | Run only the BFF with mocked K8s + external local MLflow |
| `make dev-bff` | Run only the BFF with remote MLflow (requires `.env.local`) |
| `make dev-frontend` | Run only the frontend |
| `make dev-mlflow-up` | Start a local MLflow tracking server |
| `make dev-install-dependencies` | Install frontend dependencies |

### Static Mock Mode (fastest, no dependencies)

This mode uses hardcoded in-memory data. No uv, no MLflow server, no `mlflow.db` file created. Ideal for frontend-only work or CI.

```bash
make dev-start-mock-static
```

### Local MLflow Mode (recommended for development)

This mode runs the BFF with mocked K8s auth and a real local MLflow server. The BFF automatically starts the local MLflow instance via `uv` and seeds it with sample experiments and runs. No cluster needed.

```bash
make dev-start-mock
```

You can also start the MLflow server independently if you want to use the native MLflow UI:
```bash
make dev-mlflow-up    # http://127.0.0.1:5001
```

> **Identifying your environment:** Each mock mode includes a marker experiment as its first entry so you can tell at a glance which data source is active:
>
> | Mode | Marker experiment | Source |
> |------|-------------------|--------|
> | Fully mocked (in-memory, no MLflow server) | `env-static-mock` | `static_mock_client.go` |
> | Local MLflow (seeded automatically) | `env-local-mlflow` | `mlflow_seed.go` |
> | Remote MLflow | *(no marker)* | Real server data |

Once running, you can access:
- **MLflow BFF frontend**: http://localhost:9000
- **BFF API directly** (auth disabled in mock mode): `curl http://localhost:4000/api/v1/experiments?workspace=default`
- **MLflow UI** (native, if started via `make dev-mlflow-up`): http://127.0.0.1:5001

### Remote MLflow Mode

To connect to a remote MLflow instance, create a `.env.local` file (see `.env.local.example`):

```bash
cp .env.local.example .env.local
# Edit .env.local with your cluster's MLflow URL
```

Or pass it directly:
```bash
MLFLOW_URL=https://my-mlflow-server.example.com make dev-start
```

If the MLflow server uses a self-signed certificate, add `INSECURE_SKIP_VERIFY=true`:
```bash
MLFLOW_URL=https://my-mlflow-server.example.com INSECURE_SKIP_VERIFY=true make dev-start
```

> **Warning**: Do not enable `INSECURE_SKIP_VERIFY` in production. Disabling TLS verification exposes the connection to man-in-the-middle attacks.

Then test with curl:
```bash
TOKEN=$(oc whoami -t)

curl -s \
  -H "Authorization: Bearer $TOKEN" \
  "http://localhost:4000/api/v1/experiments?workspace=opendatahub" | jq
```

### BFF Makefile Targets

From `packages/mlflow/bff`:

| Command | Description |
|---------|-------------|
| `make test` | Run all Go tests |
| `make lint` | Run golangci-lint |
| `make build` | Build the BFF binary |
| `make mlflow-up` | Start local MLflow tracking server |
| `make mlflow-down` | Stop local MLflow tracking server |
| `make mlflow-clean` | Stop server + remove local MLflow data |

## Before Submitting a Pull Request

Run these checks from the `packages/mlflow` directory:

```bash
# BFF
cd bff && make lint && make test

# Frontend
cd frontend && npm run test:lint && npm run test:unit

# Contract tests (from mlflow root)
npm run test:contract
```

**PR Checklist:**
- [ ] All tests passing (lint, unit, contract)
- [ ] OpenAPI spec updated (if API endpoint added/modified) — `api/openapi/mlflow.yaml`
- [ ] README updated (if configuration or setup changed)
- [ ] Commit message follows convention (see below)
- [ ] PR description links to Jira issue

## Documentation Requirements

### When to Update Documentation

**Update OpenAPI spec when:**
- Adding new API endpoints
- Changing request/response formats
- Modifying authentication requirements
- Location: `api/openapi/mlflow.yaml`

**Update README when:**
- Adding new environment variables
- Changing configuration options
- Adding new make targets or npm scripts

## Code Review Expectations

MLflow reviewers check for:

- **Architecture Alignment**: Code follows established BFF patterns
  - Factory pattern for clients
  - Repository pattern for domain logic
  - Authentication via RequestIdentity
  - Middleware chain: `AttachWorkspace` -> `RequireValidIdentity` -> `AttachMLflowClient` -> Handler
- **Security**: No hardcoded credentials, proper data redaction in logs
- **Testing**: Unit tests for new code, contract tests pass
- **Logging**: Proper log levels, no sensitive data

## Commit Message Convention

```text
<type>(<scope>): <short summary (max 72 chars)>

<optional detailed description>

Related to <JIRA-ISSUE-KEY>
```

**Types:** `feat`, `fix`, `docs`, `refactor`, `test`, `chore`
**Scope:** `mlflow`

**Example:**
```text
feat(mlflow): add pagination to ListExperiments endpoint

Add pageToken and maxResults query parameters to the experiments
handler, enabling clients to paginate through large experiment lists.

Related to RHOAIENG-5678
```

## Useful Resources

**For Development:**
- [MLflow README](README.md) - Setup, commands, environment variables
- [BFF README](bff/README.md) - BFF development guide
- [Frontend README](frontend/README.md) - Frontend development setup
- [Frontend Dev Setup](frontend/docs/dev-setup.md) - Detailed frontend setup
- [Frontend Testing](frontend/docs/testing.md) - Testing guidelines

**For Deployment:**
- [Kind Deployment Script](scripts/deploy_kind_cluster.sh) - Automated kind cluster deployment

**For Standards:**
- [ODH Best Practices](/docs/best-practices.md) - Coding standards
- [ODH PR Review Guidelines](/docs/pr-review-guidelines.md) - Review process

## Getting Help

- **Documentation:** Check the [docs](docs/) and [frontend docs](frontend/docs/) directories
- **Issues:** Open a [GitHub issue](https://github.com/opendatahub-io/odh-dashboard/issues/new/choose)

## License

Apache License 2.0 - see [LICENSE](/LICENSE)
