# Model Registry Integration

This document explains how the AutoML BFF integrates with the Model Registry to register model binaries, including configuration, authentication, and the registration flow.

## Overview

The AutoML BFF provides a **Register Model** endpoint that allows clients to register a trained model binary in the Model Registry. The handler:

1. Accepts a `RegisterModelRequest` with S3 path and model metadata
2. Validates the S3 path and required fields
3. Calls the Model Registry REST API to create, in sequence:
   - **RegisteredModel** – logical model (e.g., "my-automl-model")
   - **ModelVersion** – version under that model (e.g., "v1")
   - **ModelArtifact** – artifact pointing to the S3 URI

The Model Registry stores **metadata** only; the actual model binary remains in S3. The `uri` field on the ModelArtifact holds the S3 location (e.g., `s3://bucket/path/model.bin`). The BFF automatically sets `artifactType: "model-artifact"` when creating the artifact, as required by the Model Registry API.

## Configuration

### Registry discovery and routing

There is **no** global Model Registry base URL. The BFF discovers `modelregistry.opendatahub.io` `ModelRegistry` custom resources (see `GET /api/v1/model-registries`) and returns each instance’s Kubernetes **`id`** (UID) and in-cluster **`server_url`** (REST base path including `/api/model_registry/...`).

Clients call **`POST /api/v1/model-registries/:registryId/models`** with the registry’s UID as the `:registryId` path parameter. The BFF lists registries under the caller’s identity (same RBAC as discovery), finds the matching CR, requires it to be **ready**, and uses **`server_url`** as the HTTP base for Kubeflow Model Registry API calls (`/registered_models`, etc.).

> **Security (high severity):** When using `AUTH_METHOD=user_token`, the resolved `server_url` **must** use `https://` unless the host is `localhost` or `127.0.0.1`. The BFF rejects other `http://` URLs before forwarding the Bearer token. Use TLS for in-cluster registries (e.g., kube-rbac-proxy on port 8443) and external Routes.

The base URL must **not** include a trailing slash internally; the BFF normalizes and appends paths such as `/registered_models` and `/model_versions/{id}/artifacts`.

### Optional: TLS

- **`INSECURE_SKIP_VERIFY`** – When `true`, skips TLS certificate verification for outbound calls to the Model Registry. Use only in development.
- **`BUNDLE_PATHS`** – Comma-separated paths to PEM CA bundles for custom TLS trust.

## Authentication

### How authentication works

The AutoML BFF uses the same auth modes as other endpoints. For the Model Registry integration:

| Auth Method | Token forwarded to Model Registry? | Notes |
|-------------|------------------------------------|-------|
| `user_token` | **Yes** – Bearer token from `Authorization` header | Token is forwarded as `Authorization: Bearer <token>` |
| `internal`   | **No**                             | BFF uses internal k8s credentials; no token sent to Model Registry |
| `disabled`  | **No**                             | No auth; no token sent to Model Registry |

### When `user_token` is used

1. The client sends a Bearer token to the AutoML BFF (e.g., `Authorization: Bearer <token>`).
2. The BFF extracts the token and forwards it to the Model Registry API on every outbound request.
3. The Model Registry must accept that token (e.g., when behind OAuth Proxy or an API gateway that validates it).

**Security:** Bearer tokens **MUST** only be sent over TLS (`https://`). With `AUTH_METHOD=user_token`, the BFF rejects non-HTTPS `server_url` values except for `localhost`/`127.0.0.1` (local dev). Plain HTTP exposes tokens to interception.

### When `internal` or `disabled` is used

No `Authorization` header is sent to the Model Registry. This is suitable when:

- The Model Registry is an **internal** service (e.g., in-cluster) and does not require auth
- The Model Registry is reachable only from within the cluster and trusts the BFF
- You are running locally with a Model Registry that has auth disabled

### Requirements for the Model Registry

- If the Model Registry is exposed and requires auth, use `AUTH_METHOD=user_token` and ensure clients pass a valid Bearer token. **Use HTTPS** for the registry `server_url` to avoid token interception.
- If the Model Registry is internal and unauthenticated, `internal` or `disabled` is fine; no token is needed.

## API

### `POST /api/v1/model-registries/:registryId/models`

**Path parameter:** `registryId` (required) — Kubernetes UID of the target `ModelRegistry` CR (`id` from `GET /api/v1/model-registries`)

**Query parameter:** `namespace` (required)

**Request body (JSON):**

```json
{
  "s3_path": "s3://my-bucket/models/model.bin",
  "model_name": "my-automl-model",
  "model_description": "AutoML trained model",
  "version_name": "v1",
  "version_description": "Initial version",
  "artifact_name": "model-artifact",
  "artifact_description": "ONNX model artifact",
  "model_format_name": "onnx",
  "model_format_version": "1.0"
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `s3_path` | Yes | S3 URI (e.g., `s3://bucket/path` or `s3a://bucket/path`) |
| `model_name` | Yes | Name of the registered model |
| `version_name` | Yes | Version name (e.g., "v1", "1.0.0") |
| `model_description` | No | Description of the model |
| `version_description` | No | Description of the version |
| `artifact_name` | No | Artifact name (defaults to `version_name`) |
| `artifact_description` | No | Artifact description |
| `model_format_name` | No | e.g., "onnx", "pytorch", "tensorflow" |
| `model_format_version` | No | e.g., "1.0" |

**Response:** `201 Created` with the created `ModelArtifact` in an envelope.

**Example:**

```bash
curl -X POST "http://localhost:4003/automl/api/v1/model-registries/<registry-uid>/models?namespace=my-namespace" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "s3_path": "s3://my-bucket/models/model.bin",
    "model_name": "my-automl-model",
    "version_name": "v1"
  }'
```

## Error responses

| Status | Condition |
|--------|-----------|
| `400` | Invalid request body, missing required fields, invalid S3 path, invalid `server_url` for auth mode |
| `403` | Caller cannot list ModelRegistries (RBAC) |
| `404` | No `ModelRegistry` matches the `registryId` path parameter |
| `503` | Registry exists but is not ready (`Available` condition not true) |
| `409` | Model Registry returns conflict (e.g., duplicate model name) |
| `500` | Internal error or Model Registry API error |

## Flow diagram

```text
Client                    AutoML BFF                    Kubernetes / MR API
  |                            |                                |
  |  GET /model-registries     |                                |
  |--------------------------->|  list ModelRegistry CRs        |
  |<---------------------------|                                |
  |  POST /model-registries/   |                                |
  |    :registryId/models      |                                |
  |  + Bearer (optional)       |                                |
  |--------------------------->|                                |
  |                            | 1. Validate request            |
  |                            | 2. Resolve id -> server_url    |
  |                            | 3. POST .../registered_models    |
  |                            |------------------------------->|
  |                            | 4. POST .../versions           |
  |                            |------------------------------->|
  |                            | 5. POST .../artifacts (S3 URI) |
  |                            |------------------------------->|
  |  201 + ModelArtifact       |                                |
  |<---------------------------|                                |
```

## Related files

- Handler: [`internal/api/register_model_handler.go`](../internal/api/register_model_handler.go)
- Repository: [`internal/repositories/model_registry.go`](../internal/repositories/model_registry.go)
- Validation: [`internal/repositories/register_model_validation.go`](../internal/repositories/register_model_validation.go)
- Model Registry HTTP client: [`internal/integrations/modelregistry/httpclient.go`](../internal/integrations/modelregistry/httpclient.go)
