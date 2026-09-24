# MaaS Consumer Portal Distribution

Consumer-facing portal for MaaS API key management and AI asset endpoints. Bundles the `maas` and `gen-ai` packages.

In production the portal is served at `https://<gateway-domain>/maas-consumer-portal/`. Its router, static assets, and MaaS/GenAI browser API calls use that base path; the Gateway strips the prefix before forwarding to the existing Core-BFF and shared module BFF contracts. The portal can remain available when the core dashboard operand is removed. The shared gateway retains the OAuth callback and sign-out endpoints.

## Running locally

### Mode A: Mock data (no cluster needed)

**Terminal 1 — MAAS mock BFF (port 8081):**

```bash
cd packages/maas
make dev-bff-federated-mock
```

**Terminal 2 — Gen-AI mock BFF (port 8080):**

```bash
cd packages/gen-ai/bff
make run MOCK_K8S_CLIENT=true MOCK_LS_CLIENT=true MOCK_MCP_CLIENT=true MOCK_MLFLOW_CLIENT=true MOCK_BFF_CLIENTS=true
```

Note: do NOT use `make dev-bff-mock` — it sets `AUTH_METHOD=disabled`, which skips identity extraction. The consumer portal's proxy injects auth headers, so the BFF needs the default `AUTH_METHOD=user_token`.

**Terminal 3 — Dev server (port 4020):**

```bash
cd distributions/maas-consumer-portal
OC_PROJECT= ODH_APP= ODH_DASHBOARD_HOST= MOCK_USER=user@example.com MAAS_BFF_TARGET=http://localhost:8081 pnpm run dev
```

`MOCK_USER` sets the identity header the mock BFF expects (`kubeflow-userid`). Use `user@example.com` — that is the mock user’s identity with RBAC bindings in the maas mock client.

For certificate-verified cluster proxying, set `ODH_DASHBOARD_CA_FILE` to the PEM file for the CA that issued the Dashboard certificate. By default, external-cluster mode follows the main frontend dev proxy and does not verify the cluster certificate.

### Mode B: External-cluster development (no port-forwards)

This is the portal equivalent of the main frontend's `start:dev:ext`: serve the portal locally and proxy its API requests through the cluster's Dashboard route. Log in with `oc` first, then run:

```bash
cd distributions/maas-consumer-portal
OC_PROJECT=redhat-ods-applications ODH_APP=rhods-dashboard pnpm run start:dev:ext
```

For ODH, use `OC_PROJECT=opendatahub ODH_APP=odh-dashboard`. `EXT_CLUSTER=true` defaults to those ODH values when `OC_PROJECT` and `ODH_APP` are omitted. Set `ODH_DASHBOARD_HOST` only if automatic Gateway/Route discovery does not find the Dashboard host. This mode follows the main frontend dev proxy's TLS behavior; set `ODH_DASHBOARD_CA_FILE` to enable certificate verification with your cluster CA.

### Mode C: Real cluster data via port-forwards

**Terminals 1–3 — Port-forward the MaaS, GenAI, and Core BFF services:**

Log in once, then choose the dashboard namespace and service name for your distribution. Set these variables in each of the three port-forward terminals:

```bash
# RHOAI
export NS=redhat-ods-applications APP=rhods-dashboard
# ODH
# export NS=opendatahub APP=odh-dashboard
```

Run each command in its own terminal. MaaS and GenAI run as separate services; Core BFF is exposed by the dashboard service.

```bash
# Forward the MaaS BFF running in the cluster
oc port-forward -n "$NS" svc/odh-dashboard-maas-ui 8243:8243
```

```bash
# Forward the GenAI BFF running in the cluster
oc port-forward -n "$NS" svc/odh-dashboard-gen-ai-ui 8143:8143
```

```bash
# Forward the Core BFF running in the cluster
oc port-forward -n "$NS" svc/"$APP" 8943:8943
```

**Terminal 4 — Dev server (port 4020):**

```bash
cd distributions/maas-consumer-portal
MAAS_BFF_TARGET=https://localhost:8243 \
GENAI_BFF_TARGET=https://localhost:8143 \
CORE_BFF_TARGET=https://localhost:8943 \
pnpm run dev
```

All three BFF targets use `https://` because on-cluster BFFs serve over TLS. The Core BFF target is used for the operator subscription status request.

#### Optional: Run the Core BFF locally

Instead of forwarding the cluster's Core BFF service, you can run the Core BFF from this checkout. Log in to the cluster first so your local kubeconfig and the portal's `oc` token are available. In a separate terminal, start the real-cluster federated BFF:

```bash
cd distributions/core-bff
make dev-bff-federated
```

This runs the Core BFF on `http://localhost:8082` with user-token authentication and a real Kubernetes client. In the portal's dev-server command, set `CORE_BFF_TARGET=http://localhost:8082` and skip the `oc port-forward svc/"$APP" 8943:8943` command. The portal dev proxy obtains the token from the active `oc` login and forwards it to the local BFF. The Core BFF handles Kubernetes API proxy requests, including SSARs, and the operator subscription status request. MaaS, GenAI, and Perses use their own targets.

For isolated local testing without a cluster, `cd distributions/core-bff && make dev-bff` starts a mock Core BFF on port `4000` with authentication disabled. Use `CORE_BFF_TARGET=http://localhost:4000` for that mode; it does not return live cluster data.

#### Optional: Connect to the cluster observability dashboards

Observability is optional; the MaaS and GenAI portal works without Perses. To load dashboards and metrics from the connected cluster, first log in with `oc` as a user authorized to view the dashboards and metrics, then forward the cluster's Perses service in an additional terminal:

```bash
oc -n redhat-ods-monitoring port-forward svc/data-science-perses 9005:8080
```

Keep the tunnel running. For the local Core BFF setup above, add `PERSES_TARGET` to the dev-server command. If you are forwarding the cluster Core BFF instead, use `CORE_BFF_TARGET=https://localhost:8943`.

```bash
cd distributions/maas-consumer-portal
MAAS_BFF_TARGET=https://localhost:8243 \
GENAI_BFF_TARGET=https://localhost:8143 \
CORE_BFF_TARGET=http://localhost:8082 \
PERSES_TARGET=http://127.0.0.1:9005 \
pnpm run dev
```

The local Rspack dev proxy sends portal Perses API requests directly to `PERSES_TARGET`; the Core BFF target does not provide Perses. If you run the BFFs locally instead of port-forwarding them, point their respective target variables at the local endpoints. Without `PERSES_TARGET` and a reachable Perses service, MaaS and GenAI remain usable, but the observability dashboard cannot load. This setup uses cluster Perses and its configured Prometheus/Thanos datasources; it does not require a local Perses or Prometheus container. See the [connected-cluster readiness notes](../../observability-cluster-readiness.md) for the current cluster state and known collector issue.

## Key files

| File | Purpose |
|------|---------|
| `distribution.yaml` | Feature flags, bundled packages, extension paths |
| `src/bootstrap.tsx` | App entry — mounts providers via `createDistribution` |
| `src/extensions.ts` | Distribution nav (`app.suppress` / `app.patch`), redirects, user dropdown |
| `src/PortalContextProvider.tsx` | Composes the standalone MaaS BFF and portal authorization providers |
| `src/MaaSAuthzProvider.tsx` | Publishes `ADMIN_USER` from the MaaS authorization check; access failures deny governance visibility |
| `config/rspack.dev.js` | Dual-mode proxy (cluster discovery or local BFF targets) |
| `config/contextualTildeResolverPlugin.js` | Resolves `~/` imports per package |
