[Guidelines]: guidelines.md
[Frontend Template]: templates/frontend-template.md
[Backend Template]: templates/backend-template.md
[Package Template]: templates/package-template.md
[Update Docs Skill]: skills/update-docs.md
[Create Doc Skill]: skills/create-doc.md
[Create Package Doc Skill]: skills/create-package-doc.md

# Documentation Bookmarks

**Last Updated**: 2026-03-09

Central navigation hub for all documentation in the ODH Dashboard monorepo. Every doc file
is listed here with a one-line description. Start here when you need to find anything.

---

## Meta

| Doc | Description |
|-----|-------------|
| [Guidelines] | Authoritative style and structure guide — read this before creating or editing any doc |
| [Frontend Template] | Template for frontend area docs (`frontend/docs/`) |
| [Backend Template] | Template for backend module docs (`backend/docs/`) |
| [Package Template] | Template for package docs (`packages/*/docs/`) |
| [Update Docs Skill] | `/docs.update` — adapt existing docs to guidelines based on git diff |
| [Create Doc Skill] | `/docs.create` — create a new doc from a natural language prompt |
| [Create Package Doc Skill] | `/docs.package` — scaffold a package doc and register it here |

---

## Frontend Areas

> Active frontend areas in `frontend/src/pages/`. Model Registry, Model Serving, and Model Catalog are deprecated in the main frontend — see Package docs below.

| Doc | Description |
|-----|-------------|
| [Pipelines](../frontend/docs/pipelines.md) | Pipeline runs, DAG viewing, artifact tracking, Kubeflow Pipelines integration |
| [Workbenches](../frontend/docs/workbenches.md) | Notebook creation, JupyterLab, gateway-based routing (v3.0+), notebookController |
| [Projects](../frontend/docs/projects.md) | Data Science Projects hub — primary entry point for workbenches, pipelines, serving, storage, connections |
| [Distributed Workloads](../frontend/docs/distributed-workloads.md) | Kueue workload management, distributed training job monitoring |
| [Gen AI / LLM](../frontend/docs/gen-ai.md) | LLM chatbot UI, lmEval pages, gen-ai and llmd-serving package interactions |
| [Home / Applications](../frontend/docs/home-applications.md) | Application tile dashboard, enabled apps, learning center |
| [Admin Settings](../frontend/docs/admin-settings.md) | Cluster settings, group management, storage classes, hardware profiles, BYON images, connection types |

---

## Backend

| Doc | Description |
|-----|-------------|
| [Backend Overview](../backend/docs/overview.md) | Authentication strategies, proxy/pass-through architecture, k8s integration, service account calls, environment config |

---

## Packages

### Full Docs

| Doc | Description |
|-----|-------------|
| [Model Registry](../packages/model-registry/docs/overview.md) | Model Registry UI — canonical doc (replaces deprecated frontend area); upstream Go BFF, model versioning |
| [Model Serving](../packages/model-serving/docs/overview.md) | Model Serving UI — canonical doc (replaces deprecated frontend area); KServe/ModelMesh runtimes |
| [KServe](../packages/kserve/docs/overview.md) | KServe-specific serving package; InferenceService CRDs, serving runtime management |
| [AutoML](../packages/automl/docs/overview.md) | AutoML pipeline optimization; Go BFF; Kubeflow Pipelines orchestration |
| [AutoRAG](../packages/autorag/docs/overview.md) | Automated RAG configuration optimization; Go BFF; three deployment modes |
| [Eval Hub](../packages/eval-hub/docs/overview.md) | Model evaluation hub; Go BFF; eval metrics; model-registry integration |
| [Gen AI](../packages/gen-ai/docs/overview.md) | Gen AI / LLM chatbot package; Go BFF with MCP/LSD clients; model serving interactions |
| [MaaS](../packages/maas/docs/overview.md) | Model as a Service; Material UI (Kubeflow); Go BFF; LLM endpoint management |
| [MLflow](../packages/mlflow/docs/overview.md) | MLflow experiment tracking integration; experiment/run browsing UI |
| [MLflow Embedded](../packages/mlflow-embedded/docs/overview.md) | Embedded MLflow UI variant; Module Federation config |
| [Model Training](../packages/model-training/docs/overview.md) | Training job management; pipeline integration; resource configuration |
| [Notebooks](../packages/notebooks/docs/overview.md) | Notebook management package; workbenches frontend area interactions |
| [Observability](../packages/observability/docs/overview.md) | Metrics, logging, tracing integration; Prometheus endpoint patterns |
| [Feature Store](../packages/feature-store/docs/overview.md) | Feature store management UI; dataset versioning |
| [LLMD Serving](../packages/llmd-serving/docs/overview.md) | LLM-dedicated serving; interactions with gen-ai frontend area |

### Stubs (README only)

| Package | Description |
|---------|-------------|
| [app-config](../packages/app-config/README.md) | Application configuration shared across packages |
| [contract-tests](../packages/contract-tests/README.md) | Central contract-test framework (`@odh-dashboard/contract-tests`) |
| [cypress](../packages/cypress/README.md) | Shared Cypress test framework, page objects, and e2e/mocked tests |
| [eslint-config](../packages/eslint-config/README.md) | Shared ESLint configuration |
| [eslint-plugin](../packages/eslint-plugin/README.md) | Custom ESLint rules for the monorepo |
| [jest-config](../packages/jest-config/README.md) | Shared Jest configuration |
| [tsconfig](../packages/tsconfig/README.md) | Shared TypeScript configurations |
| [plugin-core](../packages/plugin-core/README.md) | Core plugin infrastructure and extension point definitions |
| [plugin-template](../packages/plugin-template/README.md) | Starter template for new modular packages |
