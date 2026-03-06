# Data Model: Eval Hub UI

**Feature**: Eval Hub UI - Model Evaluation Orchestration
**Date**: 2026-02-12
**Status**: Complete

## Overview

This document defines the core data entities for the Eval Hub UI feature. All entities are designed to be technology-agnostic at the specification level, with implementation details determined during development.

---

## Core Entities

### 1. Evaluation

Represents a single model evaluation job with its configuration, execution state, and results.

**Attributes**:

| Attribute | Type | Required | Description | Validation Rules |
|-----------|------|----------|-------------|------------------|
| `id` | string (UUID) | Yes | Unique identifier for the evaluation | Auto-generated, immutable |
| `userId` | string | Yes | User who created the evaluation | Inherited from authentication context |
| `name` | string | No | Human-readable name for the evaluation | Max 100 characters, defaults to auto-generated name |
| `description` | string | No | Optional description | Max 500 characters |
| `modelId` | string | Yes | Identifier of the model being evaluated | Must reference valid model in registry |
| `modelName` | string | Yes | Display name of the model | Cached from model registry |
| `modelVersion` | string | No | Version of the model | Optional, cached from model registry |
| `tasks` | array[string] | Yes | List of evaluation task IDs | Min 1 task, each task ID must be valid |
| `parameters` | object | No | Task-specific parameters | JSON object, validated against task schemas |
| `status` | enum | Yes | Current execution status | One of: `pending`, `running`, `completed`, `failed`, `cancelled` |
| `createdAt` | timestamp | Yes | When the evaluation was created | ISO 8601 format, auto-generated |
| `startedAt` | timestamp | No | When execution started | ISO 8601 format, set on status → `running` |
| `completedAt` | timestamp | No | When execution completed/failed | ISO 8601 format, set on status → `completed`/`failed` |
| `progress` | number | No | Execution progress percentage | 0-100, optional based on backend support |
| `error` | object | No | Error details if failed | Contains `code`, `message`, `details` |
| `resultsSummary` | object | No | High-level results summary | Populated when status = `completed` |
| `metadata` | object | No | Additional metadata | Extensible field for future attributes |

**State Transitions**:

```
pending → running → completed
          ↓
          failed
          ↓
       cancelled
```

**Validation Rules**:
- Cannot transition from `completed`/`failed`/`cancelled` to any other state
- `startedAt` must be >= `createdAt`
- `completedAt` must be >= `startedAt`
- `tasks` array cannot be empty
- `modelId` must exist in model registry at creation time

