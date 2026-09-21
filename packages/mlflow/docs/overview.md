# MLflow

## Overview

- Integrates experiment tracking, Prompt Registry, and MCP Registry into ODH Dashboard.
- Go BFF owns experiments, prompts, and MCP registry against the MLflow tracking server. Register uses the BFF → model-registry inter-BFF catalog proxy for tools and converter.
- The UI ships as a Module Federation remote.

## Design Intent

- The BFF does not implement the full upstream MLflow REST API. It covers identity, namespace listing for dev/standalone, asset serving, health, experiments, prompts, MCP registry (`/api/v1/mcp-registry/...`), and a catalog proxy (`/api/v1/mcp-catalog/servers/:id/{tools,mcpserver}`).
- Experiment/run browsing in the MLflow UI still uses MLflow’s own pages; dashboard-owned Register/prompts/registry flows go through this BFF.
- `cmd/main.go` supports `--mock-k8s-client`, `--mock-http-client`, and `--mock-bff-clients` for local iteration. `--bff-model-registry-dev-url` points the catalog proxy at a local model-registry BFF.
- **Federated mode:** remote named **`mlflow`** with **`./extensions`** (routes, nav, actions) for the host; theme follows `STYLE_THEME` (MUI standalone, PatternFly when federated). Package `Makefile` and `.env.local.example` document ports and flags.
- Contract tests exercise the BFF against `api/openapi/mlflow.yaml`; Cypress coverage lives under the main repo’s `**/mlflow/**` specs.

## Key Concepts

| Term | Definition |
|------|-----------|
| **MLflowExperiment** | Named collection of runs |
| **MLflowRun** | Single execution with params, metrics, artifacts |
| **Prompt Registry** | Named prompts and versions stored on the tracking server |
| **MCP Registry** | Tracking-server registry of MCP servers (`/mcp-registry`) |
| **MCP catalog proxy** | MLflow BFF routes under `/mcp-catalog` that call model-registry’s `/mcp_catalog/mcp_servers/...` |

## Interactions

| Dependency | Type | Details |
|-----------|------|---------|
| External MLflow tracking server | HTTP (BFF) | Experiments, prompts, MCP registry |
| Model-registry BFF | Inter-BFF | Catalog tools + converter for Register |
| Gen-ai BFF | Consumer | Calls MLflow **prompts** (not MCP) |
| `packages/model-registry` | Package | Catalog UI + Register action; model versioning from runs |
| Main ODH Dashboard | Host application | Federated remote `mlflow` |

## Known Issues / Gotchas

- **Two modes only**: `dev-start` vs `dev-start-federated`; no kubeflow target for this package.
- **Contract**: `api/openapi/mlflow.yaml` is the BFF contract (health, user, namespaces, status, experiments, prompts, MCP registry, catalog proxy). Upstream MLflow docs still define the tracking API the UI embeds.
- **Two MCP prefixes**: `/mcp-registry` is tracking; `/mcp-catalog` is the MR proxy. Do not nest catalog under `/mcp-registry`.
- **`STYLE_THEME`**: Default `mui-theme` even in standalone; set `patternfly-theme` explicitly if you need PF outside federated mode.
