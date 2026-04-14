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
   - The `type` field is determined by:
     1. **First priority**: The `opendatahub.io/connection-type` annotation if present and non-empty
     2. **Fallback**: Key-based type detection (e.g., "s3", "lls")
   - If a secret doesn't match any known type and has no connection-type annotation, the `type` field is omitted from the response
   - If a secret matches multiple types via key detection, the first matching type is returned
4. Requires authentication via the InjectRequestIdentity middleware
5. Validates the `type` parameter and returns 400 Bad Request for invalid values

### Secret Type Filtering

Secrets are filtered using configurable dictionaries of secret types and their required keys. A secret must contain **ALL** required keys for a type to be included in the results. Key matching is **case-sensitive**; keys must be uppercase.

**Currently Supported Storage Types:**

| Storage Type | Required Keys |
|--------------|---------------|
| **S3** | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_ENDPOINT` |

**Future storage types** (e.g., Azure, GCP) can be easily added to the configuration without changing the API.

**Currently Supported LLS Types:**

| LLS Type | Required Keys |
|----------|---------------|
| **Llama Stack** | `LLAMA_STACK_CLIENT_API_KEY`, `LLAMA_STACK_CLIENT_BASE_URL` |

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
        "AWS_S3_BUCKET": "my-production-bucket"
      },
      "displayName": "Production S3 Bucket"
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
| `type` | string | **(Optional)** The returned connection type: either a non-empty `opendatahub.io/connection-type` annotation value or a detected built-in type (e.g., "s3", "lls"). Omitted from the response only when neither is available. |
| `data` | object | Object mapping all keys available in the secret to their values. Most values are sanitized as `"[REDACTED]"` for security. Only specific allowed keys (currently: `AWS_S3_BUCKET`) return their actual values. Use `Object.keys()` to validate that additional optional keys required for your use case are present. |
| `displayName` | string | **(Optional)** Human-readable display name from the `openshift.io/display-name` annotation. Omitted from response if annotation doesn't exist. |
| `description` | string | **(Optional)** Human-readable description from the `openshift.io/description` annotation. Omitted from response if annotation doesn't exist. |

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
      "data": {
        "LLAMA_STACK_CLIENT_API_KEY": "[REDACTED]",
        "LLAMA_STACK_CLIENT_BASE_URL": "[REDACTED]"
      },
      "displayName": "Development LLS"
    },
    {
      "uuid": "d4e5f6a7-b8c9-0123-def0-123456789012",
      "name": "llama-stack-secret-2",
      "type": "lls",
      "data": {
        "LLAMA_STACK_CLIENT_API_KEY": "[REDACTED]",
        "LLAMA_STACK_CLIENT_BASE_URL": "[REDACTED]"
      }
    }
  ]
}
```

**Note:** The first secret includes a `displayName` field because it has the `openshift.io/display-name` annotation, while the second secret omits this field as it lacks the annotation.

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
        "AWS_ACCESS_KEY_ID",
        // Region is currently not enforced by common connections ui so we need to handle it as an additionalRequiredKeys in frontend
        // "AWS_DEFAULT_REGION",
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
    // Implementation handles case-sensitive matching for classification keys
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

### Filtering Logic

The endpoint supports three filtering modes based on the `type` parameter:

1. **No type (all secrets)**: Returns all secrets in the namespace without filtering

2. **`type=storage`**: Uses a configurable storage type dictionary to filter secrets
   - The dictionary maps storage types (e.g., "s3", "azure", "gcp") to their required keys
   - A secret matches if it contains ALL required keys for at least ONE storage type
   - Currently configured storage types:
     - **S3**: Requires `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_ENDPOINT`
     - `AWS_DEFAULT_REGION` is **not** a BFF-level classification key because the common connections UI does not enforce it. Instead, it is surfaced as a frontend `additionalRequiredKey` so users are warned when it is missing from their selected secret.
   - Extensible design allows adding new storage types (Azure, GCP, etc.) without API changes
   - Key matching is case-sensitive; keys must be uppercase

3. **`type=lls`**: Filters for LLS (Llama Stack) secrets
   - A secret matches if it contains ALL required LLS keys
   - Currently configured LLS type:
     - **Llama Stack**: Requires `LLAMA_STACK_CLIENT_API_KEY`, `LLAMA_STACK_CLIENT_BASE_URL`
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

A secret missing any of these required keys would NOT match and would be excluded from `type=storage` results. Note that `AWS_DEFAULT_REGION` is not required for BFF-level S3 type detection; its presence is validated on the frontend side via `additionalRequiredKeys`.

**Example**: A secret with the following data would match LLS (Llama Stack) type:
```json
{
  "LLAMA_STACK_CLIENT_API_KEY": "sk-test-api-key-123",
  "LLAMA_STACK_CLIENT_BASE_URL": "https://llama-stack.example.com"
}
```

A secret missing any of these required keys would NOT match and would be excluded from `type=lls` results. Key matching is case-sensitive — keys must be uppercase (e.g., `LLAMA_STACK_CLIENT_API_KEY`).

### Secret Data Field

The `data` field exposes an object mapping all keys present in the secret to their values. For security, most values are sanitized as `"[REDACTED]"`, with only specific allowed keys returning their actual values.

**Allowed keys (returning actual values):**
- `AWS_S3_BUCKET` (case-sensitive, uppercase)

