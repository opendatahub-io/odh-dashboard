# Secrets Endpoint Documentation

## Overview

This document describes the GET endpoint for listing and filtering Kubernetes secrets in the autorag BFF.

## Endpoint

**GET** `/api/v1/secrets`

## Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `resource` | string | **Yes** | The namespace name to query secrets from |
| `limit` | integer | No | Maximum number of secrets to return (default: all) |
| `offset` | integer | No | Number of secrets to skip for pagination (default: 0) |

## Functionality

The endpoint:
1. Lists all secrets in the specified namespace (resource)
2. Filters secrets to only include those containing an `aws_access_key_id` key in their data
3. Returns the Kubernetes UID and name of each matching secret
4. Supports pagination using `limit` and `offset` parameters
5. Requires authentication via the InjectRequestIdentity middleware

## Response Format

The response follows the envelope pattern:

```json
{
  "data": [
    {
      "uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "name": "aws-secret-1"
    },
    {
      "uuid": "b2c3d4e5-f6a7-8901-bcde-f01234567891",
      "name": "aws-secret-2"
    }
  ]
}
```

## Error Responses

| Status Code | Description |
|-------------|-------------|
| 400 | Bad Request - Missing or invalid parameters |
| 401 | Unauthorized - Missing authentication |
| 403 | Forbidden - User lacks permissions |
| 404 | Not Found - Namespace does not exist |
| 500 | Internal Server Error |

## Examples

### List all AWS secrets in a namespace

```bash
GET /api/v1/secrets?resource=my-namespace
```

### List AWS secrets with pagination

```bash
GET /api/v1/secrets?resource=my-namespace&limit=10&offset=0
```

## Implementation Details

### Files Created/Modified

1. **internal/models/secret.go** - Secret model definition
2. **internal/repositories/secret.go** - Secret repository with filtering and pagination logic
3. **internal/repositories/repositories.go** - Added Secret repository to container
4. **internal/integrations/kubernetes/client.go** - Added GetSecrets method to interface
5. **internal/integrations/kubernetes/token_k8s_client.go** - Implemented GetSecrets for token-based client
6. **internal/integrations/kubernetes/internal_k8s_client.go** - Implemented GetSecrets for internal client
7. **internal/api/secrets_handler.go** - HTTP handler implementation
8. **internal/api/app.go** - Registered the route
9. **internal/api/secrets_handler_test.go** - Comprehensive test suite

### Security

- The endpoint requires authentication via the InjectRequestIdentity middleware
- Permission checks are performed by the Kubernetes client based on the user's token
- Namespace verification ensures the namespace exists before listing secrets
- Only secrets the authenticated user has permission to access are returned

### Filtering Logic

The endpoint filters secrets by checking if the `aws_access_key_id` key exists in the secret's `data` field. Secrets without this key are excluded from the results.

### Pagination

Pagination is implemented at the repository level:
- `limit`: Specifies the maximum number of results to return
- `offset`: Specifies the number of results to skip before returning data
- If `limit` is 0 or not provided, all results after the offset are returned
- If `offset` exceeds the number of available secrets, an empty list is returned

## Testing

The implementation includes comprehensive tests covering:
- Successful retrieval with filtering
- Pagination with various combinations of limit and offset
- Empty result sets (no matching secrets)
- Error cases (missing parameters, invalid parameters)
- Edge cases (offset beyond available data)

Run tests with:
```bash
go test -v ./internal/api -run TestGetSecretsHandler
```
