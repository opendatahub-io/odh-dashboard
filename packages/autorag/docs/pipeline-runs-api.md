# Pipeline Runs API

## Overview

The Pipeline Runs API allows querying and creating Kubeflow Pipeline runs with automatic pipeline discovery. Both the Pipeline Server (DSPipelineApplication) and the AutoRAG managed pipeline are automatically discovered in the specified namespace. This endpoint is designed for AutoRAG to track and manage experiment runs associated with RAG optimization workflows.

**Key Features:**
- **Auto-Discovery**: Automatically discovers both the Pipeline Server and the AutoRAG managed pipeline
- **Discovery-only Filtering**: GET requests always filter to the discovered AutoRAG pipeline version
- **Automatic Injection**: POST requests automatically inject discovered pipeline IDs, eliminating manual configuration

**API Compatibility:** The response format matches the [Kubeflow Pipelines v2beta1 API](https://www.kubeflow.org/docs/components/pipelines/reference/api/kubeflow-pipeline-api-spec/) structure, ensuring consistency with upstream Kubeflow and making it easier to reference official documentation.

## Endpoints

```http
GET  /api/v1/pipeline-runs
GET  /api/v1/pipeline-runs/{runId}
POST /api/v1/pipeline-runs
POST /api/v1/pipeline-runs/{runId}/terminate
POST /api/v1/pipeline-runs/{runId}/retry
```

The API provides five endpoints:
- **List Runs**: Query multiple pipeline runs with optional filtering and pagination
- **Get Run**: Retrieve a single pipeline run by its ID with full task details
- **Create Run**: Submit a new AutoRAG pipeline run with optimization parameters
- **Terminate Run**: Stop an active pipeline run that is currently in progress
- **Retry Run**: Re-initiate a failed or canceled pipeline run from the point of failure

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
| `pageSize` | query integer | No | Number of results per page (default: 20, max: 100) |
| `nextPageToken` | query string | No | Token for retrieving the next page of results |

## Request Examples

### Basic Request

Get all pipeline runs from the auto-discovered AutoRAG pipeline in a namespace:

```bash
curl -X GET "http://localhost:4000/api/v1/pipeline-runs?namespace=my-namespace" \
  -H "Authorization: Bearer <your-token>"
```

### With Pagination

Get the next page of results:

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
          "pipeline_version_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
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
        ],
        "run_details": {
          "task_details": [
            {
              "run_id": "abc123-def456-ghi789",
              "task_id": "task-data-preprocessing-123",
              "display_name": "Data Preprocessing",
              "create_time": "2026-02-24T10:30:00Z",
              "start_time": "2026-02-24T10:30:05Z",
              "end_time": "2026-02-24T10:35:00Z",
              "state": "SUCCEEDED",
              "state_history": [
                {
                  "update_time": "2026-02-24T10:30:05Z",
                  "state": "PENDING"
                },
                {
                  "update_time": "2026-02-24T10:30:10Z",
                  "state": "RUNNING"
                },
                {
                  "update_time": "2026-02-24T10:35:00Z",
                  "state": "SUCCEEDED"
                }
              ],
              "child_tasks": [
                {
                  "pod_name": "data-preprocessing-pod-abc123"
                }
              ]
            }
          ]
        }
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
| `runtime_config` | object | Runtime configuration including pipeline parameters (see below) |
| `state` | string | Current run state (UNKNOWN, PENDING, RUNNING, SUCCEEDED, SKIPPED, FAILED, ERROR, CANCELED, CANCELING, PAUSED) |
| `storage_state` | string | Storage state of the run (e.g., AVAILABLE) |
| `service_account` | string | Service account used to run the pipeline |
| `created_at` | string | Creation timestamp in ISO 8601 format |
| `scheduled_at` | string | Scheduled timestamp in ISO 8601 format |
| `finished_at` | string | Completion timestamp in ISO 8601 format (if finished) |
| `error` | object | Optional error information if the run failed (contains `code` and `message` fields) |
| `state_history` | array | History of state changes (see below) |
| `run_details` | object | Detailed task execution information (see below) |
| `pipeline_type` | string | Type of pipeline that produced this run (e.g., `autorag`) |

