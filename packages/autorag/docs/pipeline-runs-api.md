# Pipeline Runs API

## Overview

The Pipeline Runs API allows querying Kubeflow Pipeline runs from a specific Pipeline Server, with support for filtering by pipeline ID. This endpoint is designed for AutoRAG to track and manage experiment runs associated with RAG optimization workflows.

## Endpoint

```
GET /api/v1/pipeline-runs
```

## Authentication

This endpoint requires authentication via the standard authentication method configured for the BFF (either `internal` or `user_token`).

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `namespace` | query string | Yes | Kubernetes namespace where the Pipeline Server is deployed |
| `pipelineServerId` | query string | Yes | ID/name of the Pipeline Server (DSPipelineApplication CR name) |
| `pipelineId` | query string | No | ID of the pipeline to filter runs by |
| `pageSize` | query integer | No | Number of results per page (default: 20) |
| `nextPageToken` | query string | No | Token for retrieving the next page of results |

## Request Examples

### Basic Request

Get all pipeline runs from a Pipeline Server:

```bash
curl -X GET "http://localhost:4000/api/v1/pipeline-runs?namespace=my-namespace&pipelineServerId=dspa" \
  -H "kubeflow-userid: user@example.com"
```

### Filter by Pipeline ID

Get pipeline runs for a specific pipeline:

```bash
curl -X GET "http://localhost:4000/api/v1/pipeline-runs?namespace=my-namespace&pipelineServerId=dspa&pipelineId=a1b2c3d4-e5f6-7890-abcd-ef1234567890" \
  -H "kubeflow-userid: user@example.com"
```

### With Pagination

Get a specific page of results:

```bash
curl -X GET "http://localhost:4000/api/v1/pipeline-runs?namespace=my-namespace&pipelineServerId=dspa&pageSize=10&nextPageToken=eyJwYWdlIjoyfQ==" \
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
        "pipeline_version_id": "pipeline-v1",
        "state": "SUCCEEDED",
        "created_at": "2026-02-24T10:30:00Z",
        "finished_at": "2026-02-24T11:15:00Z"
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
| `pipeline_version_id` | string | ID of the pipeline version used |
| `state` | string | Current run state (UNKNOWN, PENDING, RUNNING, SUCCEEDED, SKIPPED, FAILED, ERROR, CANCELED, CANCELING, PAUSED) |
| `created_at` | string | Creation timestamp in ISO 8601 format |
| `finished_at` | string | Completion timestamp in ISO 8601 format (if finished) |

#### PipelineRunsData Object

| Field | Type | Description |
|-------|------|-------------|
| `runs` | array | Array of PipelineRun objects |
| `total_size` | integer | Total number of runs matching the filter |
| `next_page_token` | string | Token for retrieving the next page (empty if no more pages) |

## Pipeline Filtering

The API allows filtering pipeline runs by pipeline ID, which enables you to retrieve runs for a specific pipeline definition.

### Filtering by Pipeline ID

When you provide a `pipelineId` parameter, the API filters runs to only include those associated with that specific pipeline. If no pipeline ID is provided, all runs from the Pipeline Server are returned.

## Error Responses

### 400 Bad Request

Returned when:
- Required parameters are missing
- Pipeline Server client cannot be created

```json
{
  "code": "BAD_REQUEST",
  "message": "missing required parameter: pipelineServerId"
}
```

### 401 Unauthorized

Returned when authentication fails or is missing.

### 404 Not Found

Returned when the specified Pipeline Server does not exist.

### 500 Internal Server Error

Returned when:
- Pipeline Server API is unavailable
- Internal processing error occurs

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

### Mock Data

Mock mode returns 3 sample pipeline runs with various states and annotations:

1. **Succeeded Run** - Completed optimization run with `exp-123` experiment ID
2. **Running Run** - Currently executing run with `exp-456` experiment ID
3. **Failed Run** - Failed baseline run with `exp-123` experiment ID

## Production Deployment

In production, the BFF will automatically:

1. Discover the Pipeline Server URL from the DSPipelineApplication CR
2. Establish secure TLS connections to the Pipeline Server API
3. Handle authentication and authorization
4. Apply proper error handling and retries

### Pipeline Server Discovery

The BFF constructs the Pipeline Server URL using:
- Namespace from the request
- Pipeline Server ID from the request
- Kubernetes service DNS pattern: `https://ds-pipeline-{pipelineServerId}.{namespace}.svc.cluster.local:8443`

## Integration with AutoRAG Frontend

The AutoRAG frontend can use this endpoint to:

1. List all runs for a specific pipeline
2. Display run status and results
3. Implement pagination for large result sets
4. Access run annotations for additional metadata

### Example Frontend Integration

```javascript
async function fetchPipelineRuns(pipelineId) {
  const params = new URLSearchParams({
    namespace: currentNamespace,
    pipelineServerId: "dspa",
    pageSize: "20"
  });

  // Add pipeline ID filter if provided
  if (pipelineId) {
    params.append("pipelineId", pipelineId);
  }

  const response = await fetch(`/api/v1/pipeline-runs?${params}`);
  const data = await response.json();

  return data.data.runs;
}
```

## Troubleshooting

### No Runs Returned

If the endpoint returns an empty array:
1. Verify the Pipeline Server ID is correct
2. Check that runs exist for the specified pipeline ID (if filtering)
3. Verify the pipeline exists in the Pipeline Server
3. Ensure the namespace parameter matches where the Pipeline Server is deployed

### Connection Errors

If you receive 500 errors:
1. Verify the Pipeline Server is running: `kubectl get dspipelineapplication -n <namespace>`
2. Check BFF logs for connection details
3. Verify network policies allow traffic between the BFF and Pipeline Server

### Authentication Errors

If you receive 401 errors:
1. Verify the `kubeflow-userid` header is set correctly
2. Check that the user has permissions to access the namespace
3. Ensure the BFF authentication method is configured correctly

## See Also

- [Kubeflow Pipelines API Reference](https://www.kubeflow.org/docs/components/pipelines/reference/api/kubeflow-pipeline-api-spec/)
- [AutoRAG Architecture Documentation](./README.md)
- [BFF Extensions Guide](../bff/docs/extensions.md)
