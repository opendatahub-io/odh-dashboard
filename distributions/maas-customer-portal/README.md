# MaaS Consumer Portal Distribution

Consumer-facing portal for MaaS API key management and AI asset endpoints. Bundles the `maas` and `gen-ai` packages.

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
cd distributions/maas-customer-portal
OC_PROJECT= ODH_APP= ODH_DASHBOARD_HOST= MOCK_USER=user@example.com MAAS_BFF_TARGET=http://localhost:8081 npm run dev
```

`MOCK_USER` sets the identity header the mock BFF expects (`kubeflow-userid`). Use `user@example.com` — that is the mock user’s identity with RBAC bindings in the maas mock client.

### Mode B: Real cluster data

**Terminal 1 — Port-forward both BFFs:**

```bash
oc login ...

# RHOAI
NS=redhat-ods-applications APP=rhods-dashboard
# ODH
# NS=opendatahub APP=odh-dashboard

POD=$(oc get pods -n $NS -l app=$APP -o jsonpath='{.items[0].metadata.name}')
oc port-forward -n $NS pod/$POD 8243:8243 8143:8143
```

**Terminal 2 — Dev server (port 4020):**

```bash
cd distributions/maas-customer-portal
MAAS_BFF_TARGET=https://localhost:8243 GENAI_BFF_TARGET=https://localhost:8143 npm run dev
```

BFF targets use `https://` because on-cluster BFFs serve over TLS.

## Key files

| File | Purpose |
|------|---------|
| `distribution.yaml` | Feature flags, bundled packages, extension paths |
| `src/bootstrap.tsx` | App entry — mounts providers via `createDistribution` |
| `src/extensions.ts` | Distribution nav (`app.suppress` / `app.patch`), redirects, user dropdown |
| `src/PortalContextProvider.tsx` | MaaS BFF context (mod-arch standalone) |
| `config/rspack.dev.js` | Dual-mode proxy (cluster discovery or local BFF targets) |
| `config/contextualTildeResolverPlugin.js` | Resolves `~/` imports per package |
