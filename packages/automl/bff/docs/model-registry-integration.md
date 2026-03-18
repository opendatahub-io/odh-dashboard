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

The Model Registry stores **metadata** only; the actual model binary remains in S3. The `uri` field on the ModelArtifact holds the S3 location (e.g., `s3://bucket/path/model.bin`).

## Configuration

### Required: `MODEL_REGISTRY_BASE_URL`

The Model Registry integration is **disabled** unless `MODEL_REGISTRY_BASE_URL` is set. When empty, `POST /api/v1/models/register` returns `500` with a message indicating the Model Registry is not configured.

**Environment variable:** `MODEL_REGISTRY_BASE_URL`  
**CLI flag:** `--model-registry-base-url`

**Example values:**

- In-cluster (Kubernetes): `http://model-registry.kubeflow.svc.cluster.local:8080/api/model_registry/v1alpha3`
- Local (port-forward): `http://localhost:8080/api/model_registry/v1alpha3`
- External: `https://model-registry.example.com/api/model_registry/v1alpha3`

The base URL must **not** include a trailing slash. The BFF appends paths such as `/registered_models` and `/model_versions/{id}/artifacts`.

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

### When `internal` or `disabled` is used

No `Authorization` header is sent to the Model Registry. This is suitable when:

- The Model Registry is an **internal** service (e.g., in-cluster) and does not require auth
- The Model Registry is reachable only from within the cluster and trusts the BFF
- You are running locally with a Model Registry that has auth disabled

### Requirements for the Model Registry

- If the Model Registry is exposed and requires auth, use `AUTH_METHOD=user_token` and ensure clients pass a valid Bearer token.
- If the Model Registry is internal and unauthenticated, `internal` or `disabled` is fine; no token is needed.

## API

### `POST /api/v1/models/register`

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

**Response:** `201 Created` with the created `ModelArtifact` in an envelope. A `Location` header is set when the artifact has an ID.

**Example:**

```bash
curl -X POST "http://localhost:4003/automl/api/v1/models/register?namespace=my-namespace" \
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
| `400` | Invalid request body, missing required fields, invalid S3 path |
| `409` | Model Registry returns conflict (e.g., duplicate model name) |
| `500` | `MODEL_REGISTRY_BASE_URL` not configured, or Model Registry API error |

## Flow diagram

```
Client                    AutoML BFF                    Model Registry API
  |                            |                                |
  |  POST /models/register     |                                |
  |  + Bearer token (optional) |                                |
  |--------------------------->|                                |
  |                            | 1. Validate request            |
  |                            | 2. POST /registered_models     |
  |                            |------------------------------->|
  |                            |<-------------------------------|
  |                            | 3. POST /.../versions          |
  |                            |------------------------------->|
  |                            |<-------------------------------|
  |                            | 4. POST /.../artifacts (S3 URI)|
  |                            |------------------------------->|
  |                            |<-------------------------------|
  |  201 + ModelArtifact       |                                |
  |<---------------------------|                                |
```

## Related files

- Handler: [`internal/api/register_model_handler.go`](../internal/api/register_model_handler.go)
- Repository: [`internal/repositories/model_registry.go`](../internal/repositories/model_registry.go)
- Validation: [`internal/repositories/register_model_validation.go`](../internal/repositories/register_model_validation.go)
- Model Registry HTTP client: [`internal/integrations/modelregistry/httpclient.go`](../internal/integrations/modelregistry/httpclient.go)
