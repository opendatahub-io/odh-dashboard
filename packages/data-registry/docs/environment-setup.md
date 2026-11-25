# Run the Dashboard Locally Against a Cluster

This guide runs the ODH Dashboard, Data Registry frontend, and Go BFF on your
machine against an existing Data Registry API on OpenShift. It does not deploy
the cluster service. For a complete RHOAI 3.6 deployment, including the backend
and dashboard enablement, follow the [customer configuration walkthrough](https://github.com/red-hat-data-services/red-hat-ai-examples/blob/main/examples/data-registry/01-configure-data-registry/README.md).

## 1. Check the Cluster

Log in with `oc` and confirm the registry instance is ready. Set the namespace
to the one used by your installation (`rhoai-data-registry` in the RHOAI 3.6
walkthrough):

```bash
oc whoami
oc config current-context
REGISTRY_NAMESPACE=rhoai-data-registry
oc get featurestore/data-registry -n "$REGISTRY_NAMESPACE"
```

The dashboard module must also be enabled on that cluster. The walkthrough
above covers both settings and the required PostgreSQL database.

## 2. Forward the Registry API

For local dashboard development, forward local port `8443` to the Data Registry
service's HTTPS port `443`:

```bash
oc port-forward -n "$REGISTRY_NAMESPACE" \
  service/feast-data-registry-data-registry 8443:443
```

Keep this port-forward running while using the local dashboard.

Verify the API before starting the dashboard:

```bash
oc whoami -t |
  sed 's/^/header = "Authorization: Bearer /; s/$/"/' |
  curl --config - --fail --insecure \
    https://127.0.0.1:8443/v1/config
```

This uses the in-cluster `kube-rbac-proxy`, so requests require the developer's
OpenShift token. `--insecure` is limited to the local port-forward because the
development certificate is not normally trusted by the host.

The BFF reverse proxy supports CA bundles configured through `--bundle-paths`.
The local command below explicitly sets `--insecure-skip-verify=true` because
the port-forward URL uses `127.0.0.1`, which does not match the service
certificate's hostname. Operator-managed deployments use the service hostname
and configured service CA with certificate verification enabled.

## 3. Start the Local Services

Install dependencies from the dashboard repository root:

```bash
pnpm install
```

Create `backend/.env` for the local dashboard backend. `OC_PROJECT` is the
dashboard namespace (usually `redhat-ods-applications`), not the registry
service namespace:

```dotenv
APP_ENV=development
OC_PROJECT=redhat-ods-applications
```

Start the dashboard in one terminal:

```bash
pnpm run dev
```

Start the Data Registry BFF in a second terminal. The explicit API URL points
the BFF at the TLS port-forward from step 2:

```bash
cd packages/data-registry/bff
go run ./cmd \
  --port=8080 \
  --auth-method=user_token \
  --auth-token-header=x-forwarded-access-token \
  --auth-token-prefix="" \
  --static-assets-dir=./static \
  --mock-k8s-client=false \
  --mock-http-client=false \
  --dev-mode=true \
  --dev-mode-client-port=9103 \
  --deployment-mode=federated \
  --insecure-skip-verify=true \
  --data-registry-api-url=https://127.0.0.1:8443
```

Start the federated frontend in a third terminal:

```bash
cd packages/data-registry/frontend
DEPLOYMENT_MODE=federated PORT=9103 PROXY_PORT=8080 \
  AUTH_METHOD=user_token pnpm run start:dev
```

The request path is:

```text
Dashboard :4010
  -> Data Registry federated frontend :9103
  -> Data Registry BFF :8080
  -> local TLS port-forward :8443
  -> Data Registry service and kube-rbac-proxy in OpenShift
```

## 4. Verify the Integration

Check each local service:

```bash
curl --fail http://localhost:4010/api/config
curl --fail http://localhost:8080/healthcheck
curl --fail http://localhost:9103/
```

Open the dashboard with the feature flag enabled:

```text
http://localhost:4010/?devFeatureFlags=dataRegistry=true
```

Navigate to **AI Hub → Data (Tech Preview)**, select the project, and confirm
that collections and assets load.

## Troubleshooting

- **BFF returns `503`:** confirm the TLS port-forward is running and that
  `--data-registry-api-url` points to `https://127.0.0.1:8443`.
- **BFF returns `401` or `403`:** check the active `oc` identity, project
  permissions, and the dashboard-to-BFF token header.
- **The Data Registry page is missing:** confirm the `dataRegistry` feature flag
  and that the federated frontend is listening on port `9103`.

For the smaller mock-only workflow, see [Dev Setup](dev-setup.md).
