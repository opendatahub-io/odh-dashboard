# BFF module manifests (ODH)

Filled-in [templates](../templates/) for each federated BFF module. For local standalone-module testing, use this directory's [`kustomization.yaml`](kustomization.yaml) (`kustomize build manifests/modular-architecture/modules`). The overlay is **self-contained**: it includes shared RBAC (`odh-dashboard-modules` ServiceAccount, ClusterRole, and ClusterRoleBinding) plus all seven module Deployments, Services, and NetworkPolicies. The shared [`kustomization.yaml`](../kustomization.yaml) does not include these per-module resources, so `kustomize build manifests/odh` applies only sidecar BFF patches.

| Module | Port | Service name | Directory |
|--------|------|--------------|-----------|
| model-registry | 8043 | `odh-dashboard-model-registry-ui` | [model-registry/](model-registry/) |
| gen-ai | 8143 | `odh-dashboard-gen-ai-ui` | [gen-ai/](gen-ai/) |
| maas | 8243 | `odh-dashboard-maas-ui` | [maas/](maas/) |
| mlflow | 8343 | `odh-dashboard-mlflow-ui` | [mlflow/](mlflow/) |
| eval-hub | 8543 | `odh-dashboard-eval-hub-ui` | [eval-hub/](eval-hub/) |
| automl | 8643 | `odh-dashboard-automl-ui` | [automl/](automl/) |
| autorag | 8743 | `odh-dashboard-autorag-ui` | [autorag/](autorag/) |

**Naming:** Deployment, NetworkPolicy, and pod/template labels use the short slug (e.g. `model-registry`). Only the Service `metadata.name` uses `odh-dashboard-<slug>-ui`. Service selectors remain `deployment: <slug>`.

**Source:** Container `args`, `env`, ports, and images match the JSON6902 sidecar entries in [`deployment.yaml`](../deployment.yaml) and image vars in [`params.env`](../params.env). Modules whose BFF supports `-deployment-mode` use `--deployment-mode=federated` (model-registry, mlflow, eval-hub, maas, automl, autorag). gen-ai has no BFF deployment-mode flag; federated UI is baked into the container image. gen-ai uses `BFF_MAAS_SERVICE_NAME: "odh-dashboard-maas-ui"` for inter-BFF calls to the standalone MaaS Service (sidecar still uses `"odh-dashboard"` until split).

**TLS:** Each module uses a dedicated serving-cert Secret (`<slug>-proxy-tls`) on both the Service annotation and Deployment `proxy-tls` volume.

**NetworkPolicy:** Ingress is limited to the OpenShift ingress controller unless a module accepts in-cluster callers (MaaS allows `deployment: gen-ai`). Egress includes DNS, K8s API (6443), and external HTTPS (80/443) plus module-specific peers (gen-ai → MaaS on 8243).

**RBAC:** Shared [`rbac/`](rbac/) resources (`odh-dashboard-modules` ServiceAccount, ClusterRole, ClusterRoleBinding) are included in this overlay so `kustomize build manifests/modular-architecture/modules` is self-contained. Canonical definitions live in the parent overlay ([`modules-service-account.yaml`](../modules-service-account.yaml), etc.); update both when RBAC rules change.

**params.env:** [`params.env`](params.env) must stay identical to [`../params.env`](../params.env). Kustomize load restrictions require a local copy in this overlay; the release workflow syncs it when bumping module image tags.

**Avoid duplicates:** Apply this overlay only when testing split deployments. The parent overlay still patches BFF containers onto the shared `odh-dashboard` Deployment; applying both overlays runs two copies of each BFF.
