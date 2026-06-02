# Dashboard module manifest templates

The Dashboard Module Controller embeds these manifests at build time and renders one set of resources per registered BFF module (Deployment, Service, NetworkPolicy). Each rendered manifest must be **standalone**: no shared kustomize bases between modules, no `$ref`, and no cross-module dependencies.

Files in this directory are **templates**. They are not valid Kubernetes objects until placeholders are replaced. The controller (or a human author) substitutes values from a **module profile** before apply.

| File | Kind | Purpose |
|------|------|---------|
| [deployment.yaml](deployment.yaml) | Deployment | Module BFF workload |
| [service.yaml](service.yaml) | ClusterIP Service with serving cert |
| [networkpolicy.yaml](networkpolicy.yaml) | NetworkPolicy for module port ingress and standard egress |

Optional `serviceaccount.yaml` is **not** part of the default template. Modules use the shared `odh-dashboard-modules` ServiceAccount unless a module profile requests a dedicated account.

---

## Placeholders

Replace every `<PLACEHOLDER>` (angle brackets) with concrete values. The controller may use the same names in Go `text/template` or another internal map.

| Placeholder | Description |
|-------------|-------------|
| `<MODULE_NAME>` | Kubernetes resource name for Deployment and Service; also used in labels and `deployment` selector |
| `<MODULE_CONTAINER_NAME>` | Container name (e.g. `model-registry-ui`) |
| `<MODULE_PORT>` | HTTPS port for probes, `containerPort`, Service, and NetworkPolicy ingress (integer, no quotes in port fields) |
| `<MODULE_PORT_NAME>` | Short name for the container port and Service `ports[].name` (e.g. `mr-ui`) |
| `<MODULE_IMAGE>` | Container image reference |
| `<REPLICA_COUNT>` | Deployment `spec.replicas` (typically `2`) |
| `<MODULE_SERVICE_ACCOUNT_NAME>` | Pod `serviceAccountName` (default `odh-dashboard-modules`) |
| `<MODULES_SA_TOKEN_SECRET_NAME>` | Projected SA token secret (default `odh-dashboard-modules-token`) |
| `<TLS_SECRET_NAME>` | TLS secret for `proxy-tls` volume and Service serving-cert annotation (default `dashboard-proxy-tls`) |
| `<PART_OF_LABEL>` | Value for `app.kubernetes.io/part-of` (e.g. `odh-dashboard`) |
| `<CORE_APP_LABEL>` | `app` label value for pod anti-affinity (core dashboard app label) |
| `<MODULE_EXTRA_ARGS>` | Optional: additional container `args` after the standard auth/TLS entries |
| `<MODULE_EXTRA_ENV>` | Optional: `env` list for module-specific variables |

Shared namespace resources (not in the template) are defined alongside other dashboard manifests:

- `modules-service-account.yaml` — ServiceAccount
- `modules-sa-token-secret.yaml` — token for projected volume
- `modules-cluster-role.yaml` / `modules-cluster-role-binding.yaml` — RBAC

---

## Deployment template requirements

The Deployment template encodes the BFF container contract:

- **Identity:** labels `app.kubernetes.io/name`, `app.kubernetes.io/part-of`, `components.platform.opendatahub.io/managed-by`, and pod/template label `deployment: <MODULE_NAME>`.
- **Service account:** `automountServiceAccountToken: false`, shared modules ServiceAccount, projected `modules-sa-token` volume.
- **TLS:** `proxy-tls` volume and mounts under `/etc/tls/private`; OpenShift serving cert is issued via the Service annotation (see Service template).
- **Trust bundles:** `odh-trusted-ca-cert` and `odh-ca-cert` volumes from ConfigMap `odh-trusted-ca-bundle`.
- **Auth args:** `--auth-method=user_token`, `--auth-token-header=x-forwarded-access-token`, `--auth-token-prefix=`.
- **Health checks:** HTTPS GET `/healthcheck` on `<MODULE_PORT>` with the same timing as existing BFF containers.
- **Resources:** requests `cpu: 300m`, `memory: 512Mi`, `ephemeral-storage: 10Mi`; limit `memory: 512Mi`.
- **Security:** `allowPrivilegeEscalation: false`, `capabilities.drop: [ALL]`.
- **Scheduling:** preferred pod anti-affinity vs pods with `app: <CORE_APP_LABEL>` in the same zone.

