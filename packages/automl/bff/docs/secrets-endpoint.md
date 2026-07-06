# Secrets Endpoint Documentation

## Overview

This document describes the GET endpoint for listing and filtering Kubernetes secrets in the automl BFF.

## Endpoint

**GET** `/api/v1/secrets`

## Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `namespace` | string | **Yes** | The namespace name to query secrets from |
| `type` | string | No | Secret type filter: `storage` for storage secrets (e.g., S3), or omit for all secrets |

## Functionality

The endpoint:
1. Lists secrets in the specified namespace
2. Filters secrets based on the `type` parameter:
   - **No type** (or empty): Returns all secrets in the namespace
   - **`type=storage`**: Filters for storage secrets matching any configured storage type (currently supports S3)
3. Returns detailed information for each matching secret:
   - **UID and name**: Kubernetes unique identifier and secret name
   - **Type detection**: Determined by either:
     1. The `opendatahub.io/connection-type` annotation (if present)
     2. Key-based detection matching required keys (e.g., "s3" for S3 secrets)
     3. Empty string if no type matches
   - **Data with redaction**: Map of all secret keys with values
     - Allowed keys (currently: `AWS_S3_BUCKET`) return actual values
     - All other keys return `"[REDACTED]"` for security
   - **Metadata**: Display name and description from OpenShift annotations (if present)
4. Requires authentication via the InjectRequestIdentity middleware
5. Validates the `type` parameter and returns 400 Bad Request for invalid values

### Secret Type Detection and Filtering

Secret type is determined using a two-step process:

1. **Annotation-based detection** (primary): If the secret has an `opendatahub.io/connection-type` annotation, its value is used as the type
2. **Key-based detection** (fallback): If no annotation exists, the secret is classified based on required keys

For key-based detection, a secret must contain **ALL** required keys for a type to be classified. Key matching is **case-sensitive**; keys must be uppercase.

**Currently Supported Storage Types:**

