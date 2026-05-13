# Documentation Bookmarks

Central index of key documentation in the ODH Dashboard monorepo.

---

## Getting Started

| Doc | Description |
|-----|-------------|
| [CONTRIBUTING.md](CONTRIBUTING.md) | Contribution guidelines |
| [README.md](README.md) | Project overview |
| [Dev Setup](docs/dev-setup.md) | Development environment setup |

---

## Architecture & Design

| Doc | Description |
|-----|-------------|
| [Architecture](docs/architecture.md) | Overall system architecture |
| [Architecture Decisions](docs/architecture-decisions.md) | Key architecture decisions (monorepo, Module Federation, Turbo) |
| [Module Federation](docs/module-federation.md) | Module Federation implementation |
| [Extensibility](docs/extensibility.md) | Plugin/extension system |
| [Quality Gates](docs/modular-architecture-quality-gates.md) | Modular architecture quality standards |

---

## Development Workflows

| Doc | Description |
|-----|-------------|
| [PR Review Guidelines](docs/pr-review-guidelines.md) | PR review process |
| [Pre-Commit Hooks](docs/PRE-COMMIT.md) | Pre-commit hook details |
| [Best Practices](docs/best-practices.md) | Coding best practices |
| [Code Examples](docs/code_examples.md) | Code examples and patterns |
| [Multi-Agent Workflows](docs/multi-agent-workflows.md) | Running parallel agents locally and remotely |

---

## Testing

| Doc | Description |
|-----|-------------|
| [Testing Guide](docs/testing.md) | Comprehensive testing guide |
| [Cypress Tutorial](docs/cypress-tutorial.md) | Cypress testing tutorial |

---

## Process & Collaboration

| Doc | Description |
|-----|-------------|
| [OWNERS Management](docs/adding-owners-and-reviewers.md) | OWNERS file management |
| [Definition of Ready](docs/definition-of-ready.md) | DoR for features |
| [Definition of Done](docs/definition-of-done.md) | DoD for tasks |
| [SMEs](docs/smes.md) | Subject matter experts |

---

## Deployment & Operations

| Doc | Description |
|-----|-------------|
| [Release Steps](docs/release-steps.md) | Release process |
| [Environment Variables](docs/dashboard-environment-variables.md) | Environment configuration |
| [Observability](docs/observability.md) | Monitoring and observability |
| [Onboarding Modules](docs/onboard-modular-architecture.md) | Onboarding new modules |

---

## Frontend Areas

> Active frontend areas in `frontend/src/pages/`. Model Registry, Model Serving, and Model Catalog are deprecated in the main frontend — see Package docs below.

| Doc | Description |
|-----|-------------|
| [Pipelines](frontend/docs/pipelines.md) | Pipeline runs, DAG viewing, artifact tracking, Kubeflow Pipelines integration |
| [Workbenches](frontend/docs/workbenches.md) | Notebook creation, JupyterLab, gateway-based routing (v3.0+), notebookController |
| [Projects](frontend/docs/projects.md) | Data Science Projects hub — primary entry point for workbenches, pipelines, serving, storage, connections |
| [Distributed Workloads](frontend/docs/distributed-workloads.md) | Kueue workload management, distributed training job monitoring |
| [Gen AI / LLM](frontend/docs/gen-ai.md) | Host-side LLM feature flags and type definitions; actual UI lives in federated packages (gen-ai, eval-hub) |
| [Home / Applications](frontend/docs/home-applications.md) | Application tile dashboard, enabled apps, learning center |
| [Admin Settings](frontend/docs/admin-settings.md) | Cluster settings, group management, storage classes, hardware profiles, BYON images, connection types |

---

## Backend

| Doc | Description |
|-----|-------------|
| [Backend Overview](backend/docs/overview.md) | Authentication strategies, proxy/pass-through architecture, k8s integration, service account calls, environment config |

---

## Packages

### Full Docs

| Doc | Description |
|-----|-------------|
| [Model Registry](packages/model-registry/docs/overview.md) | Model Registry UI — canonical doc (replaces deprecated frontend area); upstream Go BFF, model versioning |
| [Model Serving](packages/model-serving/docs/overview.md) | Model Serving UI — canonical doc (replaces deprecated frontend area); KServe/ModelMesh runtimes |
| [KServe](packages/kserve/docs/overview.md) | KServe-specific serving package; InferenceService CRDs, serving runtime management |
| [AutoML](packages/automl/docs/overview.md) | AutoML pipeline optimization; Go BFF; Kubeflow Pipelines orchestration |
| [AutoRAG](packages/autorag/docs/overview.md) | Automated RAG configuration optimization; Go BFF; three deployment modes |
| [Eval Hub](packages/eval-hub/docs/overview.md) | Model evaluation hub; Go BFF; eval metrics; model-registry integration |
| [Gen AI](packages/gen-ai/docs/overview.md) | Gen AI / LLM chatbot package; Go BFF with MCP/LSD clients; model serving interactions |
| [MaaS](packages/maas/docs/overview.md) | Model as a Service; Material UI (Kubeflow); Go BFF; LLM endpoint management |
| [MLflow](packages/mlflow/docs/overview.md) | MLflow experiment tracking integration; experiment/run browsing UI |
| [MLflow Embedded](packages/mlflow-embedded/docs/overview.md) | Embedded MLflow UI variant; Module Federation config |
| [Model Training](packages/model-training/docs/overview.md) | Training job management; pipeline integration; resource configuration |
| [Notebooks](packages/notebooks/docs/overview.md) | Notebook management package; workbenches frontend area interactions |
| [Observability](packages/observability/docs/overview.md) | Metrics, logging, tracing integration; Prometheus endpoint patterns |
| [Feature Store](packages/feature-store/docs/overview.md) | Feature store management UI; dataset versioning |
| [LLMD Serving](packages/llmd-serving/docs/overview.md) | LLM-dedicated serving; interactions with gen-ai frontend area |

### Stubs (tooling-only packages)

| Doc | Description |
|-----|-------------|
| [App Config](packages/app-config/README.md) | Shared runtime and build-time configuration utilities |
| [ESLint Config](packages/eslint-config/README.md) | Shared ESLint rules and configurations |
| [ESLint Plugin](packages/eslint-plugin/README.md) | Custom ESLint plugin rules |
| [Jest Config](packages/jest-config/README.md) | Shared Jest test runner configurations |
| [Plugin Core](packages/plugin-core/README.md) | Core plugin infrastructure and extension-point definitions |
| [Plugin Template](packages/plugin-template/README.md) | Starter template for new modular packages |
| [TSConfig](packages/tsconfig/README.md) | Shared TypeScript compiler configurations |
