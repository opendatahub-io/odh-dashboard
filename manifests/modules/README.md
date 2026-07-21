# BFF module manifests (ODH)

Filled-in [templates](../templates/) for each federated BFF module. Each module directory is a **complete, independently deployable** kustomize package:

```bash
# One module only
kustomize build manifests/modular-architecture/modules/gen-ai

# All seven modules
kustomize build manifests/modular-architecture/modules
```

The shared [`kustomization.yaml`](../kustomization.yaml) does not include these per-module resources, so `kustomize build manifests/odh` applies only sidecar BFF patches.

| Module | Port | Service name | ServiceAccount / RBAC | Directory |
|--------|------|--------------|----------------------|-----------|
| model-registry | 8043 | `odh-dashboard-model-registry-ui` | `odh-dashboard-model-registry` | [model-registry/](model-registry/) |
| gen-ai | 8143 | `odh-dashboard-gen-ai-ui` | `odh-dashboard-gen-ai` | [gen-ai/](gen-ai/) |
| maas | 8243 | `odh-dashboard-maas-ui` | `odh-dashboard-maas` | [maas/](maas/) |
| mlflow | 8343 | `odh-dashboard-mlflow-ui` | `odh-dashboard-mlflow` | [mlflow/](mlflow/) |
| eval-hub | 8543 | `odh-dashboard-eval-hub-ui` | `odh-dashboard-eval-hub` | [eval-hub/](eval-hub/) |
| automl | 8643 | `odh-dashboard-automl-ui` | `odh-dashboard-automl` | [automl/](automl/) |
| autorag | 8743 | `odh-dashboard-autorag-ui` | `odh-dashboard-autorag` | [autorag/](autorag/) |

**Naming:** Deployment, NetworkPolicy, and pod/template labels use the short slug (e.g. `model-registry`). Only the Service `metadata.name` uses `odh-dashboard-<slug>-ui`. Service selectors remain `deployment: <slug>`. ServiceAccount, ClusterRole, and ClusterRoleBinding use `odh-dashboard-<slug>`.

**Per-module layout:** Each directory contains `service-account.yaml`, `cluster-role.yaml`, `cluster-role-binding.yaml`, `deployment.yaml`, `service.yaml`, `networkpolicy.yaml`, `params.env`, `params.yaml`, and `kustomization.yaml`. No file under `modules/` references the parent overlay RBAC or a shared `modules/rbac/` directory.

**Source:** Container `args`, `env`, ports, and images match the JSON6902 sidecar entries in [`deployment.yaml`](../deployment.yaml) and image vars in [`params.env`](../params.env). Modules whose BFF supports `-deployment-mode` use `--deployment-mode=federated` (model-registry, mlflow, eval-hub, maas, automl, autorag). gen-ai has no BFF deployment-mode flag; federated UI is baked into the container image. gen-ai uses `BFF_MAAS_SERVICE_NAME: "odh-dashboard-maas-ui"` for inter-BFF calls to the standalone MaaS Service (sidecar still uses `"odh-dashboard"` until split).

**TLS:** Each module uses a dedicated serving-cert Secret (`<slug>-proxy-tls`) on both the Service annotation and Deployment `proxy-tls` volume.

**NetworkPolicy:** Ingress is limited to the OpenShift ingress controller unless a module accepts in-cluster callers (MaaS allows `deployment: gen-ai`). automl and autorag use the same ingress-only pattern (no same-namespace pod ingress). Egress includes DNS, K8s API (6443), and external HTTPS (80/443) plus module-specific peers (gen-ai → MaaS on 8243).

**RBAC:** Each module has least-privilege ClusterRole rules scoped to that BFF (see comments in parent [`modules-cluster-role.yaml`](../modules-cluster-role.yaml)): only `gen-ai` and `mlflow` include `mlflow.opendatahub.io/mlflows`; only `gen-ai` and `maas` include `config.openshift.io/ingresses`; all modules include `subjectaccessreviews` create. ServiceAccounts set `automountServiceAccountToken: false` (Deployments also disable pod-level automount and use a projected token volume). ClusterRoleBinding subjects receive a `namespace` when the module `kustomization.yaml` sets `namespace:` at build/apply time (operator or dev overlay).

**params.env:** Each module's [`params.env`](model-registry/params.env) holds only that module's image key(s). Values must stay in sync with [`../params.env`](../params.env); the release workflow updates them on version bump. For automl/autorag, `*-pipeline-runtime-image` keys populate the `RELATED_IMAGE_*` env var (not the container `image:` field); empty defaults are filled by the operator at install time, matching the parent sidecar overlay.

**Future:** `modules/` will move to `manifests/modules/` at the repo root and replace the parent `modular-architecture/` overlay entirely. Until then, the parent overlay's shared `odh-dashboard-modules` SA/RBAC remains for the sidecar deployment path.

**Avoid duplicates:** Apply this overlay only when testing split deployments. The parent overlay still patches BFF containers onto the shared `odh-dashboard` Deployment; applying both overlays runs two copies of each BFF.
