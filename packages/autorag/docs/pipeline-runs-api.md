# Pipeline Runs API

## Overview

The Pipeline Runs API allows querying Kubeflow Pipeline runs from an auto-discovered Pipeline Server, with support for filtering by pipeline version ID. The Pipeline Server (DSPipelineApplication) is automatically discovered in the specified namespace. This endpoint is designed for AutoRAG to track and manage experiment runs associated with RAG optimization workflows.

## Endpoint

```http
GET /api/v1/pipeline-runs
```

## Authentication

This endpoint requires authentication via the standard authentication method configured for the BFF. By default, the BFF uses `user_token` authentication, which requires a Bearer token in the `Authorization` header.

**Supported Authentication Methods:**
- `user_token` (default): Uses Bearer token from `Authorization` header
- `internal`: Uses the BFF's service account with user identity from `kubeflow-userid` header
- `disabled`: No authentication (for development/testing only)

**Authorization:**
The endpoint enforces RBAC authorization checks to verify that the authenticated user has permission to list DSPipelineApplications in the requested namespace.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `namespace` | query string | Yes | Kubernetes namespace where the Pipeline Server is deployed. The first ready DSPipelineApplication in this namespace will be auto-discovered. |
| `pipelineVersionId` | query string | No | ID of the pipeline version to filter runs by |
| `pageSize` | query integer | No | Number of results per page (default: 20) |
| `nextPageToken` | query string | No | Token for retrieving the next page of results |

## Request Examples

### Basic Request

Get all pipeline runs from the auto-discovered Pipeline Server in a namespace:

```bash
curl -X GET "http://localhost:4000/api/v1/pipeline-runs?namespace=my-namespace" \
  -H "Authorization: Bearer <your-token>"
```

### Filter by Pipeline Version ID

Get pipeline runs for a specific pipeline version:

```bash
curl -X GET "http://localhost:4000/api/v1/pipeline-runs?namespace=my-namespace&pipelineVersionId=22e57c06-030f-4c63-900d-0a808d577899" \
  -H "Authorization: Bearer <your-token>"
```

### With Pagination

Get a specific page of results:

```bash
curl -X GET "http://localhost:4000/api/v1/pipeline-runs?namespace=my-namespace&pageSize=10&nextPageToken=eyJwYWdlIjoyfQ==" \
  -H "Authorization: Bearer <your-token>"
```

### Using Internal Auth Mode

If the BFF is configured with `--auth-method=internal`, use the `kubeflow-userid` header instead:

```bash
curl -X GET "http://localhost:4000/api/v1/pipeline-runs?namespace=my-namespace" \
  -H "kubeflow-userid: user@example.com"
```

## Response Format

The endpoint returns a JSON response with the following structure:

```json
{
  "metadata": {},
  "data": {
    "runs": [
      {
        "run_id": "abc123-def456-ghi789",
        "display_name": "AutoRAG Optimization Run 1",
        "description": "Optimizing RAG parameters for dataset X",
        "experiment_id": "1858af57-f990-4aee-a03e-c93bdfd02eb3",
        "pipeline_version_reference": {
          "pipeline_id": "9e3940d5-b275-4b64-be10-b914cd06c58e",
          "pipeline_version_id": "22e57c06-030f-4c63-900d-0a808d577899"
        },
        "state": "SUCCEEDED",
        "storage_state": "AVAILABLE",
        "service_account": "pipeline-runner-dspa",
        "created_at": "2026-02-24T10:30:00Z",
        "scheduled_at": "2026-02-24T10:30:00Z",
        "finished_at": "2026-02-24T11:15:00Z",
        "state_history": [
          {
            "update_time": "2026-02-24T10:30:00Z",
            "state": "RUNNING"
          },
          {
            "update_time": "2026-02-24T11:15:00Z",
            "state": "SUCCEEDED"
          }
        ]
      }
    ],
    "total_size": 1,
    "next_page_token": ""
  }
}
```

### Response Fields

#### PipelineRun Object