Add module-specific `args` and `env` only when the module profile requires them (see example below).

---

## Service template requirements

- Annotation `service.beta.openshift.io/serving-cert-secret-name: <TLS_SECRET_NAME>`
- Annotation `service.beta.kubernetes.io/backend-protocol: HTTPS`
- One port: `port` and `targetPort` equal `<MODULE_PORT>`, name `<MODULE_PORT_NAME>`
- Selector `deployment: <MODULE_NAME>`

---

## NetworkPolicy template requirements

- Name `<MODULE_NAME>-allow-ports`
- Selector `deployment: <MODULE_NAME>`
- **Ingress:** TCP `<MODULE_PORT>` from OpenShift ingress (`network.openshift.io/policy-group: ingress`) and from all pods in the namespace (`podSelector: {}`)
- **Egress:** all namespaces (in-cluster DNS and service traffic); API server TCP 6443; external TCP 80 and 443

---

## Per-module directory layout

When the controller (or install tooling) materializes a module, use one directory per module:

```text
<module-name>/
├── deployment.yaml
├── service.yaml
├── networkpolicy.yaml
├── serviceaccount.yaml   # only if not using the shared modules SA
└── kustomization.yaml    # optional; local render/validation only — not for production overlay inheritance
```

---

## Example: model-registry

[examples/model-registry/](../examples/model-registry/) shows a fully substituted template set taken from the `model-registry-ui` container in [`deployment.yaml`](../deployment.yaml) and the 8043 Service port entry in [`service.yaml`](../service.yaml).

| Placeholder | model-registry value |
|-------------|----------------------|
| `<MODULE_NAME>` | `model-registry` |
| `<MODULE_CONTAINER_NAME>` | `model-registry-ui` |
| `<MODULE_PORT>` | `8043` |
| `<MODULE_PORT_NAME>` | `mr-ui` |
| `<MODULE_IMAGE>` | `$(model-registry-ui-image)` |
| `<MODULE_EXTRA_ARGS>` | `--deployment-mode=federated` |
| `<MODULE_EXTRA_ENV>` | `GATEWAY_DOMAIN` (empty string, replaced at install time) |

Compare [examples/model-registry/deployment.yaml](../examples/model-registry/deployment.yaml) field-by-field with the template after substitution.

---

## Adding a new module to the controller

1. **Profile** — Define placeholder values: name, container name, port, port name, image, optional extra `args`/`env`, and distro-specific labels (`<PART_OF_LABEL>`, `<CORE_APP_LABEL>`).
2. **Source container spec** — Use the module’s existing BFF container in [`deployment.yaml`](../deployment.yaml) (or the package’s runtime contract) as the source for any deviations from the template defaults.
3. **Render** — Copy the three template files, replace all placeholders, append `MODULE_EXTRA_ARGS` / `MODULE_EXTRA_ENV` when needed.
4. **Validate** — Ensure the result is self-contained YAML; optional `kustomization.yaml` in the module directory for `kustomize build` checks only.
5. **Register** — Wire the module into controller reconciliation so Deployment, Service, and NetworkPolicy are created/updated/deleted with the module lifecycle.
6. **Shared resources** — Do not duplicate modules ServiceAccount/RBAC; reference the shared manifests at the parent directory unless security review requires a dedicated SA.

---

## Local validation (optional)

Example manifests are not wired into `manifests/odh` or `manifests/rhoai`. To inspect the model-registry example:

```bash
kubectl apply --dry-run=client -f manifests/modular-architecture/examples/model-registry/
```

For kustomize image substitution on the example, build from a small overlay that sets `model-registry-ui-image` via `params.env` at the parent level.
