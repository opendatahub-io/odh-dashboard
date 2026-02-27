# Testing Inter-BFF Communication

This document describes how to test the inter-BFF communication between Gen-AI BFF and MaaS BFF.

## Overview

The inter-BFF communication allows Gen-AI BFF to call MaaS BFF endpoints for operations like issuing playground session tokens. This is implemented using:

1. **Gen-AI BFF** (`/api/v1/bff/maas/tokens`) - Calls MaaS BFF via the `bffclient` package
2. **MaaS BFF** (`/api/v1/tokens`) - Stub implementation that returns mock tokens

## Quick Start

### Option 1: Full Mock Mode (Recommended)

The easiest way to test - uses in-memory mocks for all external dependencies:

```bash
cd packages/gen-ai
make dev-bff-mock
```

This starts Gen-AI BFF on **port 8080** with all mocks enabled.

Test the endpoint:
```bash
# Issue token via BFF client (mock response)
curl -X POST "http://localhost:8080/api/v1/bff/maas/tokens?namespace=default" \
  -H "Content-Type: application/json" \
  -d '{"expiration": "30m"}'

# Expected response:
# {"data":{"token":"mock-ephemeral-token-...","expiresAt":1234567890}}

# Revoke tokens via BFF client (mock)
curl -X DELETE "http://localhost:8080/api/v1/bff/maas/tokens?namespace=default"
# Expected: 204 No Content
```

### Option 2: End-to-End with Both BFFs

Test actual HTTP communication between Gen-AI BFF and MaaS BFF.

**Terminal 1 - Start MaaS BFF:**

```bash
cd packages/maas
make dev-bff
```

This starts MaaS BFF on **port 4000** with mocks enabled.

**Terminal 2 - Start Gen-AI BFF:**

```bash
cd packages/gen-ai
make dev-bff-inter-bff
```

This starts Gen-AI BFF on **port 8080** configured to call MaaS BFF at `http://localhost:4000/api/v1`.

**Terminal 3 - Test the flow:**

```bash
# Test MaaS BFF directly
curl -X POST "http://localhost:4000/api/v1/tokens" \
  -H "Content-Type: application/json" \
  -d '{"expiration": "2h"}'

# Test Gen-AI BFF → MaaS BFF communication
curl -X POST "http://localhost:8080/api/v1/bff/maas/tokens?namespace=default" \
  -H "Content-Type: application/json" \
  -d '{"expiration": "2h"}'
```

### Option 3: Unit Tests

```bash
# Gen-AI BFF tests
cd packages/gen-ai/bff
go test ./internal/api/... -run "BFFMaaS" -v
go test ./internal/integrations/bffclient/... -v

# MaaS BFF tests
cd packages/maas/bff
go test ./internal/api/... -run "Token" -v
```

## Available Makefile Targets

From `packages/gen-ai/`:

| Target                     | Description                                                          |
| -------------------------- | -------------------------------------------------------------------- |
| `make dev-bff-mock`        | Run with all mocks (K8s, LlamaStack, MaaS, MCP, MLflow, BFF clients) |
| `make dev-bff-inter-bff`   | Run with mock K8s but real HTTP to MaaS BFF on localhost:4000        |
| `make dev-bff-mock-debug`  | Same as mock but with Delve debugger on port 2345                    |
| `make dev-start-mock`      | Run both frontend and BFF with all mocks                             |

## Configuration Options

### Gen-AI BFF Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MOCK_BFF_CLIENTS` | `false` | Use mock BFF clients (no HTTP calls) |
| `BFF_MAAS_SERVICE_NAME` | `odh-dashboard` | K8s service name for MaaS BFF |
| `BFF_MAAS_SERVICE_PORT` | `8243` | Port for MaaS BFF |
| `BFF_MAAS_TLS_ENABLED` | `false` | Enable TLS for MaaS BFF calls |
| `BFF_MAAS_DEV_URL` | `` | Override URL for local development |

### MaaS BFF Token Endpoint

The MaaS BFF token endpoint currently returns mock tokens. The stub implementation:

- **POST /api/v1/tokens**: Returns a mock JWT-like token with configurable TTL
- **DELETE /api/v1/tokens**: Returns 204 No Content

Real MaaS backend integration will be implemented in a future PR (RHOAIENG-49011).

## Endpoint Comparison

| Endpoint | Calls | Use Case |
|----------|-------|----------|
| `GET /api/v1/maas/models` | MaaS Controller directly | List available MaaS models |
| `POST /api/v1/maas/tokens` | MaaS Controller directly | Issue tokens (existing flow) |
| `POST /api/v1/bff/maas/tokens` | MaaS BFF via inter-BFF | Playground session tokens (new flow) |

## Troubleshooting

### "MaaS BFF is not available" error

This means the BFF client couldn't connect to MaaS BFF. Check:
1. MaaS BFF is running on the expected port
2. `BFF_MAAS_DEV_URL` is set correctly for local development
3. Network connectivity between services

### "BFF inter-communication is not configured" error

This means the BFF client factory wasn't initialized. Check:
1. Configuration flags are set correctly
2. No errors during app initialization

### Token response is empty

Check the MaaS BFF logs to ensure the token endpoint is being called and returning properly.
