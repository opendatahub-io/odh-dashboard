# BFF module manifests (ODH)

Filled-in [templates](../templates/) for each federated BFF module. These resources are listed in [`kustomization.yaml`](../kustomization.yaml) so `kustomize build manifests/odh` applies standalone module Deployments, Services, and NetworkPolicies for local development (without the Dashboard Module Controller).

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

**Source:** Container `args`, `env`, ports, and images match the JSON6902 sidecar entries in [`deployment.yaml`](../deployment.yaml) and image vars in [`params.env`](../params.env). gen-ai uses `BFF_MAAS_SERVICE_NAME: "maas"` for inter-BFF calls to the standalone MaaS Service (sidecar still uses `"odh-dashboard"` until split).

**Duplicate workloads:** The parent overlay still patches BFF containers onto the shared `odh-dashboard` Deployment. Until those sidecars are removed, applying this overlay can run **two** copies of each BFF (sidecar + module Deployment).
