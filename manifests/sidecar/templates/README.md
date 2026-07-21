# Dashboard module manifest templates

The Dashboard Module Controller embeds these manifests at build time and renders one set of resources per registered BFF module (Deployment, Service, NetworkPolicy). Each rendered manifest must be **standalone**: no shared kustomize bases between modules, no `$ref`, and no cross-module dependencies.

Files in this directory are **templates**. They are not valid Kubernetes objects until placeholders are replaced. The controller (or a human author) substitutes values from a **module profile** before apply.

| File | Kind | Purpose |
|------|------|---------|
| [deployment.yaml](deployment.yaml) | Deployment | Module BFF workload |
| [service.yaml](service.yaml) | Service | ClusterIP Service with serving cert |
| [networkpolicy.yaml](networkpolicy.yaml) | NetworkPolicy | Module port ingress and standard egress |

Each module directory includes dedicated RBAC (`service-account.yaml`, `cluster-role.yaml`, `cluster-role-binding.yaml`) using `odh-dashboard-<MODULE_NAME>`. The sidecar deployment path still uses the shared `odh-dashboard-modules` ServiceAccount in the parent overlay until that overlay is removed.

---

## Placeholders

Replace every `<PLACEHOLDER>` (angle brackets) with concrete values. The controller may use the same names in Go `text/template` or another internal map.

| Placeholder | Description |
|-------------|-------------|
| `<MODULE_NAME>` | Kubernetes resource name for Deployment and NetworkPolicy; labels and Service `selector.deployment` |
| `<MODULE_SERVICE_NAME>` | Service `metadata.name` (ODH: `odh-dashboard-<slug>-ui`; RHOAI may use `rhods-dashboard-<slug>-ui`) |
| `<MODULE_CONTAINER_NAME>` | Container name (e.g. `model-registry-ui`) |
| `<MODULE_PORT>` | HTTPS port for probes, `containerPort`, Service, and NetworkPolicy ingress (integer, no quotes in port fields) |
| `<MODULE_PORT_NAME>` | Short name for the container port and Service `ports[].name` (e.g. `mr-ui`) |
| `<MODULE_IMAGE>` | Container image reference |
| `<REPLICA_COUNT>` | Deployment `spec.replicas` (typically `2`) |
| `<MODULE_SERVICE_ACCOUNT_NAME>` | Pod `serviceAccountName` (default `odh-dashboard-<MODULE_NAME>`) |
| `<TLS_SECRET_NAME>` | Per-module TLS secret for `proxy-tls` volume and Service serving-cert annotation (default `<MODULE_NAME>-proxy-tls`, e.g. `model-registry-proxy-tls`) |
| `<PART_OF_LABEL>` | Value for `app.kubernetes.io/part-of` (e.g. `odh-dashboard`) |
| `<MODULE_EXTRA_ARGS>` | Optional: additional container `args` after the standard auth/TLS entries |
| `<MODULE_EXTRA_ENV>` | Optional: `env` list for module-specific variables |
| `<MODULE_EXTRA_INGRESS>` | Optional: additional NetworkPolicy ingress peers for in-cluster callers (e.g. MaaS accepts gen-ai) |
| `<MODULE_EXTRA_EGRESS>` | Optional: additional NetworkPolicy egress rules for in-cluster dependencies and API/external access |

Standalone module Deployments use per-module ServiceAccount and RBAC in each `modules/<slug>/` directory. The parent overlay still defines shared `modules-service-account.yaml`, `modules-cluster-role.yaml`, and `modules-cluster-role-binding.yaml` for the sidecar deployment path.

The sidecar deployment still references `modules-sa-token-secret.yaml` for legacy compatibility; standalone module Deployments use a projected `serviceAccountToken` volume instead.

---

## Deployment template requirements

The Deployment template encodes the BFF container contract:

- **Identity:** labels `app.kubernetes.io/name`, `app.kubernetes.io/part-of`, `components.platform.opendatahub.io/managed-by`, and pod/template label `deployment: <MODULE_NAME>`.
- **Service account:** `automountServiceAccountToken: false`, dedicated `odh-dashboard-<MODULE_NAME>` ServiceAccount, projected `modules-sa-token` volume with bounded `serviceAccountToken` (not a legacy SA-token Secret).
- **TLS:** per-module `proxy-tls` volume (`<MODULE_NAME>-proxy-tls`) and mounts under `/etc/tls/private`; OpenShift serving cert is issued via the Service annotation (see Service template).
- **Trust bundles:** required `odh-trusted-ca-cert` and `odh-ca-cert` volumes from ConfigMap `odh-trusted-ca-bundle` (not optional — `subPath` mounts fail if the ConfigMap is absent).
- **Auth args:** `--auth-method=user_token`, `--auth-token-header=x-forwarded-access-token`, `--auth-token-prefix=`.
- **Health checks:** HTTPS GET `/healthcheck` on `<MODULE_PORT>` with the same timing as existing BFF containers.
- **Resources:** requests and limits for `cpu: 300m`, `memory: 512Mi`, `ephemeral-storage: 10Mi`.
- **Security:** pod `seccompProfile: RuntimeDefault`; container `runAsNonRoot: true`, `readOnlyRootFilesystem: true`, `allowPrivilegeEscalation: false`, `capabilities.drop: [ALL]`. Do not set `runAsUser`; OpenShift assigns a UID from the namespace range.
- **Scheduling:** preferred pod anti-affinity vs other pods with `deployment: <MODULE_NAME>` in the same zone.

