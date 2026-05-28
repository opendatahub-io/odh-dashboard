# Base Distribution

Minimal app shell framework - renders a PatternFly page chrome (masthead, sidebar, error boundary) with no features loaded — distribution layers add functionality on top.

## Running locally

`distributions/base` depends on private workspace packages
(`@odh-dashboard/eslint-config`, `@odh-dashboard/tsconfig`), so it cannot
install cleanly as a standalone `npm install`.

The easiest workaround is to temporarily add `distributions/*` back to the
root `workspaces` list in the repo-root `package.json`:

```jsonc
// package.json (repo root)
"workspaces": [
  "backend",
  "packages/*",
  "frontend",
  "frontend/src",
  "distributions/*"   // ← add this line
]
```

Then from the repo root:

```bash
npm install
npm run dev --prefix distributions/base
```

This starts:

| Service | URL | Description |
|---------|-----|-------------|
| BFF stub | `http://localhost:4000` | Minimal `/api/status` endpoint |
| App shell | `http://localhost:4010` | Webpack dev server with HMR |

### Environment variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `BFF_PORT` | `4000` | Port for the stub BFF server |
| `SHELL_PORT` | `4010` | Port for the webpack dev server |
