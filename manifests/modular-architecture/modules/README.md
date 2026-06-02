# BFF module manifests (ODH)

Filled-in [templates](../templates/) for each federated BFF module. For local standalone-module testing, use this directory's [`kustomization.yaml`](kustomization.yaml) (`kustomize build manifests/modular-architecture/modules`). The shared [`kustomization.yaml`](../kustomization.yaml) does not include these resources, so `kustomize build manifests/odh` applies only sidecar BFF patches.

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

**Source:** Container `args`, `env`, ports, and images match the JSON6902 sidecar entries in [`deployment.yaml`](../deployment.yaml) and image vars in [`params.env`](../params.env). Modules whose BFF supports `-deployment-mode` use `--deployment-mode=federated` (model-registry, mlflow, eval-hub, maas, automl, autorag). gen-ai has no BFF deployment-mode flag; federated UI is baked into the container image. gen-ai uses `BFF_MAAS_SERVICE_NAME: "maas"` for inter-BFF calls to the standalone MaaS Service (sidecar still uses `"odh-dashboard"` until split).

**params.env:** [`params.env`](params.env) mirrors [`../params.env`](../params.env) for kustomize load restrictions when building this overlay; keep both files in sync when changing module images.

**Avoid duplicates:** Apply this overlay only when testing split deployments. The parent overlay still patches BFF containers onto the shared `odh-dashboard` Deployment; applying both overlays runs two copies of each BFF.
