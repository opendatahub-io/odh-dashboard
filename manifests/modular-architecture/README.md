# Modular architecture manifests

Manifests for federated dashboard BFF modules and **module manifest templates** for the Dashboard Module Controller.

## Module templates and generated manifests

| Path | Description |
|------|-------------|
| [templates/](templates/) | Deployment, Service, and NetworkPolicy templates with placeholders |
| [templates/README.md](templates/README.md) | Template reference and guide for controller authors |
| [modules/](modules/) | Substituted manifests for all seven BFF modules (dev kustomize overlay) |
| [overlays/standalone-modules/](overlays/standalone-modules/) | Pointer to the `modules/` kustomize overlay |
| [examples/model-registry/](examples/model-registry/) | Pointer to `modules/model-registry/` (historical example path) |

## Naming (seven BFF modules)

| Module slug | Service `metadata.name` (ODH) | BFF port |
|-------------|-------------------------------|----------|
| `model-registry` | `odh-dashboard-model-registry-ui` | 8043 |
| `gen-ai` | `odh-dashboard-gen-ai-ui` | 8143 |
| `maas` | `odh-dashboard-maas-ui` | 8243 |
| `mlflow` | `odh-dashboard-mlflow-ui` | 8343 |
| `eval-hub` | `odh-dashboard-eval-hub-ui` | 8543 |
| `automl` | `odh-dashboard-automl-ui` | 8643 |
| `autorag` | `odh-dashboard-autorag-ui` | 8743 |

Deployment and NetworkPolicy resources use the **slug** as `metadata.name`. Service selectors use `deployment: <slug>`. Only `Service.metadata.name` uses the `odh-dashboard-<slug>-ui` prefix (RHOAI may use `rhods-dashboard-<slug>-ui`).

## Other files

| File | Role |
|------|------|
| `deployment.yaml` | JSON6902 patches: federation env, SA isolation, BFF sidecar containers |
| `service.yaml` | Extra Service ports for BFF modules on the shared `odh-dashboard` Service |
| `networkpolicy.yaml` | Ingress/egress for core and BFF ports on the dashboard pod |
| `federation-configmap.yaml` | Module Federation configuration |
| `params.env` | Module container images |
| `modules-*.yaml` | Shared ServiceAccount, token secret, ClusterRole(Binding) |

## Local testing

**Normal install (sidecar BFFs):** `manifests/odh` includes this directory. Build and apply the dashboard with BFF sidecar patches:

```bash
kustomize build manifests/odh | oc apply -f -
```

**Standalone module Deployments (split architecture):** Use the dev-only overlay so module resources are not applied alongside sidecars:

```bash
kustomize build manifests/modular-architecture/modules | oc apply -f -
```

Do **not** apply both overlays together unless you intentionally want duplicate BFF workloads during transition (sidecar + standalone Deployment for each module).

**mlflow:** The shared `odh-dashboard` Service patch may still expose an embedded `mlflow` port (8443) alongside `odh-dashboard-mlflow-ui` from the module Service. Those are different objects; federation and routing should target the module Service when using standalone modules.

Templates under `templates/` are not applied directly; they are embedded/rendered by the controller at install time.
