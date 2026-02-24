# External Vector Stores

* Date: 2026-02-19
* Authors: Eder Ignatowicz

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

Each namespace may contain a ConfigMap named `gen-ai-aa-vector-stores` with a `stores.yaml` key describing the external vector stores. The BFF reads this ConfigMap, parses the YAML, cross-references embedding models against the LlamaStack config, and returns a sanitized response.

### Positive Consequences

* No CRD or operator dependency — works with plain Kubernetes
* Namespace isolation — each team manages their own vector store declarations
* Sensitive fields stripped at the BFF layer before reaching the frontend
* Embedding model availability computed dynamically from LlamaStack config

### Negative Consequences

* No schema validation at the Kubernetes level (YAML is parsed at runtime)
* ConfigMap size limit (1MB) — sufficient for vector store metadata but not infinite

## Implementation

### ConfigMap Schema

```yaml
# ConfigMap: gen-ai-aa-vector-stores, key: stores.yaml
version: 1
vectorStores:
  - name: pgvector-store
    displayName: "Product Embeddings (PGVector)"
    provider_type: "remote::pgvector"
    collection: product_embeddings
    config:                          # stripped from API response
      host: pgvector.databases.svc.cluster.local
      port: 5432
      db: embeddings
    credentialSecret:                # stripped from API response
      name: pgvector-credentials
      key: connection-string
    embedding:
      model_id: ibm-granite/granite-embedding-125m-english
      dimension: 768
    description: "Product catalog embeddings"
    owner: platform-team
    domain: e-commerce
```

### API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/v1/vectorstores/external` | Full list with ConfigMap metadata (management page) |
| GET | `/api/v1/aaa/vectorstores` | Flat array of summaries (AI Available Assets sidebar) |

Both endpoints return `ExternalVectorStoreSummary` objects with sensitive fields (`config`, `credentialSecret`, `tlsSecretRef`) removed. The `/vectorstores/external` endpoint additionally includes `config_map_info` and `total_count`.

### Embedding Model Availability

For each vector store, the BFF checks whether the declared `embedding.model_id` is registered in the LlamaStack config (parsed from the `llama-stack-config` ConfigMap in the same namespace). The `embedding_model_available` boolean in the response tells the frontend whether the store's embedding model is active.

### Repository

`ExternalVectorStoresRepository.ListExternalVectorStores()` performs:
1. Read `gen-ai-aa-vector-stores` ConfigMap
2. Parse `stores.yaml`
3. Read LlamaStack config to build available embedding model set (graceful degradation if absent)
4. Return entries with `EmbeddingModelAvailable` flag and ConfigMap metadata

## Links

* [Related to] ADR-0007 - Domain Repository Pattern
* [Related to] ADR-0006 - Factory Pattern for Client Management
* [Implementation] `internal/repositories/external_vectorstores.go`
* [Implementation] `internal/api/external_vectorstores_handler.go`
* [Implementation] `internal/api/aaa_vectorstores_handler.go`
