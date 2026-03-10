# Secrets Endpoint Documentation

## Overview

This document describes the GET endpoint for listing and filtering Kubernetes secrets in the autorag BFF.

## Endpoint

**GET** `/api/v1/secrets`

## Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `namespace` | string | **Yes** | The namespace name to query secrets from |
| `type` | string | No | Secret type filter: `storage` for storage secrets (e.g., S3), `lls` for LLS (Llama Stack) secrets, or omit for all secrets |

## Functionality

The endpoint:
1. Lists secrets in the specified namespace
2. Filters secrets based on the `type` parameter:
   - **No type** (or empty): Returns all secrets in the namespace
   - **`type=storage`**: Filters for storage secrets matching any configured storage type (currently supports S3)
   - **`type=lls`**: Filters for LLS (Llama Stack) secrets containing required LLS keys
3. Returns the Kubernetes UID, name, and type of each matching secret
   - The `type` field indicates which secret type matches (e.g., "s3", "lls")
   - If a secret doesn't match any known type, the `type` field is an empty string
   - If a secret matches multiple types, the first matching type is returned
4. Requires authentication via the InjectRequestIdentity middleware
5. Validates the `type` parameter and returns 400 Bad Request for invalid values

### Secret Type Filtering

Secrets are filtered using configurable dictionaries of secret types and their required keys. A secret must contain **ALL** required keys for a type to be included in the results. Key matching is **case-insensitive**.

**Currently Supported Storage Types:**

| Storage Type | Required Keys |
|--------------|---------------|
| **S3** | `aws_access_key_id`, `aws_default_region`, `aws_secret_access_key`, `aws_s3_endpoint` |

**Future storage types** (e.g., Azure, GCP) can be easily added to the configuration without changing the API.

**Currently Supported LLS Types:**

| LLS Type | Required Keys |
|----------|---------------|
| **Llama Stack** | `llama_stack_client_api_key`, `llama_stack_client_base_url` |

## Response Format

The response follows the envelope pattern:

