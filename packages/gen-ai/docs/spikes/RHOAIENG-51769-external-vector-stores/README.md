# Spike: RHOAIENG-51769 — Investigate Llamastack Responses for Invalid Vector Store Configurations

## Goal

Understand how llamastack behaves when given invalid or misconfigured vector store definitions,
so that BFF validation logic (Story 3: RHOAIENG-51773) is grounded in actual llamastack behaviour
rather than assumptions.

---

## Environment

| | |
|---|---|
| **Cluster** | OpenShift (LSD Playground instance) |
| **Namespace** | `pg-2` |
| **Llamastack Server Version** | `0.5.0+rhai0` |
| **Operator Version** | `0.4.0` |
| **Image** | `quay.io/opendatahub/llama-stack:latest` (see lsd-template.yaml) |
| **Image manifest** | `https://quay.io/repository/opendatahub/llama-stack/manifest/sha256:175563c0461cc717c5918791cfcda8f5f55580e96445fa302c3dbb4d24805cdb` |


---

## Pre-Test State (Baseline)

### Running Pods
| Pod | Status |
|-----|--------|
| `lsd-genai-playground-*` | Running |
| `llama-32-1b-instruct-predictor-*` | Running |
| `pgvector-*` | Running |

### Llamastack Service
- Service: `lsd-pgvector-success-service` on port `8321`
- Accessed via `oc port-forward svc/lsd-pgvector-success-service 8321:8321 -n pg-2`

### Llamastack Health
```
GET /v1/health → { "status": "OK" }
```

### PGVector Instance
- Deployed in `pg-2` namespace using `quay.io/sclorg/postgresql-16-c9s:latest`
- Service: `pgvector.pg-2.svc.cluster.local:5432`
- Database: `vectordb`, User: `vectoruser`
- Vector extension created manually as superuser:
  ```bash
  oc exec -n pg-2 deployment/pgvector -- psql -U postgres -d vectordb -c "CREATE EXTENSION IF NOT EXISTS vector;"
  ```

---

## Schema Changes in llamastack 0.5.0 (vs 0.4.x)

| Field | 0.4.x | 0.5.0 |
|-------|-------|-------|
| Top-level distribution key | `image_name: rh` | `distro_name: rh` |
| Pre-registered vector stores key | `registered_resources.vector_dbs` | `registered_resources.vector_stores` |
| Vector store ID field | `db_id` | `vector_store_id` |
| Vector store name field | N/A | `vector_store_name` (optional) |

**Note:** In 0.4.2, `registered_resources` for vector stores was completely inert — the `RESOURCES`
registration loop in `stack.py` did not include vector stores. This was fixed in PR #4616,
backported to v0.4.3 and included in 0.5.0.

---

## Pre-Test API Observations

These tests hit the `/v1/vector_stores` API directly (not via configmap) and revealed:

| Scenario | Result |
|----------|--------|
| POST with empty `{}` payload | Accepted — created store with `name: null`, used default milvus provider |
| POST with non-existent `embedding_model` | Accepted — stored the model name as-is, no validation |
| POST with non-existent `provider_id` | Accepted — silently fell back to default milvus provider |

