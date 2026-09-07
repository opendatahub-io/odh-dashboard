# Installing mod-arch-starter via `npx`

Use the published `mod-arch-installer` CLI to scaffold a fresh copy of this starter without cloning the entire repository.

```bash
npx mod-arch-installer -n my-new-module
```

This creates a `./my-new-module/` directory with the full starter template.

## CLI options

| Option | Description | Default |
| --- | --- | --- |
| `-n, --name <module-name>` | Module name in kebab-case (e.g., `auto-rag`, `model-registry`) | Prompted if not provided |
| `-f, --flavor <default\|kubeflow>` | Chooses between the PatternFly-only default flavor or Kubeflow (Material UI) | `default` |
| `--install` | Run `npm install` inside `frontend/` (skipped by default to avoid monorepo conflicts) | Disabled |
| `--git` | Initialize a git repository after copying | Disabled |

Examples:

```bash
# PatternFly-only starter (default) - omits mod-arch-kubeflow
npx mod-arch-installer -n my-module

# Kubeflow-flavor starter (includes mod-arch-kubeflow theme provider)
npx mod-arch-installer -n mr-ui --flavor kubeflow

# Install into a specific directory (creates ./packages/my-module/)
npx mod-arch-installer ./packages -n my-module

# With npm install and git initialization
npx mod-arch-installer -n my-module --install --git
```

## What the CLI installs

- Full copy of `mod-arch-starter` including `frontend/`, `bff/`, `api/`, manifests, and docs.
- Flavor-specific overrides:
  - **Default** (default): removes `mod-arch-kubeflow`, drops the `ThemeProvider`, updates navigation chrome to PatternFly, and keeps PatternFly as the active theme.
  - **Kubeflow**: identical to this repository's `main` branch, includes MUI theme provider.
- Optional dependency installation inside `frontend/` (can be skipped).
- Optional git initialization.

## After running the installer

1. `cd <your-project>/frontend` and run `npm run start:dev` (or `npm run start:default` if you generated the default flavor).
2. Run the Go BFF locally: `cd <your-project>/bff && make run` (requires Go 1.24+).
3. Update the OpenAPI spec inside `api/openapi/` to describe your module's contract.
4. Customize namespaces, routes, and branding to match your feature.

Refer to the other docs in this folder for local deployment instructions, Kubeflow-specific workflows, and troubleshooting tips.
