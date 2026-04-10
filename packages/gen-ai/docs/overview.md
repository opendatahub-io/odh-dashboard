[Guidelines]: ../../../docs/guidelines.md
[BOOKMARKS]: ../../../BOOKMARKS.md
[Backend Overview]: ../../../backend/docs/overview.md
[Module Federation Docs]: ../../../docs/module-federation.md
[LLMd Serving Package]: ../../llmd-serving/docs/overview.md
[MaaS Package]: ../../maas/docs/overview.md
[Model Serving Package]: ../../model-serving/docs/overview.md
[BFF Deep Dive]: developer/BFF_OVERVIEW.md
[Developer Docs]: developer/README.md
[User Docs]: user/README.md
[Logging Guide]: user/admin/logging/README.md
[BFF Logging]: user/admin/logging/bff-logging.md
[vLLM Logging]: user/admin/logging/vllm-logging.md
[Logging Troubleshooting]: user/admin/logging/troubleshooting.md
[Logging Best Practices]: user/admin/logging/best-practices.md
[Logging Config Examples]: user/admin/logging/configuration-examples.md
[RBAC Guide]: user/admin/rbac/README.md
[ADR Index]: adr/README.md

# Gen AI

**Last Updated**: 2026-04-10 | **Template**: package-template v2

## Overview

Gen AI is the full LLM chatbot UI for the ODH Dashboard: streaming chat, model selection, conversation history, and system prompts, backed by a Go BFF that integrates MCP (Model Context Protocol) and LSD (LLM Service Discovery) with MaaS and related clients. Host-side feature flags and types for embedding Gen AI are documented in `frontend/docs/gen-ai.md`.

**Package path**: `packages/gen-ai/`

## Deployment Modes

| Mode | How to start | Notes |
|------|-------------|-------|
| Standalone | `make dev-start` | Needs `LLAMA_STACK_URL` and `MAAS_URL` for live backends; serves UI and BFF together (`http://localhost:8080`). |
| Standalone (mocked) | `make dev-start-mock` | All BFF mocks on; no cluster or live Llama Stack/MaaS required. |
| Kubeflow | `build.openshift.sh` (and cluster routing) | OpenShift BuildConfig-style deploy; cluster route for access. |
| Federated | `make dev-start` + `npm run dev` at repo root | Host loads the remote; primary dashboard URL `http://localhost:4010`. |

Use mocked standalone for offline work; use live standalone when you have Llama Stack and MaaS endpoints. Federated matches production embedding in the main app.

## Design Intent

The BFF is the security and integration boundary: it talks to Kubernetes (via mocked or real clients), forwards inference to **Llama Stack**, lists models through **LSD** and **MaaS**, and streams tokens to the browser as **server-sent events**. **MCP** support lives in the BFF — session lifecycle and tool calls are mediated there so the browser does not hold cluster credentials for those paths.

Module Federation remote name is `genAi`. The host consumes `./extensions` and `./extension-points`. The main dashboard also embeds the federated **`AIAssetsMaaSTab`** component; prop changes require coordinated host updates.

## Key Concepts

| Term | Definition |
|------|-----------|
| **LLMSession** | Named conversation with history, system prompt, and selected model; persisted by the BFF. |
| **ModelContext** | Resolved model config (endpoint, parameters, limits) for a session. |
| **SystemPrompt** | Instruction prepended to requests in a session. |
| **TokenStream** | SSE stream of partial LLM output to the client. |
| **MCP** | Model Context Protocol — tools and external context for sessions. |
| **LSD** | LLM Service Discovery — enumerates LLM endpoints in the cluster. |

## Interactions

| Dependency | Type | Details |
|-----------|------|---------|
| Main ODH Dashboard | Host application | Module Federation host; embeds `AIAssetsMaaSTab`. |
| llmd-serving | Package | LLM serving types and CRD-related concepts. |
| maas | Package | Model catalog and token flows. |
| model-serving | Package | Broader serving infrastructure for non-LLM models where relevant. |
| Llama Stack | External service | Inference backend; BFF proxies Llama Stack API paths. |
| MCP server | External service | Tool-augmented chat; BFF owns session lifecycle. |
| Kubernetes | Cluster API | CRDs and RBAC surfaced through LSD and related integrations. |

## Known Issues / Gotchas

- Without mocks, missing `LLAMA_STACK_URL` or `MAAS_URL` causes immediate BFF exit unless the corresponding mock flags are on.
- SSE streaming: disable reverse-proxy buffering (e.g. `X-Accel-Buffering: no` on nginx) or responses stall.
- `AIAssetsMaaSTab` is a cross-package contract with the host — coordinate API/prop changes.
- Delve (`dlv`) and `README.md` / `make dev-start-debug` are required for the documented debugger workflow.
- Contract tests expect `GET /healthcheck` on the BFF.

## Related Docs

- [BFF Deep Dive] — handlers, integrations, testing
- [Developer Docs] — developer index
- [User Docs] — user and admin index
- [ADR Index] — architecture decisions
- [Logging Guide] — logging overview
- [BFF Logging] — BFF logging behavior
- [vLLM Logging] — vLLM server logs
- [Logging Troubleshooting] — common issues
- [Logging Best Practices] — patterns
- [Logging Config Examples] — samples
- [RBAC Guide] — admin RBAC
- [Guidelines] — documentation style guide
- [Module Federation Docs] — Module Federation in this monorepo
- [Backend Overview] — main dashboard backend
- [LLMd Serving Package] — LLM serving reference
- [MaaS Package] — MaaS integration
- [Model Serving Package] — serving infrastructure
- [BOOKMARKS] — full doc index