| Field | Type | Description |
|-------|------|-------------|
| `run_id` | string | Unique pipeline run identifier |
| `display_name` | string | Human-readable run name |
| `description` | string | Optional run description |
| `experiment_id` | string | ID of the experiment this run belongs to |
| `pipeline_version_reference` | object | Reference to pipeline and version (see below) |
| `state` | string | Current run state (UNKNOWN, PENDING, RUNNING, SUCCEEDED, SKIPPED, FAILED, ERROR, CANCELED, CANCELING, PAUSED) |
| `storage_state` | string | Storage state of the run (e.g., AVAILABLE) |
| `service_account` | string | Service account used to run the pipeline |
| `created_at` | string | Creation timestamp in ISO 8601 format |
| `scheduled_at` | string | Scheduled timestamp in ISO 8601 format |
| `finished_at` | string | Completion timestamp in ISO 8601 format (if finished) |
| `error` | object | Optional error information if the run failed (contains `code` and `message` fields) |
| `state_history` | array | History of state changes (see below) |

#### PipelineVersionReference Object

| Field | Type | Description |
|-------|------|-------------|
| `pipeline_id` | string | ID of the pipeline |
| `pipeline_version_id` | string | ID of the pipeline version |

#### StateHistory Object

| Field | Type | Description |
|-------|------|-------------|
| `update_time` | string | Timestamp when the state changed (ISO 8601 format) |
| `state` | string | The state at this time |
| `error` | object | Optional error information (if the state change was due to an error) |

#### PipelineRunsData Object

| Field | Type | Description |
|-------|------|-------------|
| `runs` | array | Array of PipelineRun objects |
| `total_size` | integer | Total number of runs matching the filter |
| `next_page_token` | string | Token for retrieving the next page (empty if no more pages) |

## Pipeline Filtering

The API allows filtering pipeline runs by pipeline version ID, which enables you to retrieve runs for a specific pipeline version.

### Filtering by Pipeline Version ID

When you provide a `pipelineVersionId` parameter, the API filters runs to only include those associated with that specific pipeline version. If no filter is provided, all runs from the auto-discovered Pipeline Server are returned.

**Note:** Filtering by pipeline ID (without version) is not supported by the Kubeflow Pipelines v2beta1 API. You must specify the pipeline version ID to filter runs.

## Error Responses

### 400 Bad Request

Returned when:
- Required parameters are missing
- Invalid parameter values

```json
{
  "code": "BAD_REQUEST",
  "message": "missing required query parameter: namespace"
}
```

### 401 Unauthorized

Returned when authentication fails or is missing.

### 403 Forbidden

Returned when the authenticated user does not have permission to access pipeline servers in the specified namespace.

```json
{
  "code": "FORBIDDEN",
  "message": "user does not have permission to access pipeline servers in this namespace"
}
```

### 404 Not Found

Returned when no ready Pipeline Server (DSPipelineApplication) is found in the specified namespace.

### 500 Internal Server Error

Returned when:
- Pipeline Server API is unavailable
- Internal processing error occurs
- RBAC permission check fails

### 503 Service Unavailable

Returned when no ready Pipeline Server is found in the namespace (Pipeline Server exists but is not ready).

## Development Mode

For local development and testing, you can use mock mode to return sample data without connecting to a real Pipeline Server.

### Running with Mock Data

```bash
cd packages/autorag/bff
make run MOCK_PIPELINE_SERVER_CLIENT=true
```

Or using the flag directly:

```bash
go run cmd/main.go --mock-pipeline-server-client
```

**Note:** When using mock mode (`--mock-k8s-client` or `--mock-pipeline-server-client`), the BFF automatically sets the auth method to `disabled` for easier testing, unless you explicitly override it with `--auth-method`.

### Mock Data

Mock mode returns 3 sample pipeline runs with various states:

1. **Succeeded Run** - Completed optimization run with `exp-123` experiment ID
2. **Running Run** - Currently executing run with `exp-456` experiment ID
3. **Failed Run** - Failed baseline run with `exp-123` experiment ID

## Production Deployment

In production, the BFF will automatically:

1. Enforce RBAC authorization to verify users can access pipeline servers in the requested namespace
2. Auto-discover the first ready Pipeline Server (DSPipelineApplication) in the namespace
3. Extract the Pipeline Server API URL from the DSPipelineApplication status
4. Establish secure TLS connections to the Pipeline Server API
5. Forward the user's authentication token to the Pipeline Server
6. Apply proper error handling and retries

### Pipeline Server Auto-Discovery

The BFF automatically discovers Pipeline Servers in the requested namespace:

1. **RBAC Pre-check**: Verifies the user has permission to list DSPipelineApplications in the namespace
2. **Discovery**: Queries all DSPipelineApplications in the namespace
3. **Ready Check**: Finds the first DSPA with `APIServerReady` condition set to `True`
4. **URL Extraction**: Reads the API URL from `status.components.apiServer.url`
5. **Fallback**: If the status URL is not set, constructs URL using pattern: `https://ds-pipeline-{name}.{namespace}.svc.cluster.local:8443`

This auto-discovery approach:
- Eliminates the need for clients to know the Pipeline Server name
- Ensures only ready Pipeline Servers are used
- Respects Kubernetes RBAC permissions
- Works across different cluster configurations

## Integration with AutoRAG Frontend

The AutoRAG frontend can use this endpoint to:

1. List all runs for a specific pipeline version
2. Display run status and results
3. Implement pagination for large result sets
4. Access run state history and metadata

### Example Frontend Integration

```javascript
async function fetchPipelineRuns(namespace, pipelineVersionId, token) {
  const params = new URLSearchParams({
    namespace,
    pageSize: "20"
  });

  // Add pipeline version ID filter if provided
  if (pipelineVersionId) {
    params.append("pipelineVersionId", pipelineVersionId);
  }

  const response = await fetch(`/api/v1/pipeline-runs?${params}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  const data = await response.json();
  return data.data.runs;
}
```

## Troubleshooting

### 403 Forbidden - Permission Denied

If you receive a 403 error:
1. Verify the user has permission to list DSPipelineApplications in the namespace:
   ```bash
   kubectl auth can-i list datasciencepipelinesapplications.datasciencepipelinesapplications.opendatahub.io -n <namespace> --as=<user>
   ```
2. Check user's RBAC roles and role bindings in the namespace
3. Ensure the user is a member of the correct groups

### 404 Not Found - No Pipeline Server

If you receive a 404 error:
1. Verify a DSPipelineApplication exists in the namespace:
   ```bash
   kubectl get dspipelineapplication -n <namespace>
   ```
2. Check if the DSPA has `APIServerReady` condition set to `True`:
   ```bash
   kubectl get dspipelineapplication -n <namespace> -o jsonpath='{.items[*].status.conditions[?(@.type=="APIServerReady")]}'
   ```
3. Check BFF logs for discovery details

### 503 Service Unavailable - Pipeline Server Not Ready

If you receive a 503 error:
1. A Pipeline Server exists but is not ready
2. Check the DSPA status and conditions:
   ```bash
   kubectl describe dspipelineapplication -n <namespace>
   ```
3. Wait for the Pipeline Server to become ready

### No Runs Returned

If the endpoint returns an empty array:
1. Check that runs exist for the specified pipeline version ID (if filtering)
2. Verify the pipeline version exists in the Pipeline Server
3. Check the Pipeline Server API directly for runs

### Connection Errors

If you receive 500 errors:
1. Verify the Pipeline Server is running and ready
2. Check BFF logs for connection details and errors
3. Verify network policies allow traffic between the BFF and Pipeline Server
4. Check if the Pipeline Server API URL is correctly set in the DSPA status

### Authentication Errors

If you receive 401 errors:
1. Verify the `Authorization: Bearer <token>` header is set correctly (for `user_token` auth)
2. Or verify the `kubeflow-userid` header is set correctly (for `internal` auth)
3. Check that the token is valid and not expired
4. Ensure the BFF authentication method is configured correctly

## See Also

- [Kubeflow Pipelines API Reference](https://www.kubeflow.org/docs/components/pipelines/reference/api/kubeflow-pipeline-api-spec/)
- [AutoRAG Architecture Documentation](./README.md)
- [BFF Extensions Guide](../bff/docs/extensions.md)