**Example**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "user@example.com",
  "name": "GPT-3.5 MMLU Benchmark",
  "description": "Evaluating GPT-3.5 on MMLU reasoning tasks",
  "modelId": "gpt-35-turbo-v1",
  "modelName": "GPT-3.5 Turbo",
  "modelVersion": "v1.0",
  "tasks": ["mmlu", "hellaswag"],
  "parameters": {
    "mmlu": { "subset": "all", "num_fewshot": 5 },
    "hellaswag": { "num_fewshot": 10 }
  },
  "status": "completed",
  "createdAt": "2026-02-12T10:00:00Z",
  "startedAt": "2026-02-12T10:00:05Z",
  "completedAt": "2026-02-12T10:45:30Z",
  "progress": 100,
  "resultsSummary": {
    "overallScore": 0.78,
    "tasksCompleted": 2,
    "tasksFailed": 0
  }
}
```

---

### 2. Evaluation Result

Represents the detailed output data from a completed evaluation, including metrics, scores, and task-specific results.

**Attributes**:

| Attribute | Type | Required | Description | Validation Rules |
|-----------|------|----------|-------------|------------------|
| `evaluationId` | string (UUID) | Yes | Reference to parent evaluation | Must reference existing evaluation |
| `overallMetrics` | object | Yes | Aggregated metrics across all tasks | Contains `accuracy`, `latency`, etc. |
| `taskResults` | array[TaskResult] | Yes | Per-task detailed results | One entry per evaluation task |
| `generatedAt` | timestamp | Yes | When results were generated | ISO 8601 format |
| `dataVersion` | string | Yes | Version of result schema | Semantic version (e.g., "1.0.0") |

**TaskResult Sub-Entity**:

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| `taskId` | string | Yes | Evaluation task identifier |
| `taskName` | string | Yes | Human-readable task name |
| `status` | enum | Yes | `completed`, `failed`, `skipped` |
| `metrics` | object | Yes | Task-specific metrics (accuracy, f1, etc.) |
| `samples` | number | Yes | Number of samples evaluated |
| `executionTime` | number | Yes | Task execution time in seconds |
| `error` | string | No | Error message if failed |

**Validation Rules**:
- `taskResults` length must match number of tasks in parent evaluation
- Each `taskId` must match a task in parent evaluation
- Cannot be created/updated for evaluations with status ≠ `completed`

**Example**:
```json
{
  "evaluationId": "550e8400-e29b-41d4-a716-446655440000",
  "overallMetrics": {
    "accuracy": 0.78,
    "averageLatency": 245.6,
    "totalSamples": 5000
  },
  "taskResults": [
    {
      "taskId": "mmlu",
      "taskName": "MMLU (Massive Multitask Language Understanding)",
      "status": "completed",
      "metrics": {
        "accuracy": 0.76,
        "accuracy_stderr": 0.012
      },
      "samples": 2500,
      "executionTime": 1320.5
    },
    {
      "taskId": "hellaswag",
      "taskName": "HellaSwag",
      "status": "completed",
      "metrics": {
        "accuracy": 0.80,
        "accuracy_norm": 0.82
      },
      "samples": 2500,
      "executionTime": 1405.2
    }
  ],
  "generatedAt": "2026-02-12T10:45:30Z",
  "dataVersion": "1.0.0"
}
```

---

### 3. Evaluation Template

Represents a saved, reusable evaluation configuration that users can apply to quickly create new evaluations.

**Attributes**:

| Attribute | Type | Required | Description | Validation Rules |
|-----------|------|----------|-------------|------------------|
| `id` | string (UUID) | Yes | Unique identifier for the template | Auto-generated, immutable |
| `userId` | string | Yes | User who created the template | Inherited from authentication context |
| `name` | string | Yes | Template name | Max 100 characters, must be unique per user |
| `description` | string | No | Template description | Max 500 characters |
| `modelSelection` | object | No | Model selection criteria | Filter criteria or null for manual selection |
| `tasks` | array[string] | Yes | Pre-selected task IDs | Min 1 task |
| `parameters` | object | No | Default task parameters | JSON object matching task schemas |
| `createdAt` | timestamp | Yes | Template creation timestamp | ISO 8601 format |
| `updatedAt` | timestamp | Yes | Last modification timestamp | ISO 8601 format |
| `usageCount` | number | Yes | Number of times template used | Auto-incremented, starts at 0 |
| `isPublic` | boolean | No | Whether template is shared | Default: false (private to user) |

**Model Selection Object** (optional):

| Attribute | Type | Description |
|-----------|------|-------------|
| `modelId` | string | Specific model ID, or null for any model |
| `modelType` | string | Model type filter (e.g., "text-generation") |
| `runtime` | string | Runtime filter (e.g., "vllm", "tgi") |

**Validation Rules**:
- `name` must be unique per user
- `tasks` array cannot be empty
- `parameters` must be valid JSON and match task schemas
- `modelSelection` can be null (manual model selection at creation time)
- `updatedAt` must be >= `createdAt`

**Example**:
```json
{
  "id": "660e9510-f39c-52e5-b827-557766551111",
  "userId": "user@example.com",
  "name": "Standard LLM Benchmark Suite",
  "description": "Comprehensive evaluation with MMLU, HellaSwag, and TruthfulQA",
  "modelSelection": {
    "modelId": null,
    "modelType": "text-generation",
    "runtime": null
  },
  "tasks": ["mmlu", "hellaswag", "truthfulqa"],
  "parameters": {
    "mmlu": { "subset": "all", "num_fewshot": 5 },
    "hellaswag": { "num_fewshot": 10 },
    "truthfulqa": { "num_fewshot": 0 }
  },
  "createdAt": "2026-01-15T08:30:00Z",
  "updatedAt": "2026-02-10T14:20:00Z",
  "usageCount": 12,
  "isPublic": false
}
```

---

### 4. Evaluation Task

Represents a benchmark or test suite that can be run against models. Tasks are defined by the evaluation backend and exposed through the catalog.

**Attributes**:

| Attribute | Type | Required | Description | Validation Rules |
|-----------|------|----------|-------------|------------------|
| `id` | string | Yes | Unique task identifier | Lowercase, alphanumeric + hyphens |
| `name` | string | Yes | Human-readable task name | Max 100 characters |
| `description` | string | Yes | Detailed task description | Max 1000 characters |
| `category` | string | Yes | Task category | One of predefined categories |
| `version` | string | Yes | Task definition version | Semantic version |
| `parameters` | array[ParameterSchema] | Yes | Configurable parameters | Can be empty array |
| `resultMetrics` | array[string] | Yes | Metrics returned by this task | Min 1 metric |
| `estimatedDuration` | number | No | Estimated execution time (seconds) | Positive integer |
| `sampleCount` | number | No | Number of evaluation samples | Positive integer |
| `referenceUrl` | string | No | Link to task documentation | Valid URL |

**ParameterSchema Sub-Entity**:

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes | Parameter name |
| `type` | enum | Yes | `string`, `number`, `boolean`, `select` |
| `default` | any | No | Default value |
| `required` | boolean | Yes | Whether parameter is required |
| `description` | string | Yes | Parameter description |
| `options` | array[string] | Conditional | Required if type = `select` |
| `min` | number | No | Minimum value (for `number` type) |
| `max` | number | No | Maximum value (for `number` type) |

**Categories**:
- `reasoning` - Logical reasoning and problem-solving
- `knowledge` - Factual knowledge and recall
- `comprehension` - Reading comprehension and understanding
- `generation` - Text generation quality
- `truthfulness` - Factual accuracy and hallucination detection
- `safety` - Safety and alignment testing
- `multilingual` - Multilingual capabilities

**Validation Rules**:
- `id` must be unique across all tasks
- `parameters` with `type=select` must have `options` array
- `resultMetrics` cannot be empty
- `version` must follow semantic versioning

**Example**:
```json
{
  "id": "mmlu",
  "name": "MMLU (Massive Multitask Language Understanding)",
  "description": "A benchmark that measures knowledge across 57 subjects including mathematics, history, computer science, and more.",
  "category": "knowledge",
  "version": "1.0.0",
  "parameters": [
    {
      "name": "subset",
      "type": "select",
      "default": "all",
      "required": false,
      "description": "MMLU subset to evaluate",
      "options": ["all", "stem", "humanities", "social_sciences", "other"]
    },
    {
      "name": "num_fewshot",
      "type": "number",
      "default": 5,
      "required": false,
      "description": "Number of few-shot examples",
      "min": 0,
      "max": 25
    }
  ],
  "resultMetrics": ["accuracy", "accuracy_stderr"],
  "estimatedDuration": 1200,
  "sampleCount": 14042,
  "referenceUrl": "https://arxiv.org/abs/2009.03300"
}
```

---

### 5. Model

Represents a deployed model available for evaluation. This entity is sourced from the KServe model registry via ODH internal APIs.

**Attributes**:

| Attribute | Type | Required | Description | Validation Rules |
|-----------|------|----------|-------------|------------------|
| `id` | string | Yes | Unique model identifier | From KServe InferenceService name |
| `name` | string | Yes | Model display name | Max 100 characters |
| `version` | string | No | Model version | Optional, from model metadata |
| `namespace` | string | Yes | Kubernetes namespace | From InferenceService |
| `runtime` | string | Yes | Serving runtime | E.g., "vllm", "tgi", "caikit" |
| `endpoint` | string | Yes | Model inference endpoint URL | Valid URL |
| `status` | enum | Yes | Model deployment status | `ready`, `pending`, `failed` |
| `createdAt` | timestamp | Yes | Model deployment timestamp | ISO 8601 format |
| `capabilities` | array[string] | No | Model capabilities | E.g., ["text-generation", "chat"] |
| `metadata` | object | No | Additional model metadata | Extensible key-value pairs |

**Validation Rules**:
- Only models with `status=ready` are available for evaluation
- `endpoint` must be accessible from evaluation backend
- `runtime` determines API compatibility

**Example**:
```json
{
  "id": "gpt2-large-model",
  "name": "GPT-2 Large",
  "version": "1.5B",
  "namespace": "model-serving",
  "runtime": "vllm",
  "endpoint": "http://gpt2-large-model.model-serving.svc.cluster.local:8080",
  "status": "ready",
  "createdAt": "2026-02-01T09:00:00Z",
  "capabilities": ["text-generation"],
  "metadata": {
    "parameters": "1.5B",
    "framework": "huggingface"
  }
}
```

---

## Relationships

### Evaluation → Model
- **Relationship**: Many-to-One
- **Description**: Each evaluation targets exactly one model; a model can have many evaluations
- **Implementation**: `Evaluation.modelId` references `Model.id`

### Evaluation → Evaluation Result
- **Relationship**: One-to-One
- **Description**: Each completed evaluation has exactly one result set
- **Implementation**: `EvaluationResult.evaluationId` references `Evaluation.id`

### Evaluation → Evaluation Tasks
- **Relationship**: Many-to-Many
- **Description**: Each evaluation runs multiple tasks; each task can be used in multiple evaluations
- **Implementation**: `Evaluation.tasks` array contains task IDs

### Template → Evaluation
- **Relationship**: One-to-Many
- **Description**: Each template can be used to create multiple evaluations; each evaluation may be created from zero or one template
- **Implementation**: Tracked via `Template.usageCount` (incremented on use)

### User → Evaluation / Template
- **Relationship**: One-to-Many
- **Description**: Each user can create multiple evaluations and templates
- **Implementation**: `Evaluation.userId` and `Template.userId` reference user identity from authentication context

---

## Data Lifecycle

### Evaluation Lifecycle

1. **Creation** (`pending` status)
   - User submits configuration via frontend
   - Frontend validates required fields
   - BFF creates evaluation entity
   - BFF submits job to backend evaluation service
   - Evaluation saved with `status=pending`

2. **Execution** (`running` status)
   - Backend service starts job
   - Status updated to `running` via polling
   - `startedAt` timestamp set
   - Optional `progress` updates

3. **Completion** (`completed` status)
   - Backend service finishes all tasks
   - Results generated and stored by backend
   - BFF polls and detects completion
   - Status updated to `completed`
   - `completedAt` timestamp set
   - `resultsSummary` populated
   - Full `EvaluationResult` entity created

4. **Failure** (`failed` status)
   - Backend service encounters error
   - BFF detects failure via polling
   - Status updated to `failed`
   - `error` object populated with details
   - `completedAt` timestamp set

5. **Retention**
   - Evaluations retained for 90 days (configurable)
   - Results retained with evaluation
   - After retention period, evaluation and results deleted

### Template Lifecycle

1. **Creation**
   - User saves configuration as template
   - Template validated and stored
   - `usageCount` initialized to 0

2. **Usage**
   - User selects template for new evaluation
   - Template configuration copied to evaluation
   - `usageCount` incremented

3. **Update**
   - User modifies template
   - `updatedAt` timestamp updated
   - Existing evaluations from template unaffected

4. **Deletion**
   - User deletes template
   - Template removed from storage
   - Existing evaluations from template unaffected

---

## Validation Summary

All entities include:
- **Immutable Identifiers**: IDs are auto-generated and cannot be changed
- **Timestamp Tracking**: Creation and modification timestamps for audit
- **User Association**: All entities associated with creating user
- **State Validation**: Status transitions validated based on defined rules
- **Size Limits**: String fields have maximum lengths to prevent abuse
- **Required Fields**: Critical fields enforced as required
- **Type Safety**: All fields have defined types and validation rules