**Note:** The `/v1/vector_stores` API does not validate embedding model or provider references.
The configmap-based path (our BFF's actual approach) may behave differently — see tests below.

---

## Test Plan

**Prereq — Seed pgvector with a vector store before running tests:**
```bash
# Temporarily add pgvector provider to the baseline configmap, restart, create store via API,
# note the vs_* UUID, then restore baseline. Use that UUID in registered_resources.vector_stores.
curl -s -X POST http://localhost:8321/v1/vector_stores \
  -H "Content-Type: application/json" \
  -d '{"name": "test_success_collection", "provider_id": "vector-store-provider-1", "embedding_model": "sentence-transformers/ibm-granite/granite-embedding-125m-english"}' | jq '{id, name}'
```

**Restore baseline command** (run between every test):
```bash
CONTENT=$(oc get configmap llama-stack-config -n pg-2 -o jsonpath='{.data.config\.yaml}' \
  # restore from llama-stack-config-pg2-baseline.yaml)
oc patch configmap llama-stack-config -n pg-2 --type merge \
  -p "{\"data\":{\"config.yaml\":$CONTENT_JSON}}"
oc get pods -n pg-2 | grep lsd-pgvector | awk '{print $1}' | xargs oc delete pod -n pg-2
```

Each test follows the same steps:

1. Write a modified `config.yaml` to a numbered file under `configmaps/`
2. Apply it as a new ConfigMap (or patch the existing one)
3. Create or restart the LlamaStackDistribution pod
4. Observe: does the pod start successfully?
5. Check pod logs for errors or warnings
6. If pod is up, hit `/v1/health` and attempt relevant API calls
7. Restore baseline before the next test

---

## Tests

### Test 00a — Success Scenario (Valid PGVector Connection)
**File:** `configmaps/00a-success-pgvector.yaml`
**LSD:** `lsd-pgvector-success` in `pg-2` (see `lsd-template.yaml`)
**Setup:** Deploy pgvector in `pg-2`, create a vector store via API to get a `vs_*` UUID, then
pre-register it in `registered_resources.vector_stores`.
**Questions:**
- Does llamastack start successfully with a valid remote pgvector config?
- Does `registered_resources.vector_stores` correctly pre-register the store on startup?
- Does the store survive pod restarts?
- Are custom metadata fields (`display_name`, `description`, `custom_gen_ai`) silently ignored?

### Test 00b — Success Scenario (Valid Qdrant Connection)
**File:** `configmaps/00b-success-qdrant.yaml`
**LSD:** `lsd-qdrant-success` in `pg-2`
**Setup:** Temporarily add the `remote::qdrant` provider to the pgvector LSD, create a vector store
via API to get a `vs_*` UUID, then pre-register it in `registered_resources.vector_stores` in a
new dedicated configmap and LSD.
**Questions:**
- Does llamastack start successfully with a valid remote qdrant config?
- Does `registered_resources.vector_stores` correctly pre-register the store on startup?
- Does qdrant perform a connectivity check at startup (like pgvector does)?
- Does `vector_store_name` work the same way as with pgvector?

### Test 00c — Success Scenario (Valid Remote Milvus Connection)
**File:** `configmaps/00c-success-milvus.yaml`
**LSD:** `lsd-milvus-success` in `pg-2`
**Setup:** Temporarily add the `remote::milvus` provider to the pgvector LSD, create a vector store
via API to get a `vs_*` UUID, then pre-register it in a new dedicated configmap and LSD.
**Questions:**
- Does llamastack start successfully with a valid remote milvus config?
- Does `registered_resources.vector_stores` correctly pre-register the store on startup?
- Does remote milvus perform a connectivity check at startup?
- Is `token` required even for unauthenticated instances?

### Test 00d — Success Scenario (External Qdrant Cloud)
**File:** `configmaps/00d-success-qdrant-cloud.yaml`
**LSD:** `lsd-qdrant-cloud-success` in `pg-2`
**Setup:** Same seeding approach as in-cluster qdrant. Temporarily add `remote::qdrant` provider
pointing at Qdrant Cloud, create a vector store via API, note the `vs_*` UUID, then pre-register
it in a dedicated configmap and LSD. The `api_key` in the committed file is redacted — the real
key was substituted at apply time.
**Questions:**
- Does llamastack connect to an external (outside-cluster) Qdrant Cloud instance successfully?
- Does pre-registration and end-to-end RAG work the same as in-cluster qdrant?

### Test 01 — Unreachable Vector Store Endpoint
**File:** `configmaps/01-unreachable-endpoint.yaml`
**Change:** Adds a `remote::pgvector` provider pointing at `pgvector.does-not-exist.svc.cluster.local`
plus a corresponding `vector_stores` entry referencing it.
**Questions:**
- Does llamastack perform a connectivity check at startup?
- Does the pod fail to start, or does it start and surface the error later?
- What is the error format?

### Test 02 — Missing Required Embedding Model
**File:** `configmaps/02-missing-embedding-model.yaml`
**Change:** Adds a `vector_stores` entry referencing an embedding model that is not registered
in llamastack (`non-existent-embedding-model`).
**Questions:**
- Does llamastack reject the entry at startup?
- Does it fail silently or with an error?

### Test 03 — Malformed / Incomplete Provider Config
**File:** `configmaps/03-malformed-provider.yaml`
**Change:** Adds a `remote::pgvector` provider with missing required fields (no `host`, no `db`).
**Questions:**
- Does llamastack validate provider config fields at startup?
- What error is returned?

### Test 04 — Invalid Credentials
**File:** `configmaps/04-invalid-credentials.yaml`
**Change:** Adds a `remote::pgvector` provider with a reachable host but incorrect password.
**Questions:**
- Does llamastack attempt to authenticate at startup?
- What error is returned for auth failure?

### Test 05 — Multiple Bad Configurations
**File:** `configmaps/05-multiple-bad-configs.yaml`
**Change:** Adds multiple misconfigured vector store entries simultaneously (unreachable endpoint +
missing embedding model + malformed config).
**Questions:**
- Does llamastack report all errors or stop at the first one?
- Does one bad entry block other (valid) entries from loading?

---

## Findings

### 00a — Success scenario (valid pgvector)
- **Pod starts?** Yes — Running 1/1
- **Connectivity check at startup?** Yes — DB connection + pgvector extension version check
- **Error format:** N/A
- **Notes:** `registered_resources.vector_stores` works in 0.5.0 — pre-registered store appears in `GET /v1/vector_stores` and survives pod restarts. `vector_store_name` sets the human-readable name. Custom metadata fields silently ignored by Pydantic.

### 00b — Success scenario (valid qdrant)
- **Pod starts?** Yes — Running 1/1
- **Connectivity check at startup?** No — zero qdrant log lines; connection deferred until first use
- **Error format:** N/A
- **Notes:** Same pre-registration behaviour as pgvector. Unlike pgvector, qdrant does not attempt a connection at startup — a misconfigured qdrant endpoint will not cause a startup failure.

### 00c — Success scenario (valid remote milvus)
- **Pod starts?** Yes — Running 1/1
- **Connectivity check at startup?** Yes — logs `Connecting to Milvus server at ...`
- **Error format:** N/A
- **Notes:** Same pre-registration behaviour. `token` is required by Pydantic regardless of whether Milvus auth is enabled — use `""` for unauthenticated, `"username:password"` for auth-enabled. Token-protected Milvus confirmed working with end-to-end RAG.

### 00d — Success scenario (external Qdrant Cloud)
- **Pod starts?** Yes — Running 1/1
- **Connectivity check at startup?** No — same deferred behaviour as in-cluster qdrant
- **Error format:** N/A
- **Notes:** Confirms llamastack can connect to a vector store outside the cluster. Pre-registration and end-to-end RAG work identically to in-cluster qdrant. `api_key` used for auth.

### 01a — Unreachable pgvector endpoint (missing `persistence` field)
- **Pod starts?** No — CrashLoopBackOff
- **Connectivity check at startup?** No — crashed before connectivity attempt
- **Error format:** `AttributeError: 'NoneType' object has no attribute 'backend'` (Python traceback)
- **Notes:** Crashed due to missing `persistence` field, not the unreachable host. `persistence` is required for `remote::pgvector`.

### 01a — Unreachable pgvector endpoint (with `persistence` field)
- **Pod starts?** No — CrashLoopBackOff
- **Connectivity check at startup?** Yes — DNS lookup attempted immediately
- **Error format:** `psycopg2.OperationalError: could not translate host name ... Name or service not known` → `RuntimeError: Could not connect to PGVector database server` (Python traceback)
- **Notes:** One bad provider causes the entire instance to fail. DNS failure is immediate, not a timeout.

### 01b — Unreachable qdrant endpoint
- **Pod starts?** Yes — Running 1/1
- **Connectivity check at startup?** No — zero qdrant log lines at startup
- **Error format:** `{"code": "server_error", "message": "[Errno -2] Name or service not known"}` in HTTP 200 response body (on first use)
- **Notes:** Pod starts fine and `GET /v1/vector_stores` shows `"status": "completed"` — no indication of the bad endpoint. Error only surfaces when the store is first used (e.g. attaching a file).

### 02 — Missing embedding model
- **Pod starts?** No — CrashLoopBackOff
- **Connectivity check at startup?** No — crashed during resource registration, before connectivity
- **Error format:** `ModelNotFoundError: Model 'non-existent-embedding-model' not found` (Python traceback)
- **Notes:** Validated at startup during `register_resources` (phase 2). Error message is specific and names the missing model ID. One bad entry crashes the entire instance.

### 03 — Malformed provider config (missing `host`/`db`)
- **Pod starts?** No — CrashLoopBackOff
- **Connectivity check at startup?** Yes — attempted connection to `localhost:5432`
- **Error format:** `psycopg2.OperationalError: connection to server at "localhost" ... Connection refused` → `RuntimeError` (Python traceback)
- **Notes:** No Pydantic validation error — `host` silently defaulted to `localhost`. The crash is indistinguishable from a plain unreachable endpoint error. BFF must enforce required fields explicitly.

### 04 — Invalid credentials
- **Pod starts?** No — CrashLoopBackOff
- **Connectivity check at startup?** Yes — auth attempted as part of the startup connection
- **Error format:** `psycopg2.OperationalError: FATAL: password authentication failed for user "vectoruser"` → `RuntimeError: Could not connect to PGVector database server` (Python traceback)
- **Notes:** Auth failure is specific in the `psycopg2` cause but re-raised under the same generic `RuntimeError` as connectivity and DNS failures. Password is redacted (`'password': '******'`) in the startup log.

### 05 — Multiple bad configs (unreachable endpoint + missing embedding model)
- **Pod starts?** No — CrashLoopBackOff
- **Connectivity check at startup?** Yes — pgvector connectivity checked first
- **Error format:** `psycopg2.OperationalError` → `RuntimeError` (Python traceback); `ModelNotFoundError` never surfaced
- **Notes:** Llamastack stops at the first error. Provider instantiation (phase 1) runs before resource registration (phase 2), so the connectivity failure masked the missing model error entirely. Only one error is reported regardless of how many bad entries exist.

### 06 — One bad, one valid
- **Pod starts?** N/A — skipped
- **Notes:** Answered by prior tests. Llamastack does not partial-load — any startup-phase failure takes the whole instance down.

---

## Detailed Test Notes

### Test 00a — Success Scenario (Valid PGVector Connection)

**Config file:** `configmaps/00a-success-pgvector.yaml`
**LSD:** `lsd-pgvector-success` in namespace `pg-2` (see `lsd-template.yaml`)

**Result: Pod started successfully — Running 1/1**

Llamastack started with a valid `remote::pgvector` provider pointing at a real pgvector instance
deployed in the `pg-2` namespace. The provider connected successfully at startup:

```
INFO  vector_io::pgvector: Initializing PGVector memory adapter with config:
      {'host': 'pgvector.pg-2.svc.cluster.local', 'port': 5432, 'db': 'vectordb', ...}
INFO  vector_io::pgvector: Vector extension version: 0.6.2
```

**Key findings:**

- **Pod starts successfully** with a valid remote pgvector config.
- **Llamastack performs a real DB connection at startup** — it checks the pgvector extension version,
  confirming actual connectivity (not just DNS resolution).
- **`registered_resources.vector_stores` works in 0.5.0.** The pre-registered store appears in
  `GET /v1/vector_stores` on first boot. API response shape:
  ```json
  {
    "id": "vs_282695f8-7e3e-48da-abac-d81a0aa225a4",
    "object": "vector_store",
    "name": "vs_282695f8-7e3e-48da-abac-d81a0aa225a4",
    "status": "completed",
    "metadata": {
      "provider_id": "vector-store-provider-1",
      "provider_vector_store_id": null,
      "embedding_model": "sentence-transformers/ibm-granite/granite-embedding-125m-english",
      "embedding_dimension": "768"
    }
  }
  ```
- **Store survives pod restarts** — re-loaded from configmap on each boot (emptyDir storage,
  so configmap is the only durable state).
- **`default_provider_id: milvus`** — confirmed store loads correctly via its own `provider_id`
  on the registered entry, regardless of what the default provider is.
- **Custom metadata fields are silently ignored** — `display_name`, `description`, and
  `custom_gen_ai` fields in the `vector_stores` entry are dropped by Pydantic without error.
- **`vector_store_name` sets the human-readable name** — confirmed working. When set, the store's
  `name` field in `GET /v1/vector_stores` reflects the value rather than defaulting to the UUID.
  `vector_store_name` is a sibling of `vector_store_id` in the configmap entry (not inside `metadata`).
- **`metadata.provider_vector_store_id` is `null`** when registered via configmap (vs populated
  when the store is created via `POST /v1/vector_stores`).
- **BFF pre-registration flow:**
  1. Create the vector store via `POST /v1/vector_stores` on any running instance with the provider → note the returned `vs_*` UUID
  2. Write that UUID as `vector_store_id` in `registered_resources.vector_stores` in the configmap
  3. On every startup, llamastack re-registers the store from the configmap

#### End-to-end RAG verification

To confirm the store is genuinely backed by pgvector and RAG retrieval works, a test document
was uploaded and a query was issued with and without the `file_search` tool.

**1. Upload a file and attach it to the vector store:**
```bash
echo "The Brixholm ferry departs from Pier 7 every Tuesday at 06:15. The captain is Lars Venneby. Tickets cost 42 kroner." > /tmp/brixholm.txt

curl -s -X POST "http://localhost:8321/v1/files" \
  -F "file=@/tmp/brixholm.txt" \
  -F "purpose=assistants"
# → {"id": "file-f41fb90df4154fefa3b71383b13b294d", "status": "completed", ...}

curl -s -X POST "http://localhost:8321/v1/vector_stores/vs_282695f8-7e3e-48da-abac-d81a0aa225a4/files" \
  -H "Content-Type: application/json" \
  -d '{"file_id": "file-f41fb90df4154fefa3b71383b13b294d"}'
# → {"status": "completed", ...}
```

**2. Query without RAG** — model correctly says it doesn't know:
```bash
curl -s -X POST "http://localhost:8321/v1/responses" \
  -H "Content-Type: application/json" \
  -d '{"model":"vllm-inference-1/llama-32-1b-instruct","input":"What time does the Brixholm ferry depart, and who is the captain?"}' \
  | jq '.output[0].content[0].text'
# → "I don't have access to real-time information or specific details about the Brixholm ferry..."
```

**3. Query with RAG** — model retrieves the chunk from pgvector and answers correctly:
```bash
curl -s -X POST "http://localhost:8321/v1/responses" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "vllm-inference-1/llama-32-1b-instruct",
    "input": "What time does the Brixholm ferry depart, and who is the captain?",
    "tools": [{"type": "file_search", "vector_store_ids": ["vs_282695f8-7e3e-48da-abac-d81a0aa225a4"]}]
  }' | jq '.output'
```

Response shows a `file_search_call` with the retrieved chunk (score `13.04`, source `brixholm.txt`),
followed by the correct answer:
```
"The Brixholm ferry departs from Pier 7 every Tuesday at 06:15. The captain is Lars Venneby. Tickets cost 42 kroner."
```

**Note:** The `/v1/vector-io/insert` endpoint (lower-level) requires pre-computed embeddings.
Use the `/v1/files` + `/v1/vector_stores/{id}/files` flow (OpenAI-compatible) to insert raw text
and have llamastack handle embedding generation automatically.

---

### Test 00b — Success Scenario (Valid Qdrant Connection)

**Config file:** `configmaps/00b-success-qdrant.yaml`
**LSD:** `lsd-qdrant-success` in namespace `pg-2`

**Result: Pod started successfully — Running 1/1**

Llamastack started with a valid `remote::qdrant` provider pointing at the qdrant instance
deployed in the `qdrant` namespace (`qdrant.qdrant.svc.cluster.local:6333`).

Unlike pgvector, qdrant does **not** log a connectivity message at startup — no initialisation
or extension check is printed. The provider loads silently and defers connection until first use.

**Key findings:**

- **Pod starts successfully** with a valid remote qdrant config.
- **No connectivity check at startup** — qdrant does not attempt a DB connection during provider
  initialisation, unlike pgvector which checks the extension version. Implication for BFF: a
  misconfigured qdrant endpoint may not cause a startup failure (to be confirmed in later tests).
- **`registered_resources.vector_stores` works identically to pgvector** — pre-registered store
  appears in `GET /v1/vector_stores` on first boot.
- **`vector_store_name` works** — `GET /v1/vector_stores` returns `"name": "Product Docs RAG Store (Qdrant)"`.
- **Qdrant provider config fields used:**
  ```yaml
  provider_type: remote::qdrant
  config:
    url: http://qdrant.qdrant.svc.cluster.local:6333
    persistence:
      backend: kv_default
      namespace: vector_io::qdrant
  ```
  All other fields (`api_key`, `host`, `port`, `grpc_port`, etc.) are optional and were omitted.

#### End-to-end RAG verification

Same flow as pgvector — file uploaded and attached, then queried with and without `file_search`.

**1. Upload and attach:**
```bash
echo "The Brixholm ferry departs from Pier 7 every Tuesday at 06:15. The captain is Lars Venneby. Tickets cost 42 kroner." > /tmp/brixholm.txt

curl -s -X POST "http://localhost:8321/v1/files" \
  -F "file=@/tmp/brixholm.txt" \
  -F "purpose=assistants"
# → {"id": "file-c5787c8119a94d4c9a2d870b4dfb8fb7", ...}

curl -s -X POST "http://localhost:8321/v1/vector_stores/vs_d281220f-f701-4d55-95d1-5a980b11a8be/files" \
  -H "Content-Type: application/json" \
  -d '{"file_id": "file-c5787c8119a94d4c9a2d870b4dfb8fb7"}'
# → {"status": "completed", ...}
```

**2. Without RAG** — model says it doesn't know.

**3. With RAG** — chunk retrieved from Qdrant, model answers correctly:
```
"The Brixholm ferry departs from Pier 7 every Tuesday at 06:15. The captain is Lars Venneby. Tickets cost 42 kroner."
```

**Note on relevance scores:** Qdrant returns a normalised similarity score (`0.92`, range 0–1),
consistent with Milvus and unlike pgvector's raw distance score (`13.04`).

---

### Test 00c — Success Scenario (Valid Remote Milvus Connection)

**Config file:** `configmaps/00c-success-milvus.yaml`
**LSD:** `lsd-milvus-success` in namespace `pg-2`

**Result: Pod started successfully — Running 1/1**

Llamastack started with a valid `remote::milvus` provider pointing at the Milvus standalone
instance in the `milvus` namespace (`vectordb-milvus.milvus.svc.cluster.local:19530`).

Unlike qdrant, remote milvus **does** log a connectivity message at startup — matching pgvector's
behaviour:

```
INFO  vector_io::milvus: Connecting to Milvus server at http://vectordb-milvus.milvus.svc.cluster.local:19530
```

**Key findings:**

- **Pod starts successfully** with a valid remote milvus config.
- **Connectivity attempted at startup** — llamastack logs a connection message during provider
  initialisation, consistent with pgvector. Implication for BFF: a misconfigured remote milvus
  endpoint is likely to cause a startup failure (to be confirmed in later tests).
- **`token` is required** by the Pydantic model in this build (`0.5.0+rhai0`) regardless of
  whether Milvus has authentication enabled. Use `token: ""` for unauthenticated instances,
  `token: "username:password"` for auth-enabled instances. Omitting it entirely causes a
  `ValidationError` crash before any connectivity attempt.
- **Token-protected Milvus confirmed working** — the Milvus instance was updated to enable
  `authorizationEnabled: true` and llamastack connected successfully using
  `token: "root:Milvus"` (default Milvus root credentials). End-to-end RAG retrieval worked
  correctly against the auth-protected instance.
- **`registered_resources.vector_stores` works identically** — pre-registered store appears in
  `GET /v1/vector_stores` on first boot with the correct name.
- **`vector_store_name` works** — `GET /v1/vector_stores` returns `"name": "Product Docs RAG Store (Milvus)"`.
- **Milvus provider config fields used:**
  ```yaml
  provider_type: remote::milvus
  config:
    uri: http://vectordb-milvus.milvus.svc.cluster.local:19530
    token: ""
    persistence:
      backend: kv_default
      namespace: vector_io::milvus-remote
  ```

#### End-to-end RAG verification

Same flow as pgvector — file uploaded and attached, then queried with and without `file_search`.

**1. Upload and attach:**
```bash
echo "The Brixholm ferry departs from Pier 7 every Tuesday at 06:15. The captain is Lars Venneby. Tickets cost 42 kroner." > /tmp/brixholm.txt

curl -s -X POST "http://localhost:8321/v1/files" \
  -F "file=@/tmp/brixholm.txt" \
  -F "purpose=assistants"
# → {"id": "file-89ed925039dd4158bb4b6564835f02d7", ...}

curl -s -X POST "http://localhost:8321/v1/vector_stores/vs_72611219-147b-490c-883a-659489d9b47c/files" \
  -H "Content-Type: application/json" \
  -d '{"file_id": "file-89ed925039dd4158bb4b6564835f02d7"}'
# → {"status": "completed", ...}
```

**2. Without RAG** — model says it doesn't know.

**3. With RAG** — chunk retrieved from Milvus, model answers correctly:
```
"The Brixholm ferry departs from Pier 7 every Tuesday at 06:15, and the captain is Lars Venneby. Tickets cost 42 kroner."
```

**Note on relevance scores:** Milvus returns a normalised similarity score (`0.91`, range 0–1),
whereas pgvector returned a raw distance score (`13.04`). Retrieval was correct in both cases.

**Note on small model tool use:** `llama-32-1b-instruct` does not reliably trigger `file_search`
on every request. When it failed, nudging the prompt with "search your files and tell me..."
caused it to invoke the tool correctly. This is a known limitation of small models — Eder's gist
notes the same issue. For production use a larger model is recommended.

---

### Test 00d — Success Scenario (External Qdrant Cloud)

**Config file:** `configmaps/00d-success-qdrant-cloud.yaml`
**LSD:** `lsd-qdrant-cloud-success` in namespace `pg-2`

**Result: Pod started successfully — Running 1/1**

Llamastack connected to a Qdrant Cloud free-tier cluster hosted on AWS us-east-1, outside the
OpenShift cluster entirely. Behaviour was identical to the in-cluster qdrant test — no startup
connectivity log, deferred connection until first use, pre-registered store appeared correctly.

**Key findings:**

- **External vector stores work** — llamastack has no restriction on connecting to hosted/cloud
  vector store services outside the cluster. The `url` just needs to be reachable from the pod.
- **`api_key` used for Qdrant Cloud auth** — passed directly in the provider config. Unlike
  Milvus, no `token` quirks; the field is simply `api_key`.
- **Pre-registration and RAG work identically** to in-cluster qdrant. Vector store appears in
  `GET /v1/vector_stores` with the correct name on first boot.
- **Direct search confirmed working:** score `0.90` against Qdrant Cloud.
- **End-to-end RAG confirmed working** — `/v1/responses` with `file_search` retrieved the chunk
  from Qdrant Cloud and answered correctly.
- **API key security note:** The `api_key` in `00d-success-qdrant-cloud.yaml` is redacted
  (`<qdrant-cloud-api-key>`). The real key was substituted at apply time and not committed.
  In production this should be injected via a Kubernetes Secret rather than hardcoded in the
  configmap.
- **Qdrant Cloud provider config:**
  ```yaml
  provider_type: remote::qdrant
  config:
    url: https://6d0ce067-50d0-4193-b147-7e6e78fd6af4.us-east-1-1.aws.cloud.qdrant.io
    api_key: "<qdrant-cloud-api-key>"
    persistence:
      backend: kv_default
      namespace: vector_io::qdrant-cloud
  ```

---

### Test 01 — Unreachable Vector Store Endpoint

**Config files:** `configmaps/01-unreachable-endpoint.yaml` (v1), `configmaps/01-unreachable-endpoint-v2.yaml` (v2)

#### v1 — Missing `persistence` field

**Result: Pod failed to start — CrashLoopBackOff**

The pod crashed before any connectivity check due to missing the required `persistence` field:

```
INFO  vector_io::pgvector: Initializing PGVector memory adapter with config:
      {'host': 'pgvector.does-not-exist.svc.cluster.local', 'port': 5432, ...}

AttributeError: 'NoneType' object has no attribute 'backend'
  File ".../pgvector/pgvector.py", line 350, in initialize
    self.kvstore = await kvstore_impl(self.config.persistence)
```

**Key findings:**
- The `persistence` field is **required** for `remote::pgvector` — omitting it crashes llamastack before connectivity is attempted.
- One bad provider config causes the **entire llamastack instance to fail to start**.

#### v2 — With `persistence` field

**Result: Pod failed to start — CrashLoopBackOff**

With `persistence` included, llamastack attempted a real DNS lookup / DB connection at startup:

```
INFO   vector_io::pgvector: Initializing PGVector memory adapter with config:
       {'host': 'pgvector.does-not-exist.svc.cluster.local', 'port': 5432,
        'db': 'vectordb', 'user': 'vectoruser', 'password': '******',
        'persistence': {'namespace': 'vector_io::pgvector-bad', 'backend': 'kv_default'}}

ERROR  vector_io::pgvector: Could not connect to PGVector database server
       │ psycopg2.__init__.py:122 in connect
       OperationalError: could not translate host name
         "pgvector.does-not-exist.svc.cluster.local" to address: Name or service not known

RuntimeError: Could not connect to PGVector database server
```

**Key findings:**
- **Llamastack performs connectivity checks at startup** — attempts a real DB connection during provider initialisation.
- **One bad provider causes the entire instance to fail** — no partial loading of other providers.
- **Error format:** Raw Python traceback. Root cause is `psycopg2.OperationalError` (DNS/connectivity failure), re-raised as `RuntimeError("Could not connect to PGVector database server")`. No structured JSON error.
- DNS resolution failure is fast (not a timeout — fails immediately, no 30s wait).
- **Implication for BFF:** The BFF must validate that vector store endpoints are reachable *before* writing them to the configmap — a single bad provider entry takes down the entire llamastack instance.

---

### Test 01b — Unreachable Qdrant Endpoint

**Config file:** `configmaps/01b-unreachable-endpoint-qdrant.yaml`

**Result: Pod started successfully — Running 1/1**

Unlike pgvector, llamastack made **no connectivity attempt at startup**. There are zero qdrant-related
log lines during startup — the provider loads silently and the instance comes up healthy:

```
GET /v1/health → {"status": "OK"}
```

The pre-registered store also appeared as `"status": "completed"` in `GET /v1/vector_stores` — giving
no indication that the endpoint is unreachable.

The error was only surfaced when the store was actually used — attaching a file triggered the DNS
lookup, which failed:

```bash
POST /v1/vector_stores/vs_test_unreachable_qdrant/files
→ HTTP 200, body:
{
  "status": "failed",
  "last_error": {
    "code": "server_error",
    "message": "[Errno -2] Name or service not known"
  }
}
```

**Key findings:**
- **Pod starts successfully** — a bad qdrant endpoint does not cause a startup failure.
- **No connectivity check at startup** — confirmed with zero qdrant log lines. Consistent with
  the success scenario observations (Tests 00b and 00d).
- **Error is deferred to first use** — surfaces on the first API call that actually touches the
  provider (e.g. attaching a file to the store). The response is HTTP 200 with `"status": "failed"`
  and an error embedded in the response body, not an HTTP error code.
- **`GET /v1/vector_stores` shows `"status": "completed"`** — the store appears healthy until
  first use. There is no way to detect the bad endpoint from the listing alone.
- **Contrast with pgvector:** A bad pgvector endpoint brings the entire instance down at startup.
  A bad qdrant endpoint is invisible at startup and only fails silently at the call site.
- **Implication for BFF:** For qdrant providers, startup success is not a reliable signal that
  the endpoint is valid. The BFF should validate qdrant connectivity independently before writing
  the configmap, as there is no startup-time feedback to rely on.

---

### Test 02 — Missing Embedding Model

**Config file:** `configmaps/02-missing-embedding-model.yaml`
**Base:** qdrant success config (00b) with `embedding_model` in the registered vector store
entry changed to `non-existent-embedding-model`.

**Result: Pod failed to start — CrashLoopBackOff**

Llamastack validated the embedding model reference during the resource registration phase at startup
and raised a clear, named error:

```
llama_stack_api.common.errors.ModelNotFoundError: Model 'non-existent-embedding-model' not found.
Use 'client.models.list()' to list available Models.

  File ".../llama_stack/core/stack.py", line 238, in register_resources
    await method(**{k: getattr(obj, k) for k in obj.model_dump().keys()})
  File ".../llama_stack/core/routing_tables/vector_stores.py", line 83, in register_vector_store
    model = await lookup_model(self, embedding_model)
  File ".../llama_stack/core/routing_tables/common.py", line 261, in lookup_model
    raise ModelNotFoundError(model_id)
```

**Key findings:**
- **Pod fails to start** — the missing embedding model is validated at startup during
  `register_resources`, before any vector store connectivity is attempted.
- **Error is specific and actionable** — `ModelNotFoundError` names the exact missing model ID
  and hints at how to find valid models. Much clearer than the connectivity errors in Test 01.
- **One bad entry crashes the entire instance** — consistent with pgvector connectivity failure.
  No partial loading.
- **Error format:** Python traceback with a named exception class (`ModelNotFoundError`).
  No structured JSON.
- **Implication for BFF:** The BFF must validate that the `embedding_model` specified for a
  vector store is registered in llamastack before writing it to the configmap. The model ID must
  match exactly (including any prefix like `sentence-transformers/`).

---

### Test 03 — Malformed Provider Config (Missing Required Fields)

**Config file:** `configmaps/03-malformed-provider.yaml`
**Change:** `remote::pgvector` provider with `host` and `db` fields omitted entirely.

**Result: Pod failed to start — CrashLoopBackOff**

Pydantic did **not** raise a validation error for the missing `host` field — it silently defaulted
to `localhost`. Llamastack proceeded to attempt a connection and crashed at the connectivity step:

```
psycopg2.OperationalError: connection to server at "localhost" (::1), port 5432 failed:
  Connection refused
  Is the server running on that host and accepting TCP/IP connections?

RuntimeError: Could not connect to PGVector database server
```

**Key findings:**
- **No Pydantic validation error** — `host` is an optional field in the pgvector config model
  with a default of `localhost`. Omitting it is not a config error from llamastack's perspective.
- **`db` field also has a default** — similarly, omitting `db` did not trigger a validation error.
- **Crash is indistinguishable from Test 01a** — the error at the pod level is the same
  `psycopg2.OperationalError` / `RuntimeError` pattern, just with `localhost` as the host and
  "Connection refused" rather than a DNS failure.
- **Implication for BFF:** Llamastack does not validate whether provider config fields are
  semantically meaningful (e.g. whether `host` points at something real). The BFF cannot rely on
  llamastack to catch missing or defaulted fields — it must enforce its own schema validation
  before writing the configmap.

---

### Test 04 — Invalid Credentials

**Config file:** `configmaps/04-invalid-credentials.yaml`
**Base:** pgvector success config (00a) with `password` changed to `this-is-the-wrong-password`.
The pgvector instance at `pgvector.pg-2.svc.cluster.local` was reachable throughout the test.

**Result: Pod failed to start — CrashLoopBackOff**

Llamastack reached the host successfully but authentication failed at startup:

```
INFO   vector_io::pgvector: Initializing PGVector memory adapter with config:
       {'host': 'pgvector.pg-2.svc.cluster.local', 'port': 5432, 'db': 'vectordb',
        'user': 'vectoruser', 'password': '******', ...}

psycopg2.OperationalError: connection to server at "pgvector.pg-2.svc.cluster.local"
  (172.30.64.132), port 5432 failed: FATAL: password authentication failed for user "vectoruser"

RuntimeError: Could not connect to PGVector database server
```

**Key findings:**
- **Pod fails to start** — auth is checked at startup as part of the same connection attempt
  that checks connectivity and extension version.
- **Auth failure is specific and actionable in the raw error** — `psycopg2.OperationalError`
  includes `FATAL: password authentication failed for user "vectoruser"`, making the root cause
  clear in the pod logs.
- **Top-level error is the same generic `RuntimeError`** — the `psycopg2.OperationalError` is
  caught and re-raised as `RuntimeError("Could not connect to PGVector database server")`,
  identical to the DNS failure in Test 01. The detailed cause is only visible one level deeper
  in the traceback.
- **Password is redacted in the startup log** — `'password': '******'` — so credentials are not
  leaked in plain text in the logs.
- **Implication for BFF:** Auth failures and connectivity failures produce the same top-level
  `RuntimeError` — the BFF cannot distinguish them from the llamastack error alone. Both result
  in CrashLoopBackOff. Credential validation must happen before the configmap is written.

---

### Test 05 — Multiple Bad Configurations

**Config file:** `configmaps/05-multiple-bad-configs.yaml`
**Bad entries:**
1. `remote::pgvector` provider pointing at `pgvector.does-not-exist.svc.cluster.local` (unreachable — same as Test 01a)
2. A registered vector store entry referencing `non-existent-embedding-model` (same as Test 02)

**Result: Pod failed to start — CrashLoopBackOff**

Llamastack stopped at the **first** error encountered and never reached the second. The pgvector
connectivity failure (provider instantiation, phase 1) fired before the missing embedding model
check (resource registration, phase 2):

```
psycopg2.OperationalError: could not translate host name
  "pgvector.does-not-exist.svc.cluster.local" to address: Name or service not known

RuntimeError: Could not connect to PGVector database server
```

`ModelNotFoundError` did not appear anywhere in the logs.

**Key findings:**
- **Llamastack stops at the first error** — no aggregation of multiple failures. Only one error
  is reported regardless of how many bad entries are present.
- **Startup phases are sequential and fail-fast:**
  1. Provider instantiation (connectivity checks, Pydantic validation)
  2. Resource registration (embedding model lookup, vector store pre-registration)

  A failure in phase 1 prevents phase 2 from running entirely.
- **Implication for BFF:** The BFF cannot rely on llamastack to surface all problems at once.
  If the configmap contains multiple errors, only the first will be visible in the pod logs.
  All validation must happen in the BFF before the configmap is written — not incrementally
  in response to llamastack error feedback.

---

## Conclusions and BFF Implications

### Startup behaviour by provider type

The most important discovery from this spike is that **providers differ fundamentally in when they
check connectivity**, and this has direct consequences for BFF validation strategy:

| Provider | Connectivity check at startup? | Bad config outcome |
|----------|-------------------------------|-------------------|
| `remote::pgvector` | **Yes** — connects and checks extension version | CrashLoopBackOff |
| `remote::milvus` | **Yes** — logs connection attempt at startup | CrashLoopBackOff (expected) |
| `remote::qdrant` | **No** — defers all connectivity until first use | Pod starts; error surfaces on first API call |

### Llamastack does not do partial loading

A bad provider or resource entry causes the **entire llamastack instance to fail** — there is no
partial loading of the remaining valid config. This is true regardless of whether the error is:
- An unreachable endpoint
- Invalid credentials
- A missing embedding model reference
- A malformed provider config (fields omitted, silently defaulted)

### Llamastack is fail-fast, not fail-all

When multiple problems exist, **only the first error is reported**. Provider instantiation (phase 1)
runs before resource registration (phase 2), so a connectivity failure will mask a missing model
error. The BFF cannot iteratively fix problems based on llamastack feedback — it must validate
everything upfront.

### Error format is never structured JSON

All errors that crash llamastack at startup are raw Python tracebacks in the pod logs. There is
no structured error format, no HTTP response, and no machine-readable signal from the llamastack
process itself. The only observable signal is CrashLoopBackOff.

### BFF validation checklist

Based on the spike findings, the BFF should validate the following **before writing a vector store
provider to the configmap**:

| Concern | Required BFF validation |
|---------|------------------------|
| Provider endpoint reachability | For pgvector/milvus: probe the endpoint before writing. For qdrant: probe independently (startup success is not a signal). |
| Provider credentials | Validate credentials against the real endpoint before writing. Auth and connectivity errors produce the same generic `RuntimeError` in llamastack. |
| `persistence` field | Required for `remote::pgvector` and `remote::milvus`. Omitting it crashes llamastack before any connectivity check. |
| `token` field (milvus) | Required by Pydantic in `0.5.0+rhai0` even for unauthenticated instances. Use `""` for no auth. |
| `embedding_model` reference | Must match an exactly registered model ID (including prefix, e.g. `sentence-transformers/...`). Validated at startup — mismatch crashes the instance. |
| Provider field defaults | `host` and `db` have defaults in the pgvector Pydantic model — omitting them does not raise a validation error but produces a silent misconfiguration. BFF should enforce these fields explicitly. |
| Multiple bad entries | All entries must be individually valid before writing the configmap. Llamastack will only report the first error encountered. |

### Recommended validation strategy: field validation before write

Although probing provider endpoints before writing the configmap would catch connectivity and
credential issues earlier, this approach is not preferred due to the implementation burden it would
place on the BFF — each provider requires a different probe mechanism (PostgreSQL wire protocol
for pgvector, REST calls for milvus and qdrant), adding complexity and dependencies.

Instead, the BFF should perform **field-level validation** before writing the configmap:

- Check that all required fields are present and non-empty for the given provider type (e.g.
  `host`, `db`, `user`, `password` for pgvector — since llamastack silently defaults missing
  fields like `host` to `localhost` rather than rejecting them).
- Check that the `persistence` field is included for providers that require it (`remote::pgvector`,
  `remote::milvus`) — omitting it crashes llamastack before any connectivity attempt.
- Check that `embedding_model` references a model ID registered in llamastack
  (`GET /v1/models` can be used for this without touching the vector store provider at all).
- Apply any basic format validation (e.g. port is a valid integer, URL is well-formed).

This reduces risk without requiring network probes. The remaining risk (unreachable endpoints,
bad credentials) is accepted on the basis that the UI will present users with a structured form
for each provider type, reducing the likelihood of malformed input reaching the BFF.

### `registered_resources.vector_stores` pre-registration works reliably

The `registered_resources.vector_stores` mechanism introduced in llamastack 0.5.0 works as
expected: pre-registered stores appear in `GET /v1/vector_stores` on every startup and survive
pod restarts. This is the correct BFF approach for persisting vector store configuration across
LSD restarts. The `vector_store_name` field (sibling of `vector_store_id`) sets the human-readable
name in API responses.
