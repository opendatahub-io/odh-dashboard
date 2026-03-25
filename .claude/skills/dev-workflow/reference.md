# Dev Workflow Reference — ODH Dashboard

## Quick start

```bash
npm install          # Install all workspace dependencies
npm run dev          # Start backend + frontend in parallel
```

Backend runs on port `4000`, frontend dev server on port `4010`.

## Key scripts

| Command | What it does |
|---|---|
| `npm run dev` | `run-p dev:backend dev:frontend` — parallel backend + frontend |
| `npm run start:dev` | `turbo run start:dev` — all packages via Turbo |
| `npm run start:dev:ext` | Dev server proxying to a real cluster (`EXT_CLUSTER=true`) |
| `npm run build` | Build backend + frontend for production |
| `npm run lint` | `turbo run lint` across all packages |
| `npm run type-check` | `turbo run type-check` across all packages |
| `npm run test-unit` | `turbo run test-unit` across all packages |
| `npm run test-unit-coverage` | Unit tests with coverage + aggregation |
| `npm run test:contract` | Contract tests (Go BFFs, `--concurrency=1`) |

## Turbo

Config in `turbo.jsonc`. Key tasks: `build`, `lint`, `test-unit`, `type-check`, `test:contract`, `start:dev`, `install:module`.

`postinstall` runs `turbo run install:module --ui=stream` for packages needing extra setup.

## Environment

### Env files (loaded in priority order)

Both `backend/src/utils/dotenv.ts` and `frontend/config/dotenv.js` use `dotenv.config()` which does **not** overwrite existing values. First loaded = highest priority:

1. `.env.development.local` — local dev overrides (gitignored, **highest priority**)
2. `.env.development` — dev defaults (`BACKEND_PORT=4000`, `FRONTEND_PORT=4010`, etc.)
3. `.env.local` — local overrides for all modes (gitignored)
4. `.env` — base defaults (`BACKEND_PORT=8080`, cluster/OC settings)

To override a dev default, create `.env.development.local` (not `.env.local`).

See `.env.local.example` for template.

### Key env vars

| Variable | Default | Purpose |
|---|---|---|
| `BACKEND_PORT` | `4000` | Backend listen port |
| `FRONTEND_PORT` | `4010` | Webpack dev server port |
| `ODH_HOST` | `localhost` | Dev server host |
| `EXT_CLUSTER` | - | Set `true` to proxy to a real cluster |
| `MODULE_FEDERATION_CONFIG` | - | Override MF remote discovery |
| `PLUGIN_PACKAGES` | - | Restrict which plugin packages are loaded |

### Cluster connection

For `EXT_CLUSTER=true`, the dev server uses `oc whoami --show-token` and `oc get routes`/`oc get httproutes` to find the dashboard host.

Makefile provides `make login` using `OC_URL`, `OC_USER`, `OC_PASSWORD` (or `OC_TOKEN`).

## Webpack dev server

`frontend/config/webpack.dev.js`:

- Hot module replacement enabled
- Proxies `/api`, `/_mf`, and other paths to the backend
- With `EXT_CLUSTER`: proxies to the cluster dashboard instead

## Module Federation — Local Dev

### How the host discovers remotes

`frontend/config/moduleFederation.js` runs `npm query .workspace --json` and filters packages with a `module-federation` key in `package.json`. Override with `MODULE_FEDERATION_CONFIG` env var (JSON string).

In dev mode, the backend reads the same config and proxies:
- `/_mf/{name}/*` → each package's local webpack dev server (static assets + `remoteEntry.js`)
- API paths (e.g., `/model-registry/api/*`) → each package's BFF

The `local` field in `module-federation` config tells the backend where to proxy:

```json
"local": { "host": "localhost", "port": 9104 }
```

### Port assignments

| Component | Port | Role | Has `start:dev`? |
|---|---|---|---|
| Backend | 4000 | Node.js/Fastify reverse proxy | Yes |
| Host frontend | 4010 | Webpack dev server (host) | Yes |