#### PipelineVersionReference Object

| Field | Type | Description |
|-------|------|-------------|
| `pipeline_id` | string | ID of the pipeline |
| `pipeline_version_id` | string | ID of the pipeline version |

#### RuntimeConfig Object

| Field | Type | Description |
|-------|------|-------------|
| `parameters` | object | Key-value map of pipeline parameters (e.g., optimization_metric, data source names, secrets) |
| `pipeline_root` | string | Root output directory for pipeline artifacts |

#### StateHistory Object

| Field | Type | Description |
|-------|------|-------------|
| `update_time` | string | Timestamp when the state changed (ISO 8601 format) |
| `state` | string | The state at this time |
| `error` | object | Optional error information (if the state change was due to an error) |

#### RunDetails Object

| Field | Type | Description |
|-------|------|-------------|
| `task_details` | array | Array of TaskDetail objects representing individual task executions |

#### TaskDetail Object

| Field | Type | Description |
|-------|------|-------------|
| `run_id` | string | ID of the parent pipeline run |
| `task_id` | string | Unique identifier for this task |
| `display_name` | string | Human-readable task name |
| `create_time` | string | Task creation timestamp in ISO 8601 format |
| `start_time` | string | Task execution start timestamp in ISO 8601 format |
| `end_time` | string | Task completion timestamp in ISO 8601 format (if finished) |
| `state` | string | Current task state (UNKNOWN, PENDING, RUNNING, SUCCEEDED, SKIPPED, FAILED, ERROR, CANCELED) |
| `state_history` | array | History of state changes for this task (same format as run state_history) |
| `child_tasks` | array | Array of ChildTask objects (see below) |
| `error` | object | Optional error information if the task failed |

#### ChildTask Object

| Field | Type | Description |
|-------|------|-------------|
| `pod_name` | string | Kubernetes pod name that executed this task |

#### PipelineRunsData Object

| Field | Type | Description |
|-------|------|-------------|
| `runs` | array | Array of PipelineRun objects |
| `total_size` | integer | Total number of runs matching the filter |
| `next_page_token` | string | Token for retrieving the next page (empty if no more pages) |

## Get Single Pipeline Run

### Endpoint

```http
GET /api/v1/pipeline-runs/{runId}
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `namespace` | query string | Yes | Kubernetes namespace where the Pipeline Server is deployed |
| `runId` | path parameter | Yes | Unique identifier of the pipeline run to retrieve |

### Security & Filtering

This endpoint automatically discovers the AutoRAG managed pipeline in the namespace and validates that the requested run belongs to it. This ensures:

- **Namespace isolation**: Users can only access runs from the AutoRAG pipeline in their namespace
- **Pipeline filtering**: Runs from other pipelines in the same namespace are not accessible
- **Automatic discovery**: No need to manually specify pipeline IDs

**Behavior:**
- Returns the run if it exists and belongs to the discovered AutoRAG pipeline
- Returns `404 Not Found` if:
  - The run does not exist, OR
  - The run belongs to a different pipeline (not the AutoRAG pipeline)
- Returns `500 Internal Server Error` if:
  - No AutoRAG managed pipeline is found in the namespace

### Request Example

```bash
curl -X GET "http://localhost:4000/api/v1/pipeline-runs/abc123-def456-ghi789?namespace=my-namespace" \
  -H "Authorization: Bearer <your-token>"
