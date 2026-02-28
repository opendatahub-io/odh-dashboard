# Pipeline Servers API

## Overview

The Pipeline Servers API allows discovering available Data Science Pipeline servers (DSPipelineApplications) in a namespace. This endpoint enables users to list all Pipeline Servers before querying specific pipeline runs.

## Endpoint

```http
GET /api/v1/pipeline-servers
```

## Authentication

This endpoint requires authentication via the standard authentication method configured for the BFF (either `internal` or `user_token`).

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `namespace` | query string | Yes | Kubernetes namespace to query for Pipeline Servers |

## Request Examples

### Basic Request

Get all Pipeline Servers in a namespace:

```bash
curl -X GET "http://localhost:4000/api/v1/pipeline-servers?namespace=my-namespace" \
  -H "kubeflow-userid: user@example.com"
```

## Response Format

The endpoint returns a JSON response with the following structure:

```json
{
  "metadata": {},
  "data": {
    "servers": [
      {
        "name": "dspa",
        "namespace": "my-namespace",
        "ready": true,
        "api_url": "https://ds-pipeline-dspa.my-namespace.svc.cluster.local:8443",
        "ui_url": "https://ds-pipeline-ui-dspa-my-namespace.apps.cluster.local"
      }
    ]
  }
}
```

### Response Fields

#### PipelineServer Object

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Pipeline Server name (DSPipelineApplication CR name) |
| `namespace` | string | Kubernetes namespace where the server is deployed |
| `ready` | boolean | Whether the Pipeline Server is ready to accept requests |
| `api_url` | string | Internal API URL for the Pipeline Server |
| `ui_url` | string | UI URL if exposed via route (optional) |

#### PipelineServersData Object

| Field | Type | Description |
|-------|------|-------------|
| `servers` | array | Array of PipelineServer objects |

## How It Works

The BFF queries Kubernetes for all `DSPipelineApplication` custom resources in the specified namespace using the Data Science Pipelines Operator API:

- **Group**: `datasciencepipelinesapplications.opendatahub.io`
- **Version**: Auto-discovered (tries `v1`, `v1beta1`, `v1alpha1` in order)
- **Resource**: `datasciencepipelinesapplications`

The API version is automatically discovered at runtime, ensuring compatibility across different OpenShift AI versions without code changes.

The response includes:
1. Server name and namespace from the CR metadata
2. Ready status from the CR status field
3. Constructed API URL based on the Kubernetes service naming pattern
4. UI URL if the Pipeline Server has a route exposed

## Error Responses

### 400 Bad Request

Returned when:
- The `namespace` parameter is missing
- Kubernetes client cannot be initialized

```json
{
  "code": "BAD_REQUEST",
  "message": "missing required query parameter: namespace"
}
```

### 401 Unauthorized

Returned when authentication fails or is missing.

### 500 Internal Server Error

Returned when:
- Kubernetes API is unavailable
- Internal processing error occurs

## Development Mode

For local development and testing, you can use mock mode to return sample data without connecting to a real Kubernetes cluster.

### Running with Mock Data

```bash
cd packages/autorag/bff
make run MOCK_K8S_CLIENT=true
```

Or using the flag directly:

```bash
go run cmd/main.go --mock-k8s-client
```

### Mock Data

Mock mode returns 2 sample Pipeline Servers:

1. **dspa** - A ready Pipeline Server with full deployment
   - Name: `dspa`
   - Ready: `true`
   - Status: All conditions ready

2. **dspa-test** - A non-ready Pipeline Server (simulating deployment in progress)
   - Name: `dspa-test`
   - Ready: `false`
   - Status: Waiting for pods to become ready

Both mock servers will use the namespace provided in the request and will have properly constructed API URLs.

## Production Deployment

In production, the BFF will automatically:

1. Connect to the Kubernetes API server
2. Query for DSPipelineApplication CRs in the requested namespace
3. Extract metadata and status information
4. Return the list of available Pipeline Servers

### Service Discovery

The API URL for each Pipeline Server is constructed using the standard Kubernetes service DNS pattern:

```text
https://ds-pipeline-{name}.{namespace}.svc.cluster.local:8443
```

This assumes the Data Science Pipelines Operator creates services following this naming convention.

## Integration with AutoRAG Frontend

The AutoRAG frontend can use this endpoint to:

1. Discover available Pipeline Servers in the current namespace
2. Present a dropdown/selector for users to choose which Pipeline Server to query
3. Validate that a Pipeline Server exists before attempting to query pipeline runs
4. Display the ready status of each Pipeline Server

### Example Frontend Integration

```javascript
async function fetchAvailablePipelineServers(namespace) {
  const params = new URLSearchParams({
    namespace
  });

  const response = await fetch(`/api/v1/pipeline-servers?${params}`);
  const data = await response.json();

  return data.data.servers;
}

async function displayAvailableServers() {
  // Usage
  const servers = await fetchAvailablePipelineServers('my-namespace');
  const readyServers = servers.filter(s => s.ready);

  // Display dropdown with available servers
  console.log('Available Pipeline Servers:', readyServers.map(s => s.name));
}
```

## Relationship with Pipeline Runs API

This endpoint complements the [Pipeline Runs API](./pipeline-runs-api.md):

1. **First**, call `/api/v1/pipeline-servers` to discover available Pipeline Servers
2. **Then**, call `/api/v1/pipeline-runs` with the selected `pipelineServerId` to query runs

### Example Workflow

```javascript
async function queryPipelineRunsWorkflow() {
  // Step 1: Get available Pipeline Servers
  const servers = await fetch('/api/v1/pipeline-servers?namespace=my-namespace')
    .then(r => r.json())
    .then(d => d.data.servers);

  // Step 2: Select first ready server
  const server = servers.find(s => s.ready);

  // Step 3: Query pipeline runs from that server
  const runs = await fetch(
    `/api/v1/pipeline-runs?namespace=my-namespace&pipelineServerId=${server.name}`
  ).then(r => r.json())
    .then(d => d.data.runs);

  return runs;
}
```

## Troubleshooting

### No Servers Returned

If the endpoint returns an empty array:
1. Verify Pipeline Servers are deployed in the namespace: `kubectl get dspipelineapplication -n <namespace>`
2. Check that the namespace exists and is accessible
3. Verify user permissions to list DSPipelineApplications

### Connection Errors

If you receive 500 errors:
1. Verify the BFF can connect to the Kubernetes API
2. Check BFF logs for detailed error messages
3. Verify RBAC permissions for the service account

### Authentication Errors

If you receive 401 errors:
1. Verify the `kubeflow-userid` header is set correctly
2. Check that the user has permissions to access the namespace
3. Ensure the BFF authentication method is configured correctly

## See Also

- [Pipeline Runs API Documentation](./pipeline-runs-api.md)
- [Kubeflow Pipelines Documentation](https://www.kubeflow.org/docs/components/pipelines/)
- [Data Science Pipelines Operator](https://github.com/opendatahub-io/data-science-pipelines-operator)
- [AutoRAG Architecture Documentation](./README.md)
