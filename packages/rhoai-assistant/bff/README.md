# RHOAI Assistant BFF

Backend-for-frontend service for the RHOAI Assistant chatbot widget.

## What This Does

This BFF sits between the frontend widget and:
- **Llama Stack** - for LLM inference (chat completions)
- **MCP Server** - for tool calling (create projects, deploy models, etc.)

## Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/healthcheck` | GET | Health probe |
| `/api/chat` | POST | Send message to LLM, returns response + tool calls |
| `/api/context` | GET | Get current page context |
| `/api/quick-actions` | GET | Get suggested prompts for current page |

## Quick Start

```bash
cd bff
go build -o bin/bff ./cmd
./bin/bff --port=4001
```

Or use the Makefile:
```bash
make build
make run
```

## TODO for Next Developer

1. **Connect to Llama Stack** in `internal/api/router.go`:
   - Update `chatHandler()` to call Llama Stack inference API
   - Add SSE streaming for real-time responses

2. **Integrate MCP Client**:
   - Add MCP client to call the MCP server
   - Parse tool calls from LLM response
   - Execute tools and return results

3. **Add Authentication**:
   - Pass through user token to K8s calls
   - Implement proper RBAC checks

## Architecture

```
┌─────────────────┐     ┌─────────────┐     ┌─────────────┐
│  Frontend       │────▶│   BFF       │────▶│ Llama Stack │
│  Widget         │     │  (this)     │     │   (LLM)     │
└─────────────────┘     └──────┬──────┘     └─────────────┘
                               │
                               ▼
                        ┌─────────────┐
                        │ MCP Server  │
                        │  (tools)    │
                        └─────────────┘
```