```

### Response Format

Returns a single PipelineRun object with full details including task execution information:

```json
{
  "metadata": {},
  "data": {
    "run_id": "abc123-def456-ghi789",
    "display_name": "AutoRAG Optimization Run",
    "experiment_id": "1858af57-f990-4aee-a03e-c93bdfd02eb3",
    "pipeline_version_reference": {
      "pipeline_id": "9e3940d5-b275-4b64-be10-b914cd06c58e",
      "pipeline_version_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
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
    ],
    "run_details": {
      "task_details": [
        {
          "run_id": "abc123-def456-ghi789",
          "task_id": "task-prepare-data",
          "display_name": "Prepare Data",
          "create_time": "2026-02-24T10:30:00Z",
          "start_time": "2026-02-24T10:30:05Z",
          "end_time": "2026-02-24T10:32:00Z",
          "state": "SUCCEEDED",
          "child_tasks": [
            {
              "pod_name": "prepare-data-pod"
            }
          ]
        },
        {
          "run_id": "abc123-def456-ghi789",
          "task_id": "task-train-model",
          "display_name": "Train Model",
          "create_time": "2026-02-24T10:30:00Z",
          "start_time": "2026-02-24T10:32:10Z",
          "end_time": "2026-02-24T11:15:00Z",
          "state": "SUCCEEDED",
          "child_tasks": [
            {
              "pod_name": "train-model-pod"
            }
          ]
        }
      ]
    }
  }
}
```

### Error Responses

In addition to the common error responses listed above:

#### 404 Not Found - Run Not Found

Returned when the specified run ID does not exist:

```json
{
  "error": {
    "code": "404",
    "message": "the requested resource could not be found"
  }
}
```

## Create Pipeline Run

### Endpoint

```http
POST /api/v1/pipeline-runs
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `namespace` | query string | Yes | Kubernetes namespace where the Pipeline Server is deployed |

### Request Body

The request body accepts AutoRAG-specific parameters. The BFF translates these into a KFP v2beta1 CreateRun request with the appropriate `runtime_config`.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `display_name` | string | Yes | Human-readable name for the run |
| `description` | string | No | Optional description of the run |
| `test_data_secret_name` | string | Yes | Name of the K8s secret containing test data credentials |
| `test_data_bucket_name` | string | Yes | S3 bucket name for test data |
| `test_data_key` | string | Yes | Object key within the test data bucket |
| `input_data_secret_name` | string | Yes | Name of the K8s secret containing input data credentials |
| `input_data_bucket_name` | string | Yes | S3 bucket name for input data |
| `input_data_key` | string | Yes | Object key within the input data bucket |
| `llama_stack_secret_name` | string | Yes | Name of the K8s secret for LlamaStack access |
| `embeddings_models` | string[] | No | List of embedding model identifiers |
| `generation_models` | string[] | No | List of generation model identifiers |
| `optimization_metric` | string | No | Metric to optimize: `faithfulness` (default), `answer_correctness`, or `context_correctness` |
| `llama_stack_vector_io_provider_id` | string | No | Vector I/O provider identifier as registered in llama-stack (e.g. llama-stack Milvus) |
| `optimization_max_rag_patterns` | integer | No | Maximum number of RAG patterns to evaluate during optimization (min: 4, max: 20) |

**Notes:**
- Unknown JSON fields are rejected (strict decoding)
- `pipeline_id` and `pipeline_version_id` are automatically discovered and injected by the BFF - no manual configuration needed
- The BFF discovers the AutoRAG managed pipeline by searching for pipelines with names starting with "autorag" (case-insensitive)
- Discovery results are cached for 5 minutes per namespace to reduce API calls
- If no AutoRAG pipeline is found, the request returns a 500 error
- `experiment_id` is not passed — KFP assigns one automatically (defaults to "Default" experiment)

### Request Example

```bash
curl -X POST "http://localhost:4000/api/v1/pipeline-runs?namespace=my-namespace" \
  -H "kubeflow-userid: user@example.com" \
  -H "Content-Type: application/json" \
  -d '{
    "display_name": "my-optimization-run",
    "description": "Testing AutoRAG optimization",
    "test_data_secret_name": "minio-secret",
    "test_data_bucket_name": "autorag",
    "test_data_key": "test_data.json",
    "input_data_secret_name": "minio-secret",
    "input_data_bucket_name": "autorag",
    "input_data_key": "documents/",
    "llama_stack_secret_name": "llama-secret",
    "optimization_metric": "faithfulness"
  }'
```

