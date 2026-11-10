# Getting Started with MaaS Development

## Prerequisites

| Tool | Version | Required for |
|------|---------|-------------|
| Node.js | >= 22.18.0 | Frontend development |
| pnpm | 11.22.0 (pinned) | Package management |
| Go | >= 1.26 | BFF development |
| OpenShift cluster + `oc` CLI | any | Federated mode only |

## Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/opendatahub-io/odh-dashboard
   cd odh-dashboard
   ```

2. Install all workspace dependencies from the repository root:

   ```bash
   pnpm install
   ```

3. Switch to the MaaS package:

   ```bash
   cd packages/maas
   ```

## Development Workflows

Choose the workflow that matches your setup:

### Option 1: Standalone mode (no cluster required)

Starts the BFF on port 4000 with mocked Kubernetes and MaaS API, and the frontend in standalone/MUI mode.

```bash
make dev-start
```

Access the UI at http://localhost:4000.

### Option 2: Federated mock mode (no cluster required)

Starts the BFF on port 8081 and the frontend on port 9104 in federated/PatternFly mode, both using mocked backends. Use this when you want to develop with the production theme but don't have cluster access.

```bash
make dev-start-mock-federated
```

Access the UI at http://localhost:9104.

### Option 3: Federated mode (cluster required)

Starts the BFF connected to a real OpenShift cluster with MaaS installed. The frontend runs on port 9104 with the PatternFly theme.

```bash
# Option A: set MAAS_API_URL in .env.local
echo 'MAAS_API_URL=https://maas.apps.my-cluster.example.com/maas-api' >> .env.local
make dev-start-federated

# Option B: let the Makefile auto-detect MAAS_API_URL from the logged-in cluster
oc login https://api.my-cluster.example.com:6443
make dev-start-federated
```

Access the UI at http://localhost:9104.

See [local-deployment-guide.md](./local-deployment-guide.md) for full prerequisites and troubleshooting.
