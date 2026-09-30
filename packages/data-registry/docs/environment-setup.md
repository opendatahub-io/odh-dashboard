# Full Environment Setup

This is a short local integration guide for connecting the ODH Dashboard,
Data Registry frontend, Data Registry BFF, and an OpenShift-hosted Data
Registry API. It assumes that you can use `oc` and that the cluster already
has PostgreSQL and a registry instance available.

> **Technology Preview:** Data Registry is currently exposed in the dashboard
> as a Technology Preview. Use approved RHOAI manifests and review the target
> cluster's operator and storage requirements before changing cluster state.

## 1. Prepare the Cluster Backend

Enable Data Registry in the `DataScienceCluster` used by the RHOAI installation:

```yaml
spec:
  components:
    data:
      dataRegistry:
        managementState: Managed
```

The backend needs a PostgreSQL metadata store and a registry-only
`FeatureStore` instance named `data-registry`. Wait for the instance to be
ready before starting the local UI.

Create a PostgreSQL Secret containing the registry DSN, then create the
registry-only `FeatureStore` CR. The following is the relevant shape for the
RHOAI Data Registry setup; use the supported server image and namespace for
the target RHOAI release:

```yaml
apiVersion: feast.dev/v1
kind: FeatureStore
metadata:
  name: data-registry
  namespace: <registry-namespace>
  annotations:
    dataregistry.opendatahub.io/enabled: "true"
spec:
  feastProject: catalog
  authz:
    kubernetes: {}
  services:
    onlineStore:
      disabled: true
    registry:
      local:
        persistence:
          store:
            type: sql
            secretRef:
              name: data-registry-database
            secretKeyName: dsn
        server:
          envFrom:
            - secretRef:
                name: data-registry-database
          grpc: true
          restAPI: true
```

Apply the CR and wait for the operator-managed workload:

```bash
oc whoami
oc config current-context
oc apply -f feature-store.yaml
oc wait featurestore/data-registry \
  -n <registry-namespace> \
  --for=jsonpath='{.status.phase}'=Ready \
  --timeout=10m
oc get featurestore data-registry -n <registry-namespace>
oc get deployments,pods,services -n <registry-namespace>
```

The PostgreSQL Secret name, Data Registry annotation, and service namespace
can vary between RHOAI releases. Do not commit the Secret or copy temporary
development image coordinates into a shared manifest.

The registry records asset metadata, locations, and optional Data Connection
references. It does not copy the underlying data or expose connection
credentials.

## 2. Forward the Registry API

For the maintained local development setup, forward the registry REST service
to port `6572`:

```bash
REGISTRY_NAMESPACE=<registry-namespace>
oc port-forward -n "$REGISTRY_NAMESPACE" \
  service/feast-data-registry-registry-rest 6572:80
```

Verify the API before starting the dashboard:

```bash
curl --fail http://127.0.0.1:6572/v1/config
```

This direct REST forward is a local development shortcut and bypasses the
in-cluster `kube-rbac-proxy`. Deployed traffic should use the TLS service and
the caller's OpenShift token instead.

## 3. Start the Local Services

Install dependencies from the dashboard repository root:

```bash
pnpm install
```

Create `backend/.env` for the local dashboard backend:

```dotenv
APP_ENV=development
OC_PROJECT=<registry-namespace>
```

Start the dashboard in one terminal:

```bash
pnpm run dev
```

Start the Data Registry BFF in a second terminal. The explicit API URL points
the BFF at the port-forward from step 2:

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
  --data-registry-api-url=http://127.0.0.1:6572
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
  -> local port-forward :6572
  -> Data Registry REST service in OpenShift
```

## 4. Verify the Integration

Check each local service:

```bash
curl --fail http://localhost:4010/api/config
curl --fail http://localhost:8080/healthcheck
curl --fail http://localhost:9103/
curl --fail http://127.0.0.1:6572/v1/config
```

Open the dashboard with the feature flag enabled:

```text
http://localhost:4010/?devFeatureFlags=dataRegistry=true
```

Navigate to **AI Hub → Data (Tech Preview)**, select the project, and confirm
that collections and assets load.

## Troubleshooting

- **BFF returns `503`:** confirm the port-forward is running and that
  `--data-registry-api-url` points to the reachable API.
- **BFF returns `401` or `403`:** check the active `oc` identity, project
  permissions, and the dashboard-to-BFF token header.
- **The Data Registry page is missing:** confirm the `dataRegistry` feature flag
  and that the federated frontend is listening on port `9103`.

For the smaller mock-only workflow, see [Dev Setup](dev-setup.md).