### Response Format

Returns `200 OK` with the created pipeline run:

```json
{
  "data": {
    "run_id": "8839038d-09b4-40b7-aa19-0e68f6e1a6c3",
    "display_name": "my-optimization-run",
    "description": "Testing AutoRAG optimization",
    "experiment_id": "8c51d49e-9e6b-4d62-827c-63d58edb9374",
    "pipeline_version_reference": {
      "pipeline_id": "9e3940d5-b275-4b64-be10-b914cd06c58e",
      "pipeline_version_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
    },
    "runtime_config": {
      "parameters": {
        "optimization_metric": "faithfulness",
        "test_data_secret_name": "minio-secret",
        "test_data_bucket_name": "autorag",
        "test_data_key": "test_data.json",
        "input_data_secret_name": "minio-secret",
        "input_data_bucket_name": "autorag",
        "input_data_key": "documents/",
        "llama_stack_secret_name": "llama-secret"
      }
    },
    "state": "PENDING",
    "storage_state": "AVAILABLE",
    "created_at": "2026-02-25T10:30:00Z"
  }
}
```

### Error Responses

| Status | Condition |
|--------|-----------|
| `400 Bad Request` | Missing required fields, invalid `optimization_metric`, unknown JSON fields, malformed JSON, or missing `namespace` |
| `401 Unauthorized` | Missing or invalid authentication |
| `403 Forbidden` | User lacks permission to access pipeline servers in the namespace |
| `500 Internal Server Error` | KFP client failure or internal error |
| `503 Service Unavailable` | Pipeline Server exists but is not ready |

#### Example Validation Errors

**Missing required fields:**
```json
{
  "error": {
    "code": "400",
    "message": "missing required fields: display_name, test_data_secret_name, llama_stack_secret_name"
  }
}
```

**Invalid optimization_metric value:**
```json
{
  "error": {
    "code": "400",
    "message": "invalid optimization_metric \"custom\": must be one of faithfulness, answer_correctness, context_correctness"
  }
}
```

## Terminate Pipeline Run

### Endpoint

```http
POST /api/v1/pipeline-runs/{runId}/terminate
```

Sends an asynchronous request to cancel an active pipeline run. The run must be in an active state (PENDING, RUNNING, or PAUSED) and belong to the discovered AutoRAG pipeline in the namespace. The API requests a transition to CANCELING and attempts to cancel running tasks, which may result in a CANCELED final state if successful. However, the final state is not guaranteed — races or failures during cancellation may cause the run to end in a different terminal state.

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `namespace` | query string | Yes | Kubernetes namespace where the Pipeline Server is deployed |
| `runId` | path parameter | Yes | Unique identifier of the pipeline run to terminate |

### Security & Filtering

This endpoint enforces ownership and state validation:

- Fetches the run and validates it belongs to the discovered AutoRAG pipeline before terminating
- Validates the run is in a terminatable state (PENDING, RUNNING, or PAUSED) before proceeding
- Returns `400 Bad Request` if the run is not in a terminatable state (PENDING, RUNNING, or PAUSED)
- Returns `404 Not Found` if the run does not exist or belongs to a different pipeline
- Prevents users from terminating runs from other pipelines in the same namespace

### Request Example

```bash
curl -X POST "http://localhost:4000/api/v1/pipeline-runs/abc123-def456-ghi789/terminate?namespace=my-namespace" \
  -H "Authorization: Bearer <your-token>"
```

### Response Format

Returns `200 OK` with an empty body on success.

### Error Responses

| Status | Condition |
|--------|-----------|
| `400 Bad Request` | Missing `runId` parameter, or run is not in a terminatable state (PENDING, RUNNING, or PAUSED) |
| `401 Unauthorized` | Missing or invalid authentication |
| `403 Forbidden` | User lacks permission to access pipeline servers in the namespace |
| `404 Not Found` | Run not found, or run belongs to a different pipeline |
| `500 Internal Server Error` | Pipeline Server error or internal error |
| `503 Service Unavailable` | Pipeline Server exists but is not ready |

