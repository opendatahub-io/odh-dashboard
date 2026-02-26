# Testing Inter-BFF Communication

This document describes how to test the inter-BFF communication between Gen-AI BFF and MaaS BFF.

## Overview

The inter-BFF communication allows Gen-AI BFF to call MaaS BFF endpoints for operations like issuing playground session tokens. This is implemented using:

1. **Gen-AI BFF** (`/api/v1/bff/maas/tokens`) - Calls MaaS BFF via the `bffclient` package
2. **MaaS BFF** (`/api/v1/tokens`) - Stub implementation that returns mock tokens

## Testing Options

### Option 1: Mock Mode (Recommended for Development)

Run Gen-AI BFF with mock BFF clients enabled. This uses in-memory mocks instead of making real HTTP calls.

```bash
cd packages/gen-ai/bff
go run ./cmd/... \
  --mock-k8s-client \
  --mock-bff-clients \
  --auth-method=disabled \
  --port=8143
```

Test the endpoint:
```bash
# Issue token via BFF client (mock)
curl -X POST "http://localhost:8143/api/v1/bff/maas/tokens?namespace=default" \
  -H "Content-Type: application/json" \
  -d '{"expiration": "30m"}'

# Expected response:
# {"data":{"token":"mock-ephemeral-token-...","expiresAt":1234567890}}

# Revoke tokens via BFF client (mock)
curl -X DELETE "http://localhost:8143/api/v1/bff/maas/tokens?namespace=default"
# Expected: 204 No Content
```

### Option 2: End-to-End with Both BFFs Running

Run both BFFs locally to test actual HTTP communication.

**Terminal 1 - Start MaaS BFF:**
```bash
cd packages/maas/bff
go run ./cmd/... \
  --mock-k8s-client \
  --mock-http-client \
  --auth-method=disabled \
  --port=8243
```

**Terminal 2 - Start Gen-AI BFF with dev URL override:**
```bash
cd packages/gen-ai/bff
go run ./cmd/... \
  --mock-k8s-client \
  --mock-ls-client \
  --auth-method=disabled \
  --bff-maas-dev-url="http://localhost:8243/api/v1" \
  --port=8143
```

**Terminal 3 - Test the endpoints:**
```bash
# Test MaaS BFF directly
curl -X POST "http://localhost:8243/api/v1/tokens" \
  -H "Content-Type: application/json" \
  -d '{"expiration": "2h"}'

# Test Gen-AI BFF calling MaaS BFF
curl -X POST "http://localhost:8143/api/v1/bff/maas/tokens?namespace=default" \
  -H "Content-Type: application/json" \
  -d '{"expiration": "2h"}'
```

### Option 3: Unit Tests

Run the unit tests to verify the implementation:

```bash
# Gen-AI BFF tests
cd packages/gen-ai/bff
go test ./internal/api/... -run "BFFMaaS" -v
go test ./internal/integrations/bffclient/... -v

# MaaS BFF tests
cd packages/maas/bff
go test ./internal/api/... -run "Token" -v
```

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