| Package | Frontend Port | BFF Port (federated) | Has `start:dev`? |
|---|---|---|---|
| model-registry | 9100 | **4000** | Yes |
| gen-ai | 9102 | 8080 (no federated target) | No (use Makefile) |
| eval-hub | 9105 | 4002 | No (use Makefile) |
| maas | 9104 | 8081 | No (use Makefile) |
| notebooks | 9105 | — | Yes |
| autorag | 9107 | 4001 | No (use Makefile) |
| automl | 9108 | 4003 | No (use Makefile) |
| mlflow | 9110 | 4020 | No (use Makefile) |

**Known port conflicts:**

- **model-registry BFF (4000) vs dashboard backend (4000).** Both default to port 4000. To run them together, change the dashboard backend port via `.env.development.local`:

  ```bash
  # .env.development.local
  BACKEND_PORT=4050
  ```

  The frontend's webpack proxy target (`_BACKEND_PORT`) and the backend itself both pick up this override. The model-registry BFF keeps port 4000 (hardcoded in its Makefile). Avoid using 4020 — mlflow's BFF uses that port.

- **eval-hub (9105) vs notebooks (9105).** Both declare `module-federation.local.port: 9105`. Cannot run both simultaneously without changing one.

- **mlflow BFF (4020).** Conflicts with `BACKEND_PORT=4020` if used as a workaround. Use 4050 or another unused port for the dashboard backend instead.

### Running multi-component dev

The local backend is required for federated package development — it reads `module-federation.local` config and proxies `/_mf/{name}/*` to each package's local dev server. Without the local backend, the host cannot load your local package changes.

`npm run start:dev:ext` (`EXT_CLUSTER=true`) proxies **everything** (including `/_mf/*`) to the cluster, so locally running packages are invisible to the host. Use it only for host-level development against a real cluster.

**Core dashboard only:**

```bash
npm run dev          # backend (4000) + host frontend (4010)
```

**Dashboard + turbo-managed packages** (backend, frontend, model-registry, notebooks only):

```bash
# First, resolve the model-registry BFF port conflict (both default to 4000):
# Create .env.development.local with BACKEND_PORT=4050
npm run start:dev    # turbo run start:dev
```

Only packages with `start:dev` in `packages/*/package.json` (workspace root) are started by turbo. Currently that's just model-registry and notebooks — all other packages must be started manually.

**Dashboard + a specific federated package** (separate terminals):

```bash
# Terminal 1 — host (backend must be running for /_mf proxy)
npm run dev

# Terminal 2 — e.g., maas with mocked BFF in federated mode
cd packages/maas && make dev-start-mock-federated

# Terminal 3 — e.g., gen-ai with mocked BFF
cd packages/gen-ai && make dev-start-mock
```

### Makefile targets per package

Each package with a BFF provides Makefile targets that run **both** the Go BFF and the frontend webpack dev server in parallel:

| Target | What it runs |
|---|---|
| `dev-start-federated` | BFF (real K8s) + frontend with `DEPLOYMENT_MODE=federated` — **requires cluster** |
| `dev-start-mock-federated` | BFF (all mocks) + frontend with `DEPLOYMENT_MODE=federated` — **no cluster needed** |
| `dev-start-mock` | BFF (all mocks) + frontend in standalone mode |
| `dev-bff` / `dev-bff-federated` | BFF only |
| `dev-frontend` / `dev-frontend-federated` | Frontend only |

`dev-start-federated` uses `MOCK_K8S_CLIENT=false` and will fail if not connected to a cluster. For local development without a cluster, use `dev-start-mock-federated` instead.

Not all packages have every target — check the package's Makefile. Target names vary slightly (e.g., maas uses `dev-start-mock-federated`, gen-ai uses `dev-start-mock`).

### Feature flags

Federated package extensions are gated behind feature flags (e.g., maas requires `modelAsService` and `maasApiKeys`). In local dev, these flags default to indeterminate/disabled since there's no cluster config. Enable them via the **Feature Flag Launcher** button in the dashboard masthead (top-right toolbar) — click "Edit Flags" and check the required flags.

### Running an updated package as a federated module