### Frontend Integration Example

```javascript
// Terminate a running pipeline run
async function terminatePipelineRun(namespace, runId, token) {
  const params = new URLSearchParams({ namespace });

  const response = await fetch(`/api/v1/pipeline-runs/${runId}/terminate?${params}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to terminate run');
  }
}
```

## Retry Pipeline Run

### Endpoint

```http
POST /api/v1/pipeline-runs/{runId}/retry
```

Re-initiates a failed or canceled pipeline run from the point of failure. The run must belong to the discovered AutoRAG pipeline in the namespace and must be in a retryable state (FAILED or CANCELED).

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `namespace` | query string | Yes | Kubernetes namespace where the Pipeline Server is deployed |
| `runId` | path parameter | Yes | Unique identifier of the pipeline run to retry |

### Security & Filtering

This endpoint enforces the same ownership validation as the Terminate Run endpoint:

- Fetches the run and validates it belongs to the discovered AutoRAG pipeline before retrying
- Validates the run is in FAILED or CANCELED state before retrying
- Returns `404 Not Found` if the run does not exist or belongs to a different pipeline
- Returns `400 Bad Request` if the run is not in a retryable state
- Prevents users from retrying runs from other pipelines in the same namespace

### Request Example

```bash
curl -X POST "http://localhost:4000/api/v1/pipeline-runs/abc123-def456-ghi789/retry?namespace=my-namespace" \
  -H "Authorization: Bearer <your-token>"
