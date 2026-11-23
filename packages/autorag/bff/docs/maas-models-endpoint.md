# Hosted MaaS Models Endpoint

## Endpoint

```text
GET /api/v1/maas/models?namespace=<namespace>&secretName=<secret>
```

The endpoint is protected by the same namespace and service-access middleware as the other service-backed endpoints. It calls the hosted MaaS API directly; it does not call the MaaS BFF.

## Selected Secret

The selected Kubernetes Secret must contain:

| Key             | Required value                                                                  |
| --------------- | ------------------------------------------------------------------------------- |
| `MAAS_BASE_URL` | Hosted MaaS service base URL, such as `https://maas.apps.example.com/maas-api/` |
| `MAAS_API_KEY`  | API key used for the upstream `Authorization: Bearer` header                    |

Both values must be non-empty for this endpoint. Other Secret keys do not affect this per-request credential validation.

The BFF calls:

```text
GET {MAAS_BASE_URL}/v1/models
Authorization: Bearer <MAAS_API_KEY>
```

Valid base paths are preserved before `/v1/models` is appended.

## Response

The response is an AutoRAG-owned envelope containing the complete unfiltered upstream model list:

```json
{
  "data": {
    "models": [
      {
        "id": "granite-3-8b-instruct",
        "display_name": "Granite 3 8B Instruct",
        "description": "IBM Granite 3 8B instruction-tuned language model.",
        "owned_by": "maas-models",
        "ready": true
      }
    ]
  }
}
```

Only `id`, optional display metadata, optional `owned_by`, and `ready` are exposed. URLs, subscriptions, raw metadata, capabilities, categories, and pagination are not exposed. The BFF does not classify or filter models by category.

## Errors and Security

- `400`: missing or invalid query parameters, incomplete selected Secret, or invalid MaaS URL
- `401`/`403`: upstream or Kubernetes authorization failure
- `404`: selected Secret or upstream resource not found
- `502`: invalid or unreachable upstream response/connection
- `503`: MaaS temporarily unavailable or timed out

The BFF requires HTTPS for MaaS URLs and rejects embedded credentials, query strings, fragments, unsafe paths, blocked address resolutions, redirects, oversized responses, and timed-out operations. For a private disconnected-cluster ingress address, AutoRAG calls the in-cluster MaaS BFF `GET /api/v1/gateway-url` and accepts a private resolution only when the selected Secret's exact HTTPS origin matches the discovered `maas-default-gateway` origin. The discovery result is cached for five minutes; an expired or unavailable result never grants private-host access. A short negative cache avoids repeatedly hammering an unavailable MaaS BFF. Public MaaS URLs continue under the normal SSRF policy. The BFF synchronizes only `openshift-ingress-operator/router-ca/tls.crt` into `autorag-router-ca-bundle`, adds it to the in-memory trust pool, and refreshes the trust bundle periodically; private keys are not used, copied, persisted, or logged, and Secret values, API keys, and raw upstream response bodies are not logged.

## Local Mock

For local contract testing without a hosted MaaS service:

```bash
cd packages/autorag/bff
make run DEV_MODE=true MOCK_K8S_CLIENT=true MOCK_MAAS_CLIENT=true
```
