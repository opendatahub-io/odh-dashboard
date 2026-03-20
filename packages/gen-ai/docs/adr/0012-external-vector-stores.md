# External Vector Stores

* Date: 2026-02-19
* Updated: 2026-03-20
* Authors: Eder Ignatowicz, John Haran

## Context and Problem Statement

RAG workflows require vector stores for semantic search over embeddings. Users may provision vector databases (PGVector, Qdrant, Milvus) outside LlamaStack. The BFF needs a way to surface these external vector stores to the frontend so users can see what's available, which embedding model each store uses, and whether that model is currently registered in LlamaStack.

## Decision Drivers

* Platform teams manage vector databases independently from LlamaStack
* Frontend needs a unified view of available vector stores across namespaces
* Sensitive connection details (credentials, TLS secrets, provider config) must not reach the browser
* Embedding model availability must be cross-referenced against the LlamaStack config in the same namespace

## Considered Options

* **Option 1**: Store vector store metadata as LlamaStack custom resources
  - Couples external infrastructure to the LlamaStack operator lifecycle
* **Option 2**: ConfigMap-based declaration (chosen)
  - Lightweight, namespace-scoped, editable by platform teams without CRD dependencies
* **Option 3**: BFF-level configuration file
  - Not namespace-scoped, requires BFF restart on changes

## Decision Outcome

Chosen option: "ConfigMap-based declaration", because it is namespace-scoped, requires no CRDs, and can be managed by platform teams with standard `kubectl` tooling.

Each namespace may contain a ConfigMap named `gen-ai-aa-vector-stores` with a `config.yaml` key describing the external vector stores. The BFF reads this ConfigMap, parses the YAML, and returns a sanitized response. Embedding model status is computed client-side by the frontend.

### Positive Consequences

* No CRD or operator dependency — works with plain Kubernetes
* Namespace isolation — each team manages their own vector store declarations
* Sensitive fields not included in the BFF response — never reach the frontend
* Embedding model status computed client-side by the frontend, consistent with the existing Add/Try in Playground pattern

### Negative Consequences

* No schema validation at the Kubernetes level (YAML is parsed at runtime)
* ConfigMap size limit (1MB) — sufficient for vector store metadata but not infinite

## Implementation

> **Note**: The ConfigMap schema below reflects the revised schema from `gen-ai-aa-vector-stores-schema.yaml`,
> which supersedes the initial flat draft. The decision rationale above remains unchanged.

### ConfigMap Schema

The ConfigMap uses a two-section structure: `providers` (connection details, credentials) and
`registered_resources` (store entries referencing providers by ID). Sensitive provider config
and credentials never appear in the API response — they are simply not included in the response
type (`ExternalVectorStoreSummary`).

```yaml
# ConfigMap: gen-ai-aa-vector-stores, key: config.yaml
providers:
  vector_io:
    - provider_id: pgvector-prod
      provider_type: remote::pgvector
      config:
        host: pgvector.databases.svc.cluster.local  # not included in API response
        port: 5432
        db: embeddings
        distance_metric: COSINE
        secretRefs:                                  # not included in API response
          - key: connection-string
            name: pgvector-credentials

registered_resources:
  vector_stores:
    - provider_id: pgvector-prod
      vector_store_id: vs_282695f8-0000-0000-0000-000000000001
      vector_store_name: "Product Embeddings (PGVector)"
      embedding_model: ibm-granite/granite-embedding-125m-english
      embedding_dimension: 768
      metadata:
        description: "Product catalog embeddings"
```

### API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/v1/vectorstores/external` | Full list with ConfigMap metadata (management page) |
| GET | `/api/v1/aaa/vectorstores` | Flat array of summaries (AI Available Assets sidebar) |

Both endpoints return `ExternalVectorStoreSummary` objects. Provider `config` and `secretRefs`
are not included in the response. The `/vectorstores/external` endpoint additionally includes `config_map_info` and
`total_count`.

### Embedding Model Status

The BFF returns the raw `embedding_model` identifier per store. The frontend computes a three-state status client-side by cross-referencing against the already-loaded merged models data (from `useMergedModels` and `useFetchLlamaModels`):

| Status | Meaning |
|--------|---------|
| `not_available` | Model not found in AAE or LlamaStack — row greyed out |
| `available` | Model present in the unified AI Assets models list but not yet in LlamaStack playground |
| `registered` | Model registered in the running LlamaStack playground — green checkmark |

This mirrors the existing Add/Try in Playground pattern in `AIModelTableRow`, which also cross-references frontend model data client-side. Computing status in the frontend avoids the need to query multiple Kubernetes resources (LlamaStack config, external models ConfigMap, InferenceServices, MaaS) from within the BFF for every vector stores request, and automatically stays in sync with whichever sources the unified models tab includes.

### Repository

`ExternalVectorStoresRepository.ListExternalVectorStores()` performs:
1. Read `gen-ai-aa-vector-stores` ConfigMap and parse `config.yaml`
2. Build a provider lookup map (`provider_id` → `VectorIOProvider`) for `provider_type` and `distance_metric` resolution
3. Return `ExternalVectorStoreSummary` entries with ConfigMap metadata — embedding model status is left to the frontend

## Links

* [Related to] ADR-0007 - Domain Repository Pattern
* [Related to] ADR-0006 - Factory Pattern for Client Management
* [Implementation] `internal/repositories/external_vectorstores.go`
* [Implementation] `internal/api/external_vectorstores_handler.go`
* [Implementation] `internal/api/aaa_vectorstores_handler.go`