```

### Response Format

Returns `200 OK` with an empty body on success.

### Error Responses

| Status | Condition |
|--------|-----------|
| `400 Bad Request` | Missing `runId` parameter, or run is not in FAILED or CANCELED state |
| `401 Unauthorized` | Missing or invalid authentication |
| `403 Forbidden` | User lacks permission to access pipeline servers in the namespace |
| `404 Not Found` | Run not found, or run belongs to a different pipeline |
| `500 Internal Server Error` | Pipeline Server error or internal error |
| `503 Service Unavailable` | Pipeline Server exists but is not ready |

### Frontend Integration Example

```javascript
// Retry a failed or canceled pipeline run
async function retryPipelineRun(namespace, runId, token) {
  const params = new URLSearchParams({ namespace });

  const response = await fetch(`/api/v1/pipeline-runs/${runId}/retry?${params}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to retry run');
  }
}
```

## Delete Pipeline Run

### Endpoint

```http
DELETE /api/v1/pipeline-runs/{runId}
```

Permanently deletes a pipeline run that is in a terminal state (SUCCEEDED, FAILED, or CANCELED). The run must belong to the discovered AutoRAG pipeline in the namespace. This action cannot be undone.

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `namespace` | query string | Yes | Kubernetes namespace where the Pipeline Server is deployed |
| `runId` | path parameter | Yes | Unique identifier of the pipeline run to delete |

### Security & Filtering

This endpoint enforces the same ownership validation as the Terminate Run endpoint:

- Fetches the run and validates it belongs to the discovered AutoRAG pipeline before deleting
- Validates the run is in SUCCEEDED, FAILED, or CANCELED state before deleting
- Returns `404 Not Found` if the run does not exist or belongs to a different pipeline
- Returns `400 Bad Request` if the run is not in an deletable state
- Prevents users from deleting runs from other pipelines in the same namespace

### Request Example

```bash
curl -X DELETE "http://localhost:4001/api/v1/pipeline-runs/abc123-def456-ghi789?namespace=my-namespace" \
  -H "Authorization: Bearer <your-token>"
```

### Response Format

Returns `200 OK` with an empty body on success.

### Error Responses

| Status | Condition |
|--------|-----------|
| `400 Bad Request` | Missing `runId` parameter, or run is not in SUCCEEDED, FAILED, or CANCELED state |
| `401 Unauthorized` | Missing or invalid authentication |
| `403 Forbidden` | User lacks permission to access pipeline servers in the namespace |
| `404 Not Found` | Run not found, or run belongs to a different pipeline |
| `500 Internal Server Error` | Pipeline Server error or internal error |
| `503 Service Unavailable` | Pipeline Server exists but is not ready |

## Pipeline Discovery

The API always filters runs to the auto-discovered AutoRAG-managed pipeline:

1. Discovers the AutoRAG-managed pipeline in the namespace (cached for 5 minutes)
2. Filters runs to show only those from the discovered AutoRAG pipeline version
3. The List endpoint returns 200 with an empty runs list if no AutoRAG pipeline is found; other endpoints (Create, Get, Terminate, Retry) return a 500 error

This ensures users see only AutoRAG-related runs and prevents accidentally displaying unrelated pipeline runs from the namespace.

**Pipeline Discovery Details:**
- The BFF searches for pipelines with display names starting with a configurable prefix (default: "autorag", case-insensitive)
- The prefix can be customized via the `AUTORAG_PIPELINE_NAME_PREFIX` environment variable or `--autorag-pipeline-name-prefix` flag
- Uses the most recently created version of the discovered pipeline
- Discovery results are cached for 5 minutes per namespace
- Future versions will use pipeline metadata/attributes for more robust identification

## Error Responses

### 400 Bad Request

Returned when:
- Required parameters are missing
- Invalid parameter values

```json
{
  "error": {
    "code": "400",
    "message": "missing required query parameter: namespace"
  }
}
```

### 401 Unauthorized

Returned when authentication fails or is missing.

### 403 Forbidden

Returned when the authenticated user does not have permission to access services in the specified namespace.

```json
{
  "error": {
    "code": "403",
    "message": "user does not have permission to access services in this namespace"
  }
}
```

### 404 Not Found

Returned when:
- The specified namespace does not exist in the cluster, OR
- No Pipeline Server (DSPipelineApplication) resources exist in the namespace

**Example response when no DSPA exists:**
```json
{
  "error": {
    "code": "404",
    "message": "no Pipeline Server (DSPipelineApplication) found in namespace"
  }
}
```

### 500 Internal Server Error

Returned when:
- No AutoRAG pipeline found in namespace (for Create, Get, Terminate, and Retry endpoints — the List endpoint returns 200 with an empty runs list instead)
- Internal processing error occurs
- Unable to communicate with Kubernetes API
- Unable to communicate with Pipeline Server API

**Example response (no AutoRAG pipeline — Create/Get/Terminate/Retry only):**
```json
{
  "error": {
    "code": "500",
    "message": "no AutoRAG pipeline found in namespace - ensure a managed AutoRAG pipeline is deployed"
  }
}
```

### 503 Service Unavailable

Returned when a DSPipelineApplication exists in the namespace but is not ready. This occurs when the DSPA resource exists but does not have the `APIServerReady` condition set to `True`.

**Example response:**
```json
{
  "error": {
    "code": "503",
    "message": "Pipeline Server exists but is not ready - check that the APIServer component is running"
  }
}
```

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

Mock mode returns 3 sample pipeline runs with various states and task details:

1. **Succeeded Run** (`run-abc123-def456`) - Completed optimization run with 3 tasks:
   - Data Preprocessing (SUCCEEDED)
   - Model Training (SUCCEEDED)
   - Model Evaluation (SUCCEEDED)

2. **Running Run** (`run-ghi789-jkl012`) - Currently executing run with 2 tasks:
   - Data Loading (SUCCEEDED)
   - Feature Engineering (RUNNING)

3. **Failed Run** (`run-mno345-pqr678`) - Failed baseline run with 2 tasks:
   - Data Validation (SUCCEEDED)
   - Data Fetch (FAILED)

Each task includes detailed information such as:
- Task execution timeline (create_time, start_time, end_time)
- Task state and state history
- Pod names executing the tasks
- Error information (for failed tasks)

## Production Deployment

In production, the BFF will automatically:

1. Enforce RBAC authorization to verify users can access pipeline servers in the requested namespace
2. Auto-discover the first ready Pipeline Server (DSPipelineApplication) in the namespace
3. Extract the Pipeline Server API URL from the DSPipelineApplication status
4. Establish secure TLS connections to the Pipeline Server API
5. Forward the user's authentication token to the Pipeline Server
6. Apply proper error handling

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

The AutoRAG frontend can use these endpoints to:

1. Create new AutoRAG optimization runs with user-specified parameters
2. List all runs for a specific pipeline version
3. Display run status and results
4. Implement pagination for large result sets
5. Access run state history and metadata
6. View detailed task execution information for each run
7. Track individual task progress and status
8. Terminate runs that are currently in progress
9. Retry failed or canceled runs

### Example Frontend Integration

```javascript
// List pipeline runs with optional filtering
async function fetchPipelineRuns(namespace, token) {
  const params = new URLSearchParams({
    namespace,
    pageSize: "20"
  });

  const response = await fetch(`/api/v1/pipeline-runs?${params}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  const data = await response.json();
  return data.data.runs;
}

// Get a single run with full task details
async function fetchPipelineRun(namespace, runId, token) {
  const params = new URLSearchParams({ namespace });

  const response = await fetch(`/api/v1/pipeline-runs/${runId}?${params}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  const data = await response.json();
  return data.data;
}

// Create a new pipeline run
async function createPipelineRun(namespace, params, token) {
  const response = await fetch(`/api/v1/pipeline-runs?namespace=${namespace}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(params)
  });

  const data = await response.json();
  return data.data;
}

