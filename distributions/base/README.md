# Base Distribution

Minimal app shell framework - renders a PatternFly page chrome (masthead, sidebar, error boundary) with no features loaded — distribution layers add functionality on top.

## Running locally

From the repo root:

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
