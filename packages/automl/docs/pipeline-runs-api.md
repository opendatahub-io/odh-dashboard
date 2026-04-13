# Pipeline Runs API

## Overview

The Pipeline Runs API allows querying and creating Kubeflow Pipeline runs from an auto-discovered Pipeline Server, with support for multiple AutoML pipeline types. The API supports both **tabular (binary, multiclass, regression)** and **timeseries forecasting** pipelines, each with their own parameter schemas. The Pipeline Server (DSPipelineApplication) is automatically discovered in the specified namespace.

**Key Features:**
- **Multi-Pipeline Support:** Unified API for both tabular (binary, multiclass, regression) and timeseries (forecasting) AutoML pipelines
- **Auto-Discovery:** Automatically discovers and manages multiple pipeline types in a namespace
- **Type-Safe Schemas:** Discriminated union request bodies based on the `task_type` request body field
- **Merged Results:** List endpoint returns runs from all discovered pipeline types, sorted by creation time

**API Compatibility:** The response format matches the [Kubeflow Pipelines v2beta1 API](https://www.kubeflow.org/docs/components/pipelines/reference/api/kubeflow-pipeline-api-spec/) structure, ensuring consistency with upstream Kubeflow and making it easier to reference official documentation.

## Endpoints

```http
GET  /api/v1/pipeline-runs
GET  /api/v1/pipeline-runs/{runId}
POST /api/v1/pipeline-runs
```

The API provides three endpoints:
- **List Runs**: Query multiple pipeline runs with optional filtering and pagination
- **Get Run**: Retrieve a single pipeline run by its ID with full task details
- **Create Run**: Submit a new AutoML pipeline run with training parameters

## Pipeline Types

The API supports two types of AutoML pipelines, determined by the `task_type` field in the request body:

### Tabular (Binary, Multiclass, Regression) (`task_type`: `binary`, `multiclass`, or `regression`)
Used for binary classification, multiclass classification, and regression tasks on tabular/structured data.

**Use Cases:**
- Binary classification (e.g., credit default prediction, fraud detection)
- Multiclass classification (e.g., customer segmentation, product categorization)
- Regression (e.g., price prediction, sales estimation, risk scoring)

**Required Parameters:**
- `task_type`: Type of task (`binary`, `multiclass`, or `regression`)
- `display_name`: Human-readable name for the run
- `train_data_secret_name`: Name of the K8s secret containing S3 credentials
- `train_data_bucket_name`: S3 bucket name containing the training data
- `train_data_file_key`: S3 object key for the training data file
- `label_column`: Target column name in the training data

**Optional Parameters:**
- `description`: Description of the run
- `top_n`: Number of top models to consider (default: 3)

### Timeseries Forecasting (`task_type`: `timeseries`)
Used for forecasting future values in time series data.

**Use Cases:**
- Sales forecasting
- Demand prediction
- Resource utilization forecasting
- Weather prediction

**Required Parameters:**
- `task_type`: Must be `timeseries`
- `display_name`: Human-readable name for the run
- `train_data_secret_name`: Name of the K8s secret containing S3 credentials
- `train_data_bucket_name`: S3 bucket name containing the training data
- `train_data_file_key`: S3 object key for the training data file
- `target`: Target column to forecast
- `id_column`: Column identifying each time series
- `timestamp_column`: Timestamp/datetime column

**Optional Parameters:**
- `description`: Description of the run
- `top_n`: Number of top models to consider (default: 3)
- `prediction_length`: Number of timesteps to forecast (default: 1)
- `known_covariates_names`: List of covariate columns that are known in the future

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
| `page` | query integer | No | Page number to retrieve, 1-indexed (default: 1) |

## Request Examples

### Basic Request

Get all pipeline runs from all auto-discovered AutoML pipelines in a namespace:

```bash
curl -X GET "http://localhost:4003/api/v1/pipeline-runs?namespace=my-namespace" \
  -H "Authorization: Bearer <your-token>"
```

### With Pagination

Get a specific page of results:

```bash
curl -X GET "http://localhost:4003/api/v1/pipeline-runs?namespace=my-namespace&pageSize=10&page=2" \
  -H "Authorization: Bearer <your-token>"
```

### Using Internal Auth Mode

If the BFF is configured with `--auth-method=internal`, use the `kubeflow-userid` header instead:

```bash
curl -X GET "http://localhost:4003/api/v1/pipeline-runs?namespace=my-namespace" \
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
        "display_name": "AutoML Optimization Run 1",
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
| `state` | string | Current run state (UNKNOWN, PENDING, RUNNING, SUCCEEDED, SKIPPED, FAILED, ERROR, CANCELED, CANCELING, PAUSED) |
| `storage_state` | string | Storage state of the run (e.g., AVAILABLE) |
| `service_account` | string | Service account used to run the pipeline |
| `created_at` | string | Creation timestamp in ISO 8601 format |
| `scheduled_at` | string | Scheduled timestamp in ISO 8601 format |
| `finished_at` | string | Completion timestamp in ISO 8601 format (if finished) |
| `error` | object | Optional error information if the run failed (contains `code` and `message` fields) |
| `state_history` | array | History of state changes (see below) |
| `run_details` | object | Detailed task execution information (see below) |
| `pipeline_type` | string | Type of AutoML pipeline that produced this run (`timeseries` or `tabular`) |

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

### Request Example

```bash
curl -X GET "http://localhost:4003/api/v1/pipeline-runs/abc123-def456-ghi789?namespace=my-namespace" \
  -H "Authorization: Bearer <your-token>"
```

### Response Format

Returns a single PipelineRun object with full details including task execution information:

```json
{
  "metadata": {},
  "data": {
    "run_id": "abc123-def456-ghi789",
    "display_name": "AutoML Optimization Run",
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
    "code": "NOT_FOUND",
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

The request body schema varies based on the `task_type` field. The API uses a discriminated union with `task_type` as the discriminator to determine which pipeline to use.

#### Common Fields (All Pipeline Types)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `display_name` | string | Yes | Human-readable name for the run |
| `description` | string | No | Optional description of the run |
| `train_data_secret_name` | string | Yes | Name of the K8s secret containing S3 credentials |
| `train_data_bucket_name` | string | Yes | S3 bucket name containing the training data |
| `train_data_file_key` | string | Yes | S3 object key for the training data file |
| `task_type` | string | Yes | Type of task (discriminator): `binary`, `multiclass`, `regression`, or `timeseries` |
| `top_n` | integer | No | Number of top models to consider (default: 3) |

#### Tabular Pipeline Fields (`task_type`: `binary`, `multiclass`, or `regression`)

Additional required fields for tabular pipelines:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `label_column` | string | Yes | Name of the target column in the training data |

#### Timeseries Pipeline Fields (`task_type`: `timeseries`)

Additional required fields for timeseries forecasting pipelines:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `target` | string | Yes | Name of the target column to forecast |
| `id_column` | string | Yes | Name of the column identifying each time series (item_id) |
| `timestamp_column` | string | Yes | Name of the timestamp/datetime column |
| `prediction_length` | integer | No | Forecast horizon (number of timesteps, default: 1) |
| `known_covariates_names` | array of strings | No | Optional list of known covariate column names |

**Notes:**
- `task_type` is required in all requests and determines which pipeline type to use
- Unknown JSON fields are rejected (strict decoding)
- `pipeline_id` and `pipeline_version_id` are automatically discovered and injected by the BFF
- The `task_type` field selects between the auto-discovered timeseries and tabular pipelines
- If the requested pipeline type is not found in the namespace, the request returns a 500 error
- Request body validation is performed based on the selected task type

### Request Examples

#### Tabular Binary Classification Pipeline

```bash
curl -X POST "http://localhost:4003/api/v1/pipeline-runs?namespace=my-namespace" \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "display_name": "Credit Risk Binary Classification",
    "description": "Binary classification for credit default prediction",
    "train_data_secret_name": "s3-credentials",
    "train_data_bucket_name": "ml-datasets",
    "train_data_file_key": "credit/train.csv",
    "task_type": "binary",
    "label_column": "default",
    "top_n": 5
  }'
```

#### Tabular Multiclass Classification Pipeline

```bash
curl -X POST "http://localhost:4003/api/v1/pipeline-runs?namespace=my-namespace" \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "display_name": "Customer Segmentation",
    "description": "Multiclass classification for customer categorization",
    "train_data_secret_name": "s3-credentials",
    "train_data_bucket_name": "ml-datasets",
    "train_data_file_key": "customers/train.csv",
    "task_type": "multiclass",
    "label_column": "segment",
    "top_n": 5
  }'
```

#### Tabular Regression Pipeline

```bash
curl -X POST "http://localhost:4003/api/v1/pipeline-runs?namespace=my-namespace" \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "display_name": "House Price Prediction",
    "description": "Regression model for house price estimation",
    "train_data_secret_name": "s3-credentials",
    "train_data_bucket_name": "ml-datasets",
    "train_data_file_key": "housing/train.csv",
    "task_type": "regression",
    "label_column": "price",
    "top_n": 3
  }'
```

#### Timeseries Forecasting Pipeline

```bash
curl -X POST "http://localhost:4003/api/v1/pipeline-runs?namespace=my-namespace" \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "display_name": "Sales Forecasting",
    "description": "7-day ahead sales forecast by store",
    "train_data_secret_name": "s3-credentials",
    "train_data_bucket_name": "ml-datasets",
    "train_data_file_key": "sales/historical.csv",
    "task_type": "timeseries",
    "target": "sales",
    "id_column": "store_id",
    "timestamp_column": "date",
    "prediction_length": 7,
    "known_covariates_names": ["temperature", "is_holiday"],
    "top_n": 3
  }'
```

### Response Format

Returns `200 OK` with the created pipeline run (same `PipelineRun` structure as GET responses).

### Error Responses

| Status | Condition |
|--------|-----------|
| `400 Bad Request` | Missing required fields (common or task-type-specific), missing `task_type`, invalid `task_type` value, unknown JSON fields, or missing `namespace` |
| `401 Unauthorized` | Missing or invalid authentication |
| `403 Forbidden` | User lacks permission to access pipeline servers in the namespace |
| `500 Internal Server Error` | No matching AutoML pipeline found or KFP client failure |
| `503 Service Unavailable` | Pipeline Server exists but is not ready |

#### Example Validation Errors

**Missing task_type:**
```json
{
  "error": {
    "code": "400",
    "message": "task_type is required in request body"
  }
}
```

**Missing tabular-specific fields:**
```json
{
  "error": {
    "code": "400",
    "message": "missing required fields: label_column, task_type"
  }
}
```

**Missing timeseries-specific fields:**
```json
{
  "error": {
    "code": "400",
    "message": "missing required fields: target, id_column, timestamp_column"
  }
}
```

**Invalid task_type value:**
```json
{
  "error": {
    "code": "400",
    "message": "invalid task_type \"unsupervised\": must be one of binary, multiclass, regression, timeseries"
  }
}
```

**Note:** The API automatically selects the appropriate pipeline (tabular or timeseries) based on the `task_type` field in the request body. Invalid `task_type` values are reported using the generic invalid task_type error shown above, which lists all valid values. See the [Pipeline Types](#pipeline-types) section for details on supported task types and their corresponding pipelines.

## Pipeline Discovery

The API automatically discovers all managed AutoML pipelines (time-series and tabular) in the namespace and returns a merged view of their runs:

1. Discovers managed pipelines by name prefix (cached for 5 minutes), resolving a single `PipelineVersionID` per pipeline (the most recently created version)
2. Fetches all runs filtered to those resolved `PipelineVersionID` values — runs from older pipeline versions are excluded
3. Merges and sorts results by creation time descending
4. Applies `page`/`pageSize` pagination to the merged list

**Discovery Details:**
- Time-series prefix: configurable via `AUTOML_TIMESERIES_PIPELINE_NAME_PREFIX` (default: "autogluon-timeseries-training-pipeline")
- Tabular prefix: configurable via `AUTOML_TABULAR_PIPELINE_NAME_PREFIX` (default: "autogluon-tabular-training-pipeline")
- Returns 500 if no managed AutoML pipelines are found in the namespace

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
- Internal processing error occurs
- Unable to communicate with Kubernetes API
- Unable to communicate with Pipeline Server API

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
cd packages/automl/bff
make run MOCK_PIPELINE_SERVER_CLIENT=true
```

Or using the flag directly:

```bash
go run cmd/main.go --mock-pipeline-server-client
```

**Note:** When using mock mode (`--mock-k8s-client` or `--mock-pipeline-server-client`), the BFF automatically sets the auth method to `disabled` for easier testing, unless you explicitly override it with `--auth-method`.

### Mock Data

Mock mode returns 4 sample pipeline runs covering both pipeline types:

1. **Succeeded Run** (`run-abc123-def456`) - Timeseries pipeline, completed run with 3 tasks:
   - Data Preprocessing (SUCCEEDED)
   - Model Training (SUCCEEDED)
   - Model Evaluation (SUCCEEDED)

2. **Running Run** (`run-ghi789-jkl012`) - Timeseries pipeline, currently executing run with 2 tasks:
   - Data Loading (SUCCEEDED)
   - Feature Engineering (RUNNING)

3. **Failed Run** (`run-mno345-pqr678`) - Timeseries pipeline, failed baseline run with 2 tasks:
   - Data Validation (SUCCEEDED)
   - Data Fetch (FAILED)

4. **Tabular Run** (`run-tabular-001`) - Tabular pipeline, completed binary/multiclass/regression run with 1 task:
   - Data Preprocessing (SUCCEEDED)

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

## Integration with AutoML Frontend

The AutoML frontend can use these endpoints to:

1. List all runs for a specific pipeline version
2. Display run status and results
3. Implement pagination for large result sets
4. Access run state history and metadata
5. View detailed task execution information for each run
6. Track individual task progress and status

### Example Frontend Integration

```javascript
// List pipeline runs from all discovered AutoML pipelines
async function fetchPipelineRuns(namespace, token, page = 1) {
  const params = new URLSearchParams({
    namespace,
    pageSize: "20",
    page: String(page),
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

// Create a tabular pipeline run (binary, multiclass, or regression)
async function createTabularRun(namespace, token, config) {
  const params = new URLSearchParams({
    namespace
  });

  /* eslint-disable camelcase */
  const body = {
    display_name: config.displayName,
    description: config.description,
    train_data_secret_name: config.secretName,
    train_data_bucket_name: config.bucketName,
    train_data_file_key: config.fileKey,
    task_type: config.taskType,  // 'binary', 'multiclass', or 'regression'
    label_column: config.labelColumn,
    top_n: config.topN
  };
  /* eslint-enable camelcase */

  const response = await fetch(`/api/v1/pipeline-runs?${params}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  const data = await response.json();
  return data.data;
}

// Create a timeseries forecasting pipeline run
async function createTimeSeriesRun(namespace, token, config) {
  const params = new URLSearchParams({
    namespace
  });

  /* eslint-disable camelcase */
  const body = {
    display_name: config.displayName,
    description: config.description,
    train_data_secret_name: config.secretName,
    train_data_bucket_name: config.bucketName,
    train_data_file_key: config.fileKey,
    task_type: 'timeseries',
    target: config.target,
    id_column: config.idColumn,
    timestamp_column: config.timestampColumn,
    prediction_length: config.predictionLength,
    known_covariates_names: config.covariates,
    top_n: config.topN
  };
  /* eslint-enable camelcase */

  const response = await fetch(`/api/v1/pipeline-runs?${params}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
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
1. Check that runs exist for the auto-discovered AutoML pipeline versions
2. Verify that managed AutoML pipelines and their versions exist in the Pipeline Server
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
- [AutoML Architecture Documentation](./README.md)
- [BFF Extensions Guide](../bff/docs/extensions.md)