// Access task details from a run
function displayTaskDetails(run) {
  if (run.run_details?.task_details) {
    run.run_details.task_details.forEach(task => {
      console.log(`Task: ${task.display_name}`);
      console.log(`  State: ${task.state}`);
      console.log(`  Duration: ${task.start_time} to ${task.end_time}`);

      if (task.child_tasks) {
        task.child_tasks.forEach(child => {
          console.log(`  Pod: ${child.pod_name}`);
        });
      }
    });
  }
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

### 404 Not Found

A 404 error can occur in two scenarios:

**Scenario 1: Namespace does not exist**
1. Verify the namespace exists:
   ```bash
   kubectl get namespace <namespace>
   ```
2. Check that the namespace name in your request is correct
3. Verify you have permission to access the namespace

**Scenario 2: No DSPipelineApplication found in namespace**

If the error message is "no Pipeline Server (DSPipelineApplication) found in namespace":
1. Verify a DSPipelineApplication exists in the namespace:
   ```bash
   kubectl get dspipelineapplication -n <namespace>
   ```
2. If no DSPA exists, create one following the Data Science Pipelines documentation
3. If you just created a DSPA, wait a moment for it to be discovered and become ready

### 503 Service Unavailable - Pipeline Server Not Ready

A 503 error with message "Pipeline Server exists but is not ready" indicates that a DSPipelineApplication exists in the namespace but is not ready to serve requests.

If you receive this error:
1. Check if the DSPA has `APIServerReady` condition set to `True`:
   ```bash
   kubectl get dspipelineapplication -n <namespace> -o jsonpath='{.items[*].status.conditions[?(@.type=="APIServerReady")]}'
   ```
2. If not ready, check the DSPA status and conditions:
   ```bash
   kubectl describe dspipelineapplication -n <namespace>
   ```
3. Verify the APIServer component pods are running:
   ```bash
   kubectl get pods -n <namespace> -l component=data-science-pipelines
   ```
4. Check the APIServer pod logs for errors:
   ```bash
   kubectl logs -n <namespace> -l app=ds-pipeline-<dspa-name>
   ```
5. Wait for the Pipeline Server to become ready or troubleshoot the DSPA deployment

### No Runs Returned

If the endpoint returns an empty array:
1. Check that runs exist for the auto-discovered AutoRAG pipeline version
2. Verify the AutoRAG pipeline and its versions exist in the Pipeline Server
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
