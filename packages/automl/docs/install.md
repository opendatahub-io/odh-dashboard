# Installing mod-arch-starter via `npx`

Use the published `install-mod-arch-starter` CLI (shipped in the `mod-arch-installer` package) to scaffold a fresh copy of this starter without cloning the entire repository.

```bash
npx mod-arch-installer my-new-module
```

## CLI options

| Flag | Description | Default |
| --- | --- | --- |
| `--flavor <kubeflow\|default>` | Chooses between the Kubeflow (Material UI) or PatternFly-only default flavor. | `kubeflow` |
| `--skip-install` | Skips running `npm install` inside `frontend/`. | `false` |
| `--no-git` | Prevents the CLI from running `git init`, `git add .`, and the initial commit. | `false` (git init runs by default unless flag is provided) |

Examples:

```bash
# Kubeflow-flavor starter (includes mod-arch-kubeflow theme provider)
npx mod-arch-installer mr-ui --flavor kubeflow

# PatternFly-only starter that omits mod-arch-kubeflow entirely
npx mod-arch-installer experiments-ui --flavor default
```

## What the CLI installs

- Full copy of `mod-arch-starter` including `frontend/`, `bff/`, `api/`, manifests, and docs.
- Flavor-specific overrides:
  - **Kubeflow** (default): identical to this repository's `main` branch.
  - **Default**: removes `mod-arch-kubeflow`, drops the `ThemeProvider`, updates navigation chrome to PatternFly, and keeps PatternFly as the active theme.
- Optional dependency installation inside `frontend/` (can be skipped).
- Optional git initialization.

## After running the installer

1. `cd <your-project>/frontend` and run `npm run start:dev` (or `npm run start:default` if you generated the default flavor).
2. Run the Go BFF locally: `cd <your-project>/bff && make run` (requires Go 1.24+).
3. Update the OpenAPI spec inside `api/openapi/` to describe your module's contract.
4. Customize namespaces, routes, and branding to match your feature.

Refer to the other docs in this folder for local deployment instructions, Kubeflow-specific workflows, and troubleshooting tips.