```json
{
  "data": [
    {
      "uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "name": "aws-secret-1",
      "type": "s3",
      "availableKeys": ["aws_access_key_id", "aws_default_region", "aws_s3_endpoint", "aws_secret_access_key"]
    },
    {
      "uuid": "b2c3d4e5-f6a7-8901-bcde-f01234567891",
      "name": "aws-secret-2",
      "type": "s3",
      "availableKeys": ["aws_access_key_id", "aws_default_region", "aws_s3_endpoint", "aws_secret_access_key"]
    }
  ]
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `uuid` | string | The Kubernetes UID of the secret |
| `name` | string | The name of the secret |
| `type` | string | The storage type that the secret matches (e.g., "s3"), or empty string if it doesn't match any storage type |
| `availableKeys` | string[] | Sorted list of all keys available in the secret (without values) |

## Error Responses

| Status Code | Description |
|-------------|-------------|
| 400 | Bad Request - Missing or invalid parameters |
| 401 | Unauthorized - Missing authentication |
| 403 | Forbidden - User lacks permissions |
| 404 | Not Found - Namespace does not exist |
| 500 | Internal Server Error |

## Examples

### List all secrets in a namespace

```bash
GET /api/v1/secrets?namespace=my-namespace
```

### List storage (AWS) secrets only

```bash
GET /api/v1/secrets?namespace=my-namespace&type=storage
```

### List LLS (Llama Stack) secrets only

```bash
GET /api/v1/secrets?namespace=my-namespace&type=lls
```

Response:
```json
{
  "data": [
    {
      "uuid": "c3d4e5f6-a7b8-9012-cdef-012345678901",
      "name": "llama-stack-secret-1",
      "type": "lls",
      "availableKeys": ["llama_stack_client_api_key", "llama_stack_client_base_url"]
    },
    {
      "uuid": "d4e5f6a7-b8c9-0123-def0-123456789012",
      "name": "llama-stack-secret-2",
      "type": "lls",
      "availableKeys": ["llama_stack_client_api_key", "llama_stack_client_base_url"]
    }
  ]
}
```

## Implementation Details

### Files Created/Modified

1. **internal/models/secret.go** - Secret model definition
2. **internal/repositories/secret.go** - Secret repository with storage type dictionary and filtering logic
3. **internal/repositories/repositories.go** - Added Secret repository to container
4. **internal/integrations/kubernetes/client.go** - Added GetSecrets method to interface
5. **internal/integrations/kubernetes/token_k8s_client.go** - Implemented GetSecrets for token-based client
6. **internal/integrations/kubernetes/internal_k8s_client.go** - Implemented GetSecrets for internal client
7. **internal/api/secrets_handler.go** - HTTP handler implementation
8. **internal/api/app.go** - Registered the route
9. **internal/api/secrets_handler_test.go** - Comprehensive test suite

### Storage Type Configuration

The storage type configuration is defined in `internal/repositories/secret.go`:

```go
var storageTypeRequiredKeys = map[string][]string{
    "s3": {
        "aws_access_key_id",
        "aws_default_region",
        "aws_secret_access_key",
        "aws_s3_endpoint",
    },
    // Future storage types can be added here
}
```

To add a new storage type, simply add an entry to this map with the required keys. No changes to the API or handler code are needed.

### Security

- The endpoint requires authentication via the InjectRequestIdentity middleware
- Permission checks are performed by the Kubernetes client based on the user's token
- Namespace verification ensures the namespace exists before listing secrets
- Only secrets the authenticated user has permission to access are returned

### Filtering Logic

The endpoint supports three filtering modes based on the `type` parameter:

1. **No type (all secrets)**: Returns all secrets in the namespace without filtering

2. **`type=storage`**: Uses a configurable storage type dictionary to filter secrets
   - The dictionary maps storage types (e.g., "s3", "azure", "gcp") to their required keys
   - A secret matches if it contains ALL required keys for at least ONE storage type
   - Currently configured storage types:
     - **S3**: Requires `aws_access_key_id`, `aws_default_region`, `aws_secret_access_key`, `aws_s3_endpoint`
   - Extensible design allows adding new storage types (Azure, GCP, etc.) without API changes

3. **`type=lls`**: Filters for LLS (Llama Stack) secrets
   - A secret matches if it contains ALL required LLS keys
   - Currently configured LLS type:
     - **Llama Stack**: Requires `llama_stack_client_api_key`, `llama_stack_client_base_url`
   - Key matching is case-insensitive

Invalid type values result in a 400 Bad Request error.

**Example**: A secret with the following data would match S3 storage type:
```json
{
  "aws_access_key_id": "AKIAIOSFODNN7EXAMPLE",
  "aws_secret_access_key": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
  "aws_default_region": "us-east-1",
  "aws_s3_endpoint": "https://s3.amazonaws.com"
}
```

A secret missing any of these required keys would NOT match and would be excluded from `type=storage` results.

**Example**: A secret with the following data would match LLS (Llama Stack) type:
```json
{
  "llama_stack_client_api_key": "sk-test-api-key-123",
  "llama_stack_client_base_url": "https://llama-stack.example.com"
}
```

A secret missing any of these required keys would NOT match and would be excluded from `type=lls` results. Key matching is case-insensitive, so `LLAMA_STACK_CLIENT_API_KEY` and `llama_stack_client_api_key` are treated as equivalent.

### Available Keys

The `availableKeys` field exposes the names of all keys present in the secret (but not their values). This allows clients to:
- Determine if a secret has optional parameters
- Validate that required keys are present before using the secret
- Display configuration options to users

**Key characteristics:**
- **Case-preserved**: Keys are returned exactly as they appear in Kubernetes (e.g., `AWS_ACCESS_KEY_ID`, `aws_access_key_id`, `Aws_Access_Key_Id` are all preserved)
- **Sorted alphabetically**: Keys are always returned in alphabetical order for consistency
- **Includes both Data and StringData**: Keys from both `Data` and `StringData` fields are included
- **No duplicates**: If a key appears in both `Data` and `StringData`, it only appears once in the list
- **Empty secrets**: Secrets with no keys return an empty array `[]`

**Example:**
```json
{
  "uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "name": "my-s3-secret",
  "type": "s3",
  "availableKeys": [
    "aws_access_key_id",
    "aws_default_region",
    "aws_s3_bucket",
    "aws_s3_endpoint",
    "aws_secret_access_key"
  ]
}
```

In this example, the secret has an optional `aws_s3_bucket` key in addition to the required S3 keys. Clients can detect this and offer additional configuration options.

## Testing

The implementation includes comprehensive tests covering:
- **Type filtering**:
  - `type=storage`: Successful retrieval with S3 secret filtering, case-insensitive key matching
  - `type=lls`: Successful retrieval with LLS (Llama Stack) secret filtering, case-insensitive key matching
  - No type: Returns all secrets in namespace
  - Invalid type: Returns 400 Bad Request
- **Available keys**:
  - Keys are sorted alphabetically
  - Keys are case-preserved
  - Empty secrets return empty array
  - Keys from both Data and StringData are included
- **Empty result sets**: No matching secrets for different filter types
- **Error cases**: Missing parameters, invalid parameters

Run tests with:
```bash
go test -v ./internal/api -run TestGetSecretsHandler
```

All tests pass successfully.
