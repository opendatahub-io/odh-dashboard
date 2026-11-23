# Local Development Guide (Federated Mode)

This guide covers running the MaaS BFF locally connected to a real OpenShift cluster with MaaS installed. For development without a cluster, see the [mock mode section](#development-without-a-cluster) below.

## Prerequisites

- OpenShift cluster with MaaS installed (Gateway, MaaS API, MaaS Controller)
- `oc` CLI logged in to the cluster
- Go >= 1.26
- pnpm 11.22.0 (installed via `pnpm install` from the repo root)

## Setup

### 1. Log in to your cluster

```shell
oc login https://api.my-cluster.example.com:6443
```

### 2. Verify MaaS is installed

Check that the MaaS gateway is present:

```shell
oc get gateway -A
```

You should see a `maas-default-gateway` entry. If not, MaaS is not yet installed on this cluster.

### 3. Configure `MAAS_API_URL`

The BFF needs to know the external URL of the MaaS API. You have two options:

**Option A: Set it manually** in `packages/maas/.env.local`:

```shell
MAAS_API_URL=https://maas.apps.my-cluster.example.com/maas-api
```

**Option B: Auto-detect from the cluster.** The Makefile will call `oc get ingresses.config.openshift.io cluster` to determine the cluster domain and construct the URL automatically. No `.env.local` entry needed.

### 4. Start the development servers

```shell
make dev-start-federated
```

This starts both the BFF (port 8081) and the frontend (port 9104) in parallel. The BFF connects to the real cluster and MaaS API.

### 5. Access the UI

Open http://localhost:9104 in your browser.

> **Note on TLS:** If your cluster uses self-signed certificates, the BFF's upstream TLS verification may fail. Set `INSECURE_SKIP_VERIFY=true` in `.env.local` for local development only.
>
> ```shell
> echo 'INSECURE_SKIP_VERIFY=true' >> .env.local
> ```
>
> Never enable this in production.

## Development Without a Cluster

### Federated mode with mocks

Starts both servers in federated/PatternFly mode using in-memory stubs — no cluster or MaaS API required:

```shell
make dev-start-mock-federated
```

Access the UI at http://localhost:9104.

### Standalone mode

Starts the BFF on port 4000 and frontend in standalone/MUI mode with all mocks enabled:

```shell
make dev-start
```

Access the UI at http://localhost:4000.

## BFF-Only Development

Start only the BFF process when the frontend is already running or you only need to test API calls:

```shell
# Mock mode, port 4000
make dev-bff

# Real cluster, federated mode, port 8081
make dev-bff-federated

# Mocked, federated mode, port 8081
make dev-bff-federated-mock
```

Sample API calls against a mock BFF:

```shell
curl -i localhost:4000/healthcheck

curl -i -H "kubeflow-userid: user@example.com" localhost:4000/api/v1/models

curl -i -H "kubeflow-userid: user@example.com" localhost:4000/api/v1/all-subscriptions
```