**Key characteristics:**
- **Object format**: Returns a `Record<string, string>` mapping keys to values
- **Case-preserved**: Keys are returned exactly as they appear in Kubernetes (e.g., `AWS_ACCESS_KEY_ID`, `aws_access_key_id`, `Aws_Access_Key_Id` are all preserved)
- **Sanitized values**: Most values are `"[REDACTED]"` for security
- **Selective exposure**: Only allowed keys (currently `AWS_S3_BUCKET`) return actual values
- **Includes both Data and StringData**: Keys from both `Data` and `StringData` fields are included
- **No duplicates**: If a key appears in both `Data` and `StringData`, it only appears once in the object
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
    "AWS_S3_BUCKET": "my-bucket-name",
    "AWS_S3_ENDPOINT": "[REDACTED]",
    "AWS_SECRET_ACCESS_KEY": "[REDACTED]"
  }
}
```

In this example:
- The secret has an optional `AWS_S3_BUCKET` key in addition to the required S3 keys
- The `AWS_S3_BUCKET` value is exposed (`"my-bucket-name"`) because it's in the allowed list
- All other keys have sanitized values (`"[REDACTED]"`)
- Clients can use `Object.keys(data)` to determine which keys are present and offer additional configuration options

### Connection Type Annotation

The `type` field can be explicitly set using the `opendatahub.io/connection-type` annotation on a secret. This provides a way to:

- **Override key-based detection**: Explicitly specify the connection type regardless of the secret's keys
- **Support custom types**: Define connection types that aren't covered by the built-in key-based detection
- **Ensure consistency**: Guarantee the correct type is returned even if keys change

**Type determination priority:**
1. **Annotation-based** (highest priority): If the secret has the `opendatahub.io/connection-type` annotation with a non-empty value, use that value as the type
2. **Key-based detection** (fallback): If no annotation is present or it's empty, analyze the secret's keys to determine the type

**Example secret with connection-type annotation:**
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: my-database-connection
  annotations:
    opendatahub.io/connection-type: "postgresql"
data:
  db_host: ...
  db_password: ...
```

**Corresponding API response:**
```json
{
  "uuid": "...",
  "name": "my-database-connection",
  "type": "postgresql",
  "data": {
    "db_host": "[REDACTED]",
    "db_password": "[REDACTED]"
  }
}
```

Even if the secret contains keys that would normally match S3 or LLS detection, the annotation takes precedence and the type will be set to the annotation value.

### Display Name and Description

The optional `displayName` and `description` fields provide human-readable metadata for secrets through OpenShift annotations.

**Display Name (`openshift.io/display-name`)**:
- **Is optional**: Only included in the response if the secret has the annotation
- **Uses `omitempty`**: Field is omitted from JSON when the annotation doesn't exist
- **Provides user-friendly names**: Allows administrators to set meaningful names for secrets that are displayed in UIs

**Description (`openshift.io/description`)**:
- **Is optional**: Only included in the response if the secret has the annotation
- **Uses `omitempty`**: Field is omitted from JSON when the annotation doesn't exist
- **Provides context**: Allows administrators to add detailed descriptions explaining the secret's purpose

**Example secret with both display name and description annotations:**
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: my-s3-credentials
  annotations:
    openshift.io/display-name: "Production S3 Bucket"
    openshift.io/description: "Main S3 bucket for production data storage and backups"
data:
  aws_access_key_id: ...
  aws_secret_access_key: ...
```

**Corresponding API response:**
```json
{
  "uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "name": "my-s3-credentials",
  "type": "s3",
  "data": {
    "AWS_ACCESS_KEY_ID": "[REDACTED]",
    "AWS_SECRET_ACCESS_KEY": "[REDACTED]",
    "AWS_S3_BUCKET": "production-bucket"
  },
  "displayName": "Production S3 Bucket",
  "description": "Main S3 bucket for production data storage and backups"
}
```

**Secret without display name or description annotations:**
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: my-other-secret
data:
  password: ...
```

**Corresponding API response (type, displayName, and description omitted):**
```json
{
  "uuid": "b2c3d4e5-f6a7-8901-bcde-f01234567891",
  "name": "my-other-secret",
  "data": {
    "password": "[REDACTED]"
  }
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
  - `type=lls`: Successful retrieval with LLS (Llama Stack) secret filtering, case-sensitive key matching
  - No type: Returns all secrets in namespace
  - Invalid type: Returns 400 Bad Request
- **Secret data field**:
  - Data is returned as an object mapping keys to values
  - Keys are case-preserved
  - Most values are sanitized as `"[REDACTED]"`
  - Allowed keys (e.g., `AWS_S3_BUCKET`) return actual values
  - Empty secrets return empty object `{}`
  - Keys from both Data and StringData are included
- **Display name**:
  - Secrets with `openshift.io/display-name` annotation include displayName field
  - Secrets without annotation omit displayName field
  - Mixed scenarios with some secrets having annotation and others not
- **Description**:
  - Secrets with `openshift.io/description` annotation include description field
  - Secrets without annotation omit description field
  - Mixed scenarios with some secrets having annotation and others not
  - Secrets with both displayName and description annotations
- **Connection type annotation**:
  - Annotation overrides key-based detection
  - Falls back to key-based detection when annotation is missing
  - Empty annotation values trigger fallback to key-based detection
  - Mixed scenarios with annotated and non-annotated secrets
- **Empty result sets**: No matching secrets for different filter types
- **Error cases**: Missing parameters, invalid parameters

Run tests with:
```bash
go test -v ./internal/api -run TestGetSecretsHandler
```

All tests pass successfully.
