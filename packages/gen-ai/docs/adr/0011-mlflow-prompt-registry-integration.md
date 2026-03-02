# MLflow Prompt Registry Integration

* Date: 2026-02-15
* Authors: Eder Ignatowicz

## Context and Problem Statement

Gen AI needs a prompt registry to manage reusable prompt templates and their versions. MLflow 3.x introduced a Prompt Registry that fits this need. The BFF must integrate with MLflow to expose prompt CRUD operations to the frontend.

## Decision Drivers

* Prompt versioning and lifecycle management required for production RAG workflows
* MLflow already deployed in OpenShift AI environments
* Need a Go-native integration path (BFF is written in Go)
* Must follow existing BFF patterns (factory, repository, envelope responses)

## Considered Options

* Direct REST calls to MLflow Tracking Server
* Python subprocess wrapping MLflow SDK
* Go SDK via [opendatahub-io/mlflow](https://github.com/opendatahub-io/mlflow) (publishes the `mlflow-go` Go module)

## Decision Outcome

Chosen option: "Go SDK via opendatahub-io/mlflow-go", because it provides type-safe, native Go integration without subprocess overhead or raw HTTP plumbing.

We use the **midstream fork** at [github.com/opendatahub-io/mlflow](https://github.com/opendatahub-io/mlflow) which publishes the `mlflow-go` Go module. This gives us prompt registry types (`promptregistry` package) and a client that handles authentication, TLS, and error mapping.

### Positive Consequences

* Type-safe prompt registry operations in Go
* No Python runtime dependency in the BFF container
* Consistent error handling via SDK's typed `APIError`
* Follows established factory/repository patterns

### Negative Consequences

* Coupled to midstream SDK release cadence
* SDK surface may lag behind upstream MLflow features

## Implementation

### Endpoints

All under `/gen-ai/api/v1/mlflow/prompts`, namespace-scoped:

| Method | Path | Operation |
|--------|------|-----------|
| GET | `/prompts` | List prompts (paginated, filterable) |
| POST | `/prompts` | Register prompt or add version |
| GET | `/prompts/{name}` | Load prompt version (defaults to latest) |
| GET | `/prompts/{name}/versions` | List all versions |
| DELETE | `/prompts/{name}` | Delete prompt and all versions |
| DELETE | `/prompts/{name}/versions/{version}` | Delete specific version |

### Client Factory

`MLflowClientFactory` with `RealClientFactory` and `MockClientFactory` implementations. Real client connects to `--mlflow-url`; mock client starts a local MLflow 3.8.1 server via `uv` and seeds sample data.

### Request Flow

Middleware chain: `AttachNamespace` → `RequireAccessToService` → `AttachMLflowClient` → Handler → Repository → SDK.

## Links

* [Related to ADR-0006] - Factory pattern for client management
* [Related to ADR-0007] - Domain repository pattern
* [opendatahub-io/mlflow](https://github.com/opendatahub-io/mlflow) - Midstream MLflow fork with Go SDK
