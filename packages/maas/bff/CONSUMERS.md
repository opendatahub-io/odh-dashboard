# MaaS BFF — downstream consumers

The MaaS BFF is used by the Mod Arch UI **and** by other packages that call it over HTTP (inter-BFF). The endpoints and JSON shapes below are a **stable contract**: changing them without coordinating with **every listed consumer** can be a breaking change.

Field-level documentation: [`openapi.yaml`](./openapi.yaml) in this directory.

---

## Contract endpoints (MaaS BFF)

These paths represent the **standardized inter-BFF API** for all odh-dashboard packages. Please update this table whenever a new consumer requires additional routes.

| Method | Path               | Role                                                |
| :----- | :----------------- | :-------------------------------------------------- |
| `POST` | `/api/v1/api-keys` | Create API key (including ephemeral keys)           |
| `GET`  | `/api/v1/models`   | List models, optional headers forwarded to maas-api |

---

## Known consumers

Keep this list current: **add a row in the same PR** that introduces or changes a dependency on the contract endpoints above.

| Consumer package      | Notes (public routes, client, PRs)                                                                    |
| :-------------------- | :---------------------------------------------------------------------------------------------------- |
| `packages/gen-ai/bff` | `POST …/bff/maas/tokens` → `POST /api/v1/api-keys` <br> `GET …/bff/maas/models` → `GET /api/v1/models`|

---

## Integration notes (any consumer)

- **Base URL:** Callers typically use a base URL ending in **`/api/v1`** and append the path (e.g. `POST …/api-keys` relative to that base).
- **Create key:** Request body uses the mod-arch envelope; include **`ephemeral: true`** when the use case is short-lived keys (callers may hardcode this in middleware so end users do not need to).
+- **List models:** Outbound **`X-MaaS-Return-All-Models`** (or other custom headers) may be set by the **caller** or its middleware so responses include richer subscription aggregation. Note: headers are forwarded to the MaaS API **except** `Content-Type` and `Authorization`, which the MaaS BFF manages itself on the upstream call.- **Auth:** Each consumer must send credentials the MaaS BFF expects (e.g. token header for `user_token` mode, or Kubeflow identity headers for `internal` mode).

---

## Gen-AI BFF — reference consumer (`packages/gen-ai/bff`)

Today only the Gen-AI BFF calls the contract endpoints in production. The bullets below are the description of that integration.

- **`ephemeral: true`** is intended to be set when creating keys through this path so keys are short-lived; callers of Gen-AI need not send it if the BFF always sets it.
- Inter-BFF middleware may set **`X-MaaS-Return-All-Models: true`** on outbound calls to the MaaS BFF so aggregated subscription metadata can appear on model list entries.
- Auth to the MaaS BFF uses the Gen-AI BFF’s configured token header (often **`x-forwarded-access-token`**).

---

## Expected request and response shapes (MaaS BFF)

### `POST /api/v1/api-keys`

**Request body** — mod-arch envelope:

```json
{
  "data": {
    "name": "string (required)",
    "description": "string (optional)",
    "expiresIn": "string (optional, e.g. duration accepted by maas-api)",
    "subscription": "string (required)",
    "ephemeral": true
  }
}
```

**Success `201 Created`**

```json
{
  "data": {
    "key": "string",
    "keyPrefix": "string",
    "id": "string",
    "name": "string",
    "createdAt": "RFC3339 date-time",
    "expiresAt": "RFC3339 date-time or omitted"
  }
}
```

### `GET /api/v1/models`

**Request:** no body. Optional headers are forwarded to maas-api (except `Content-Type` and `Authorization`, which the MaaS BFF sets on the upstream call).

**Success `200 OK`**

```json
{
  "data": {
    "object": "list",
    "data": [
      {
        "id": "string",
        "object": "model",
        "created": 0,
        "owned_by": "string (e.g. namespace/name)",
        "ready": true,
        "url": "string (optional)",
        "modelDetails": { },
        "kind": "string (optional)",
        "subscriptions": [ ]
      }
    ]
  }
}
```

Each item’s optional fields match **`components/schemas/Model`** (and related schemas) in `openapi.yaml`.

---

## Breaking-change policy

1. **Do not** remove, rename, or change the semantics of the **contract endpoints** or their JSON shapes in a way that breaks existing consumers without a **coordinated** release.
2. **Coordinate** with the maintainers of every package listed under **Known consumers** (and any you know rely on the same paths) before shipping incompatible changes; treat these surfaces like a **versioned public API**.
3. Prefer additive changes (new optional fields, new endpoints) when possible.
4. Update **`openapi.yaml`**, this file, and **each affected consumer’s** contracts or tests when the agreement changes.

---

## Contact and escalation

- **New dependency:** If your package starts calling the MaaS BFF for production flows, add it to **Known consumers** in a PR.
- **Ownership:** Consumer packages own their clients and middleware; MaaS BFF owners own `packages/maas/bff`. Cross-cutting work can be tracked in your team’s Jira (e.g. epic for inter-BFF MaaS alignment).