Add module-specific `args` and `env` only when the module profile requires them (see example below).

---

## Service template requirements

- `metadata.name`: `<MODULE_SERVICE_NAME>` (not necessarily equal to `<MODULE_NAME>`)
- Annotation `service.beta.openshift.io/serving-cert-secret-name: <TLS_SECRET_NAME>`
- Annotation `service.beta.kubernetes.io/backend-protocol: HTTPS`
- One port: `port` and `targetPort` equal `<MODULE_PORT>`, name `<MODULE_PORT_NAME>`
- Selector `deployment: <MODULE_NAME>`

---

## NetworkPolicy template requirements

- Name `<MODULE_NAME>-allow-ports`
- Selector `deployment: <MODULE_NAME>`
- **Ingress:** TCP `<MODULE_PORT>` from OpenShift ingress (`network.openshift.io/policy-group: ingress`) only. Add `<MODULE_EXTRA_INGRESS>` peers when a module accepts in-cluster callers (e.g. MaaS allows `deployment: gen-ai`).
- **Egress:** DNS to `openshift-dns` (TCP/UDP 5353). Rendered module manifests must add explicit API/external egress (6443, 80, 443) and any `<MODULE_EXTRA_EGRESS>` rules for in-cluster peers (e.g. gen-ai → MaaS on 8243).

---

## Per-module directory layout

When the controller (or install tooling) materializes a module, use one directory per module:

```text
<module-name>/
├── service-account.yaml
├── cluster-role.yaml
├── cluster-role-binding.yaml
├── deployment.yaml
├── service.yaml
├── networkpolicy.yaml
├── params.env
├── params.yaml
└── kustomization.yaml
```

---

## Example: model-registry

[modules/model-registry/](../modules/model-registry/) shows a fully substituted template set taken from the `model-registry-ui` container in [`deployment.yaml`](../deployment.yaml) and the 8043 Service port entry in [`service.yaml`](../service.yaml).

| Placeholder | model-registry value |
|-------------|----------------------|
| `<MODULE_NAME>` | `model-registry` |
| `<MODULE_SERVICE_NAME>` | `odh-dashboard-model-registry-ui` |
| `<MODULE_CONTAINER_NAME>` | `model-registry-ui` |
| `<MODULE_PORT>` | `8043` |
| `<MODULE_PORT_NAME>` | `mr-ui` |
| `<MODULE_IMAGE>` | `$(model-registry-ui-image)` |
| `<TLS_SECRET_NAME>` | `model-registry-proxy-tls` |
| `<MODULE_EXTRA_ARGS>` | `--deployment-mode=federated` |
| `<MODULE_EXTRA_ENV>` | `GATEWAY_DOMAIN` (empty string, replaced at install time) |

Compare [modules/model-registry/deployment.yaml](../modules/model-registry/deployment.yaml) field-by-field with the template after substitution.

---

## Adding a new module to the controller

1. **Profile** — Define placeholder values: name, container name, port, port name, image, optional extra `args`/`env`, and distro-specific labels (`<PART_OF_LABEL>`).
2. **Source container spec** — Use the module’s existing BFF container in [`deployment.yaml`](../deployment.yaml) (or the package’s runtime contract) as the source for any deviations from the template defaults.
3. **Render** — Copy the three template files, replace all placeholders, append `MODULE_EXTRA_ARGS` / `MODULE_EXTRA_ENV` when needed.
4. **Validate** — Ensure the result is self-contained YAML; optional `kustomization.yaml` in the module directory for `kustomize build` checks only.
5. **Register** — Wire the module into controller reconciliation so Deployment, Service, and NetworkPolicy are created/updated/deleted with the module lifecycle.
6. **RBAC** — Add `service-account.yaml` (`automountServiceAccountToken: false`), `cluster-role.yaml`, and `cluster-role-binding.yaml` with least-privilege rules for the module (see parent `modules-cluster-role.yaml` comments for rule scoping). Deployments must also set `automountServiceAccountToken: false` and use a projected `serviceAccountToken` volume.

---

## Local validation (optional)

Each module under `modules/` is independently buildable:

```bash
kustomize build manifests/modular-architecture/modules/model-registry
kustomize build manifests/modular-architecture/modules
```
