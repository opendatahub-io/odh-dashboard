# Gen AI

## Overview

- Full LLM chatbot UI: streaming chat, model selection, conversation history, and system prompts.
- Go BFF integrates MCP (Model Context Protocol) and LSD (LLM Service Discovery) with MaaS and related clients.
- Host-side feature flags and shared LLM types are defined in the main frontend (see `frontend/docs/gen-ai.md`); this package contains the actual chatbot UI.

## Design Intent

- **Security and integration boundary**: Kubernetes (mocked or real clients); inference to **Llama Stack**; model listing via **LSD** and **MaaS**; token streaming to the browser as **server-sent events**.
- **MCP**: Session lifecycle and tool calls run in the BFF so the browser does not hold cluster credentials on those paths.
- **Module Federation**: Remote `genAi`; host consumes `./extensions` and `./extension-points`.
- **Host contract**: Main dashboard embeds federated **`AIAssetsMaaSTab`**; coordinate prop/API changes with the host.

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
