# AutoRAG

## Overview

- Automates RAG configuration optimization for OpenShift AI via Kubeflow Pipelines and the ai4rag engine; evaluates parameter combinations toward deployable RAG Pattern artifacts.
- This document records AutoRAG's GA enablement audit for the RHOAI 3.6 target. Release alignment with Gen AI Studio remains pending confirmation below.

## Design Intent

- **BFF (single ingress)**: Cluster auth chain; proxies optimization to the ai4rag engine and Kubeflow Pipelines; uses the Kubernetes API where needed.
- **Serving by deployment mode**:
  - Standalone and kubeflow: BFF serves compiled frontend assets.
  - Federated: APIs only on the BFF; main dashboard hosts the UI via Module Federation.
- **Data flow**: React → BFF (`/api/v1/...`) → ai4rag engine, Kubeflow Pipelines, and/or Kubernetes → response.
- **Local dev**: `cmd/main.go` can use in-memory mocks for Kubernetes and HTTP (ai4rag) when endpoints are unavailable.
- **Module Federation**: Remote name `autorag`; host loads `./AutoRAGApp`. The module registers its navigation, route, and Task shortcuts entry in the main dashboard.

## GA Enablement and Compatibility

AutoRAG is enabled by several independent dashboard and cluster gates. QE should check each gate when diagnosing a missing navigation entry, route, or BFF.

| Gate                                                               | GA behavior                                                                                                                                                                                                                                                                                                            | Effect                                                                                                                                                                                                  |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OdhDashboardConfig.spec.dashboardConfig.autorag`                  | Defaults to `true`; an explicit `false` is preserved.                                                                                                                                                                                                                                                                  | Enables AutoRAG's area, navigation entry, route, and Task shortcuts entry. When false, the navigation entry, route, and Task shortcuts entry are hidden and AutoRAG's BFF receives no API calls. The host still loads the module's federation assets because module loading is not flag-gated. |
| `OdhDashboardConfig.spec.dashboardConfig.genAiStudio`              | Defaults to `true`.                                                                                                                                                                                                                                                                                                    | Enables the `plugin-gen-ai` area. AutoRAG relies on this area and appears under its Gen AI Studio navigation category.                                                                                  |
| DataScienceCluster `components.aipipelines.managementState`        | Data Science Pipelines must be installed and available (`Managed` or `Unmanaged`).                                                                                                                                                                                                                                     | Required by the AutoRAG UI area and by the operator's `autorag` module registry entry.                                                                                                                  |
| `Dashboard.spec.modules.autorag.state`                             | The module registry auto-enables `autorag` when `aipipelines` is available. An explicit `Disabled` override opts out.                                                                                                                                                                                                  | Controls deployment of the `autorag-ui` BFF sidecar on port 8743.                                                                                                                                       |
| `Dashboard.spec.modules.genAi.state`                               | Must not be `Disabled`; the `autorag` module declares `genAi` as an inter-module dependency.                                                                                                                                                                                                                           | Disabling the Gen AI BFF module also disables the AutoRAG sidecar. This is separate from the UI's `genAiStudio` flag.                                                                                   |
| Data Science PipelineApplication `spec.apiServer.managedPipelines` | Required for managed pipeline operations. AutoRAG's new pipeline-server setup preselects the managed-pipelines option, but the user must submit the setup form. Existing PipelineApplications are not rewritten during dashboard upgrades; users must explicitly enable managed pipelines for those servers if needed. | A functional pipeline-service prerequisite, not a dashboard navigation or module-federation gate.                                                                                                       |

Existing dashboard configurations with `autorag: true` continue to enable AutoRAG. The dashboard fills omitted configuration fields from code defaults, while preserving an explicit `autorag: false`, so opt-out clusters remain opted out. The dashboard upgrade does not rewrite existing pipeline-server configuration or AutoRAG resources.

The production BFF authorization path remains unchanged in standalone and federated sidecar deployments: it uses the bearer token and checks namespace access to `DataSciencePipelineApplications` through a Kubernetes access review. The `autorag-ui` sidecar is deployed only in federated mode; standalone mode serves the same BFF directly.

The `genAiStudio` code default is enabled, but Crimson dashboard UI's confirmation that Gen AI Studio reaches GA in 3.6 is still required before the release coordination item can be closed. If the 3.6 timeline changes, the AutoRAG navigation category must be decoupled from `genAiStudio` as described in RHAI-982.

## Key Concepts

| Term                 | Definition                                                                                                   |
| -------------------- | ------------------------------------------------------------------------------------------------------------ |
| **AutoRAG workflow** | One optimization campaign: pipeline experiments exploring RAG parameters for a dataset and evaluation suite. |
| **ai4rag engine**    | Optimization engine that searches RAG parameters within each pipeline run.                                   |
| **RAG Pattern**      | Deployable artifact from a successful campaign: validated retrieval and generation parameters.               |
| **BFF**              | Go backend-for-frontend: auth, proxies to cluster and ai4rag, static assets (non-federated).                 |
| **Deployment mode**  | `standalone`, `kubeflow`, or `federated` — theme, asset serving, and integration points.                     |

## Interactions

| Dependency         | Type             | Details                                                                   |
| ------------------ | ---------------- | ------------------------------------------------------------------------- |
| Kubeflow Pipelines | External API     | Experiment creation, run monitoring, artifact retrieval.                  |
| ai4rag engine      | External service | RAG parameter search jobs and optimization results.                       |
| Main ODH Dashboard | Host application | Module Federation host in federated mode; auth context.                   |
| model-registry     | Package          | Registers optimal RAG Pattern configurations after a successful campaign. |

## Known Issues / Gotchas

- Kubeflow mode uses Material UI — do not assume PatternFly renders without theme guards.
- Without a live ai4rag endpoint, enable the HTTP client mock or expect BFF startup failures when mocks are off.
- Docker deployment is not documented here; use `Makefile` targets locally.
- Contract tests expect `GET /healthcheck` on the BFF.
