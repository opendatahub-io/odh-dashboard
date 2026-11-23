# Installing mod-arch-starter via `pnpm dlx`

Use the published `mod-arch-installer` CLI to scaffold a fresh copy of this starter without cloning the entire repository.

```bash
pnpm dlx mod-arch-installer -n my-new-module
```

This creates a `./my-new-module/` directory with the full starter template. Generated projects use pnpm 11.22.0 (pinned via `packageManager`) and Node.js >= 22.18.0.

## CLI options

| Option | Description | Default |
| --- | --- | --- |
| `[base-directory]` | Directory to scaffold into. When omitted, `./<module-name>/` is created | `.` |
| `-n, --name <module-name>` | Module name in kebab-case (e.g., `auto-rag`, `model-registry`) | Prompted if not provided |
| `-f, --flavor <default\|kubeflow>` | Chooses between the PatternFly-only default flavor or Kubeflow (Material UI) | `default` |
| `--port <port>` | Frontend dev / Module Federation local port. Default flavor only | `9103` (template) |
| `--bff-port <port>` | BFF local development port. Default flavor only | `4000` (template) |
| `--service-port <port>` | Production service port (`module-federation.service.port`). Default flavor only | `8043` (template) |
| `--install` | Run `pnpm install` inside `frontend/`. Kubeflow flavor only — rejected for the federated `default` flavor, which installs as part of the odh-dashboard workspace | Disabled |
| `--git` | Initialize a git repository after copying | Disabled |

The template ports are placeholders. Every module scaffolded into odh-dashboard needs unique values, so pass `--port`, `--bff-port`, and `--service-port` with the default flavor (the odh-dashboard `/module-onboarding` Claude skill allocates them for you).

Examples:

```bash
# PatternFly-only starter (default) - omits mod-arch-kubeflow; run from odh-dashboard packages/
pnpm dlx mod-arch-installer -n my-module --port 9150 --bff-port 4050 --service-port 8143

# Kubeflow-flavor starter (includes mod-arch-kubeflow theme provider)
pnpm dlx mod-arch-installer -n mr-ui --flavor kubeflow

# Install into a specific directory (creates ./packages/my-module/)
pnpm dlx mod-arch-installer ./packages/my-module -n my-module

# With pnpm install and git initialization (--install is kubeflow-flavor only)
pnpm dlx mod-arch-installer -n my-module --flavor kubeflow --install --git
```

## What the CLI installs

- Full copy of `mod-arch-starter` including `frontend/`, `bff/`, `api/`, manifests, and docs.
- Flavor-specific overrides:
  - **Default** (default): removes `mod-arch-kubeflow`, drops the `ThemeProvider`, updates navigation chrome to PatternFly, and keeps PatternFly as the active theme.
  - **Kubeflow**: identical to this repository's `main` branch, includes MUI theme provider.
- Optional `pnpm install` inside `frontend/` (`--install`, kubeflow flavor only).
- Default flavor only: the requested `--port`, `--bff-port`, and `--service-port` values written into `package.json`, `Makefile`, and frontend scripts.
- Optional git initialization.

## After running the installer

1. **Kubeflow flavor:** `cd <your-project>/frontend` and run `pnpm run start:dev` (run `pnpm install` first if you did not pass `--install`).
   **Default flavor:** add `packages/<your-project>/frontend` to the odh-dashboard root `pnpm-workspace.yaml`, run `pnpm install` from the odh-dashboard root, register the module's area and feature flag in the host (see [`docs/onboard-modular-architecture.md`](../../docs/onboard-modular-architecture.md)), then run `make dev-start-federated` from the module directory.
2. Run the Go BFF locally: `cd <your-project>/bff && make run` (requires Go 1.24+).
3. Update the OpenAPI spec inside `api/openapi/` to describe your module's contract.
4. Customize namespaces, routes, and branding to match your feature.

Refer to the other docs in this folder for local deployment instructions, Kubeflow-specific workflows, and troubleshooting tips.