| Storage Type | Required Keys (for key-based detection) |
|--------------|------------------------------------------|
| **S3** | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_ENDPOINT` |

**Future storage types** (e.g., Azure, GCP) can be easily added to the configuration without changing the API.

## Response Format

The response follows the envelope pattern:

```json
{
  "data": [
    {
      "uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "name": "aws-secret-1",
      "type": "s3",
      "data": {
        "AWS_ACCESS_KEY_ID": "[REDACTED]",
        "AWS_DEFAULT_REGION": "[REDACTED]",
        "AWS_S3_ENDPOINT": "[REDACTED]",
        "AWS_SECRET_ACCESS_KEY": "[REDACTED]",
        "AWS_S3_BUCKET": "my-training-data"
      },
      "displayName": "Production S3 Storage",
      "description": "S3 bucket for production training datasets"
    },
    {
      "uuid": "b2c3d4e5-f6a7-8901-bcde-f01234567891",
      "name": "aws-secret-2",
      "type": "s3",
      "data": {
        "AWS_ACCESS_KEY_ID": "[REDACTED]",
        "AWS_DEFAULT_REGION": "[REDACTED]",
        "AWS_S3_ENDPOINT": "[REDACTED]",
        "AWS_SECRET_ACCESS_KEY": "[REDACTED]"
      }
    }
  ]
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `uuid` | string | The Kubernetes UID of the secret |
| `name` | string | The name of the secret |
| `type` | string | The detected type (from annotation or key-based detection, e.g., "s3"), or empty string if it doesn't match any type |
| `data` | object | Map of all secret keys with values. Allowed keys (currently: `AWS_S3_BUCKET`) show actual values; all others show `"[REDACTED]"` |
| `displayName` | string (optional) | Display name from `openshift.io/display-name` annotation |
| `description` | string (optional) | Description from `openshift.io/description` annotation |

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


## Implementation Details

### Files Created/Modified

1. **internal/models/secret.go** - Secret model definition with data, displayName, and description fields
2. **internal/repositories/secret.go** - Secret repository with storage type dictionary, filtering logic, annotation detection, and data redaction
3. **internal/constants/secrets.go** - Allowed secret keys configuration for data redaction
4. **internal/repositories/repositories.go** - Added Secret repository to container
5. **internal/integrations/kubernetes/client.go** - Added GetSecrets method to interface
6. **internal/integrations/kubernetes/token_k8s_client.go** - Implemented GetSecrets for token-based client
7. **internal/integrations/kubernetes/internal_k8s_client.go** - Implemented GetSecrets for internal client
8. **internal/api/secrets_handler.go** - HTTP handler implementation
9. **internal/api/app.go** - Registered the route
10. **internal/api/secrets_handler_test.go** - Comprehensive test suite

### Storage Type Configuration

The storage type configuration is defined in `internal/repositories/secret.go`:

```go
var storageTypeRequiredKeys = map[string][]string{
    "s3": {
        "AWS_ACCESS_KEY_ID",
        "AWS_SECRET_ACCESS_KEY",
        "AWS_S3_ENDPOINT",
    },
    // Future storage types can be added here
}
```

To add a new storage type, simply add an entry to this map with the required keys. No changes to the API or handler code are needed.

### Allowed Keys Configuration

The allowed keys configuration (keys whose values are not redacted) is defined in `internal/constants/secrets.go`:

```go
// allowedSecretKeys is unexported to prevent external modification
var allowedSecretKeys = []string{
    AllowedSecretKey_AWS_S3_Bucket, // "AWS_S3_BUCKET"
}

// IsAllowedSecretKey checks if a given key is in the allowed list
func IsAllowedSecretKey(key string) bool {
    // Implementation handles case-sensitive matching
}
```

To allow a new key to be exposed to clients:
1. Add a constant in `internal/constants/secrets.go` (e.g., `AllowedSecretKey_MyNewKey`)
2. Add it to the `allowedSecretKeys` slice
3. The key will automatically return its actual value instead of `"[REDACTED]"`

Key matching is case-sensitive via the `IsAllowedSecretKey()` function. Keys must be uppercase (e.g., `AWS_S3_BUCKET`).

### Security

- The endpoint requires authentication via the InjectRequestIdentity middleware
- Permission checks are performed by the Kubernetes client based on the user's token
- Namespace verification ensures the namespace exists before listing secrets
- Only secrets the authenticated user has permission to access are returned
- **Data redaction**: Sensitive secret values are redacted with `"[REDACTED]"` by default
  - Only keys in the allowed list (defined in `internal/constants/secrets.go`) return actual values
  - Currently allowed: `AWS_S3_BUCKET` (non-sensitive configuration)
  - All credential keys (access keys, passwords, tokens) are always redacted

### Filtering Logic

The endpoint supports two filtering modes based on the `type` parameter:

1. **No type (all secrets)**: Returns all secrets in the namespace
   - Each secret's type is determined by annotation or key-based detection

2. **`type=storage`**: Filters for storage secrets using either:
   - **Annotation-based**: Secrets with `opendatahub.io/connection-type` annotation matching a storage type
   - **Key-based**: Secrets containing ALL required keys for at least ONE storage type
   - The dictionary maps storage types (e.g., "s3", "azure", "gcp") to their required keys
   - Currently configured storage types:
     - **S3**: Requires `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_ENDPOINT`
   - Extensible design allows adding new storage types (Azure, GCP, etc.) without API changes
   - Key matching is case-sensitive; keys must be uppercase

Invalid type values result in a 400 Bad Request error.

**Example**: A secret with the following data would match S3 storage type:
```json
{
  "AWS_ACCESS_KEY_ID": "AKIAIOSFODNN7EXAMPLE",
  "AWS_SECRET_ACCESS_KEY": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
  "AWS_S3_ENDPOINT": "https://s3.amazonaws.com"
}
```

A secret missing any of these required keys would NOT match and would be excluded from `type=storage` results. Note that `AWS_DEFAULT_REGION` is not required for BFF-level S3 type detection; it is validated as a frontend `additionalRequiredKey` instead.

### Data and Security Redaction

The `data` field exposes all keys present in the secret along with their values, but applies security redaction to protect sensitive information. This allows clients to:
- Determine if a secret has optional parameters by checking for specific keys
- Access non-sensitive configuration values (like bucket names)
- Validate that required keys are present before using the secret
- Display safe configuration options to users

**Security Behavior:**
- **Allowed keys** return their actual values
  - Currently allowed: `AWS_S3_BUCKET`
  - Defined in `internal/constants/secrets.go`
- **All other keys** return `"[REDACTED]"` to protect sensitive credentials
- **Key matching** is case-sensitive; keys must be uppercase
- **Key names** are case-preserved as they appear in Kubernetes
- **Both Data and StringData** fields are included
- **No duplicates**: If a key appears in both fields, it appears once with preference to Data
- **Empty secrets**: Secrets with no keys return an empty object `{}`

**Example:**
```json
{
  "uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "name": "my-s3-secret",
  "type": "s3",
  "data": {
    "AWS_ACCESS_KEY_ID": "[REDACTED]",
    "AWS_DEFAULT_REGION": "[REDACTED]",
    "AWS_S3_BUCKET": "my-training-data",
    "AWS_S3_ENDPOINT": "[REDACTED]",
    "AWS_SECRET_ACCESS_KEY": "[REDACTED]"
  }
}
```

In this example, the secret has an optional `AWS_S3_BUCKET` key in addition to the required S3 keys. The bucket name is returned (allowed key) while credentials are redacted. Clients can detect the bucket presence and use its value for configuration.

### Metadata Annotations

Secrets can include metadata from OpenShift annotations:

- **`displayName`**: Extracted from `openshift.io/display-name` annotation
  - Provides a human-friendly name for UI display
  - Optional field, only present if annotation exists

- **`description`**: Extracted from `openshift.io/description` annotation
  - Provides additional context about the secret's purpose
  - Optional field, only present if annotation exists

**Example with metadata:**
```json
{
  "uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "name": "prod-s3-storage",
  "type": "s3",
  "data": {
    "AWS_ACCESS_KEY_ID": "[REDACTED]",
    "AWS_SECRET_ACCESS_KEY": "[REDACTED]",
    "AWS_DEFAULT_REGION": "[REDACTED]",
    "AWS_S3_ENDPOINT": "[REDACTED]",
    "AWS_S3_BUCKET": "production-datasets"
  },
  "displayName": "Production S3 Storage",
  "description": "S3 bucket for production ML training datasets"
}
```

## S3 Endpoint Security

Secrets containing S3 credentials (`type=s3`) are subject to additional security validation when used with S3 endpoints. The `AWS_S3_ENDPOINT` field must comply with SSRF protection requirements:

- ✅ HTTPS-only (no HTTP)
- ✅ No private IP addresses (RFC-1918)
- ✅ No loopback addresses (127.0.0.0/8)
- ✅ No link-local addresses (169.254.0.0/16)
- ✅ Valid URL format

For complete details on S3 endpoint security validation, see [s3-endpoint-security.md](./s3-endpoint-security.md).

## Testing

The implementation includes comprehensive tests covering:
- **Type filtering**:
  - `type=storage`: Successful retrieval with S3 secret filtering, case-sensitive key matching
  - No type: Returns all secrets in namespace
  - Invalid type: Returns 400 Bad Request
- **Type detection**:
  - Annotation-based detection using `opendatahub.io/connection-type`
  - Key-based fallback detection
  - Annotation takes precedence over key-based detection
- **Data redaction**:
  - Allowed keys (e.g., `AWS_S3_BUCKET`) return actual values
  - All other keys return `"[REDACTED]"`
  - Case-sensitive matching for allowed keys
  - Keys are case-preserved in output
  - Keys from both Data and StringData are included
  - Empty secrets return empty object `{}`
- **Metadata extraction**:
  - `displayName` extracted from `openshift.io/display-name` annotation
  - `description` extracted from `openshift.io/description` annotation
  - Optional fields only present when annotations exist
- **Empty result sets**: No matching secrets for storage filter type
- **Error cases**: Missing parameters, invalid parameters

Run tests with:
```bash
go test -v ./internal/api -run TestGetSecretsHandler
```

All tests pass successfully.