1. Start the host: `npm run dev`
2. In a separate terminal, start the package: `cd packages/<pkg> && make dev-start-mock-federated`
3. Enable required feature flags via the Feature Flag Launcher in the dashboard UI
4. **Frontend changes** — webpack HMR rebuilds `remoteEntry.js` and hot-reloads in the host automatically
5. **BFF (Go) changes** — restart the BFF process (kill and re-run, or restart only the BFF via `make dev-bff-federated`)
6. The backend is already proxying to the package's local ports based on the `module-federation.local` config

### Frontend-only dev (no BFF)

If the package has no BFF (e.g., notebooks) or you only need to test extension registration (routes, nav items) and layout without API data:

```bash
cd packages/<pkg>/frontend
DEPLOYMENT_MODE=federated PORT=<port> npm run start:dev
```

The federated module will load and its extensions (nav links, routes) will appear in the host. However, pages that fetch data from the BFF will show empty/error states since BFF API requests will fail with `ECONNREFUSED`. For full page rendering, use a mock target instead (e.g., `make dev-start-mock-federated`).

### Type generation for remotes

To get updated TypeScript types for federated modules (generates into `frontend/@mf-types/`):

```bash
cd frontend && npm run start:dev:mf    # sets MF_UPDATE_TYPES=true
```

Enables typed imports via `@mf/*` path aliases (e.g., `@mf/modelRegistry`).

### Key env vars for federated dev

| Variable | Purpose |
|---|---|
| `DEPLOYMENT_MODE=federated` | Tells a package's frontend to build as a federated remote |
| `MODULE_FEDERATION_CONFIG` | JSON override for MF remote discovery (backend + frontend) |
| `MF_UPDATE_TYPES=true` | Generates TypeScript types for remote modules |
| `MF_DEV` | Enables `MF_REMOTES` injection in webpack (used by Cypress) |
| `MOCK_K8S_CLIENT=true` | BFF flag to mock Kubernetes client |
| `AUTH_METHOD` | BFF auth: `internal`, `user_token`, or `disabled` |

## Linting

### Shared config

`packages/eslint-config/` provides shared ESLint configs: `base`, `node`, `react`, `typescript`, `markdown`, `prettier`.

### Package usage

```js
module.exports = require('@odh-dashboard/eslint-config').recommendedReactTypescript(__dirname);
```

Prettier runs via ESLint (`eslint-config-prettier` + `eslint-plugin-prettier`).

### lint-staged

Pre-commit: `npx eslint --max-warnings 0` on `**/*.{js,ts,jsx,tsx,md}`.

## Shared configs

| Package | Purpose |
|---|---|
| `@odh-dashboard/eslint-config` | Shared ESLint rules |
| `@odh-dashboard/tsconfig` | Shared TypeScript config |
| `@odh-dashboard/jest-config` | Shared Jest config + custom hook matchers |

### TypeScript

```json
{ "extends": "@odh-dashboard/tsconfig/tsconfig.json" }
```

### Jest

```ts
export { default } from '@odh-dashboard/jest-config';
```

## CI/CD

### GitHub Actions (`.github/workflows/`)

| Workflow | Trigger | Steps |
|---|---|---|
| `test.yml` | PR, push to main | type-check → lint → unit tests → contract tests → Cypress mock tests |
| `modular-arch-quality-gates.yml` | PR changing `packages/**` | Checks for unit + E2E tests per module |
| `cypress-e2e-test.yml` | Manual / scheduled | Full E2E suite against cluster |
| `*-bff-build.yml`, `*-bff-tests.yml` | PR changing specific packages | Package-specific BFF builds and tests |

### Quality gates for modules

`modular-arch-quality-gates.yml` detects changed modules (by `module-federation` or `exports["./extensions"]`) and verifies:
- Unit tests exist in `__tests__/`
- E2E tests exist in `packages/cypress/cypress/tests/e2e/<module>/`

## Docker

- Root `Dockerfile` — full app build (frontend + backend)
- `packages/*/Dockerfile.workspace` — per-module builds (BFF + frontend)
- Build from repo root: `docker build --file ./packages/<name>/Dockerfile.workspace -t <name>:latest .`
- Makefile: `make build`, `make push`, `make deploy`, `make port-forward`
