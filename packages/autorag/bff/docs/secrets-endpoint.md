# Secrets Endpoint Documentation

## Overview

This document describes the GET endpoint for listing and filtering Kubernetes secrets in the autorag BFF.

## Endpoint

**GET** `/api/v1/secrets`

## Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `resource` | string | **Yes** | The namespace name to query secrets from |
| `type` | string | No | Secret type filter: `storage` for AWS secrets, `lls` for LLS secrets, or omit for all secrets |
| `limit` | integer | No | Maximum number of secrets to return (default: all) |
| `offset` | integer | No | Number of secrets to skip for pagination (default: 0) |

## Functionality

The endpoint:
1. Lists secrets in the specified namespace (resource)
2. Filters secrets based on the `type` parameter:
   - **No type** (or empty): Returns all secrets in the namespace
   - **`type=storage`**: Filters for storage secrets matching any configured storage type (currently supports S3)
   - **`type=lls`**: Returns empty list (placeholder for future LLS implementation)
3. Returns the Kubernetes UID, name, and storage type of each matching secret
   - The `type` field indicates which storage type the secret matches (e.g., "s3")
   - If a secret doesn't match any storage type, the `type` field is an empty string
   - If a secret matches multiple storage types, the first matching type is returned
4. Supports pagination using `limit` and `offset` parameters for all filter types
5. Requires authentication via the InjectRequestIdentity middleware
6. Validates the `type` parameter and returns 400 Bad Request for invalid values

### Storage Type Filtering

Storage secrets are filtered using a configurable dictionary of storage types and their required keys. A secret must contain **ALL** required keys for at least one storage type to be included in the results.

**Currently Supported Storage Types:**

| Storage Type | Required Keys |
|--------------|---------------|
| **S3** | `aws_access_key_id`, `aws_region_name`, `aws_secret_access_key`, `endpoint_url` |

**Future storage types** (e.g., Azure, GCP) can be easily added to the configuration without changing the API.

## Response Format

The response follows the envelope pattern:

```json
{
  "data": [
    {
      "uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "name": "aws-secret-1",
      "type": "s3"
    },
    {
      "uuid": "b2c3d4e5-f6a7-8901-bcde-f01234567891",
      "name": "aws-secret-2",
      "type": "s3"
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
GET /api/v1/secrets?resource=my-namespace
```

### List storage (AWS) secrets only

```bash
GET /api/v1/secrets?resource=my-namespace&type=storage
```

### List LLS secrets (currently returns empty)

```bash
GET /api/v1/secrets?resource=my-namespace&type=lls
```

### List secrets with pagination

```bash
GET /api/v1/secrets?resource=my-namespace&limit=10&offset=0
```

### List storage secrets with pagination

```bash
GET /api/v1/secrets?resource=my-namespace&type=storage&limit=10&offset=0
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
        "aws_region_name",
        "aws_secret_access_key",
        "endpoint_url",
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
     - **S3**: Requires `aws_access_key_id`, `aws_region_name`, `aws_secret_access_key`, `endpoint_url`
   - Extensible design allows adding new storage types (Azure, GCP, etc.) without API changes

3. **`type=lls`**: Currently returns an empty list. This is a placeholder for future LLS (Large Language Service) secret filtering implementation.

Invalid type values result in a 400 Bad Request error.

**Example**: A secret with the following data would match S3 storage type:
```json
{
  "aws_access_key_id": "AKIAIOSFODNN7EXAMPLE",
  "aws_secret_access_key": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
  "aws_region_name": "us-east-1",
  "endpoint_url": "https://s3.amazonaws.com"
}
```

A secret missing any of these required keys would NOT match and would be excluded from `type=storage` results.

### Pagination

Pagination is implemented at the repository level:
- `limit`: Specifies the maximum number of results to return
- `offset`: Specifies the number of results to skip before returning data
- If `limit` is 0 or not provided, all results after the offset are returned
- If `offset` exceeds the number of available secrets, an empty list is returned

## Testing

The implementation includes comprehensive tests covering:
- **Type filtering**:
  - `type=storage`: Successful retrieval with AWS secret filtering
  - No type: Returns all secrets in namespace
  - `type=lls`: Returns empty list
  - Invalid type: Returns 400 Bad Request
- **Pagination**: Various combinations of limit and offset for all filter types
- **Empty result sets**: No matching secrets for different filter types
- **Error cases**: Missing parameters, invalid parameters
- **Edge cases**: Offset beyond available data

Run tests with:
```bash
go test -v ./internal/api -run TestGetSecretsHandler
```

All 10 test cases pass successfully.
