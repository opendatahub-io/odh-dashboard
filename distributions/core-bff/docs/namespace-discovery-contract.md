# Core BFF namespace discovery contract (xKS)

How the RHAII UI on xKS learns which namespaces a caller can use and what it may do in each,
when the caller cannot list namespaces cluster-wide.

Tracked by [RHOAIENG-96082](https://redhat.atlassian.net/browse/RHOAIENG-96082). Consumed by
[RHOAIENG-96068](https://redhat.atlassian.net/browse/RHOAIENG-96068) (deploy-target selection),
[RHOAIENG-96067](https://redhat.atlassian.net/browse/RHOAIENG-96067) (composition) and
[RHOAIENG-96070](https://redhat.atlassian.net/browse/RHOAIENG-96070) (model lifecycle). The
OpenAPI definition is `getNamespaceAccess` / `getNamespaceAccessByName` in
`bff/openapi/src/core-bff.yaml`.

> **This is UI guidance, not authorization.** The actions below decide what the UI offers. Every
> operation is still authorized by Kubernetes against the caller's credentials when it is made. A
> namespace that appears here with `deploy: true` can still return 403 on create, and the UI must
> handle that.

## Endpoints

Both are **xKS only**. On OpenShift they are absent (404) and project selection is unchanged.

| Endpoint                                | Purpose                                                       |
| --------------------------------------- | ------------------------------------------------------------- |
| `GET /api/v1/namespace-access`          | Discover the caller's namespaces with their permission matrix |
| `GET /api/v1/namespace-access/{name}`   | Evaluate one namespace (manual entry)                         |

`GET /api/v1/namespace-access` accepts a repeatable `namespace` query parameter (at most 50,
DNS-1123 names) for names the client already knows: entries typed into the manual fallback and
selections remembered in the browser. They are evaluated exactly like any other candidate.

The existing `GET /api/v1/namespaces` and `GET /api/v1/namespaces/{name}` keep their shapes. The
lookup's access review now carries the namespace attribute, as the API server's own request
resolver does for `GET /api/v1/namespaces/<name>`, so a RoleBinding inside the namespace (`admin`,
`edit`, `view`) authorizes the lookup the manual fallback already uses. Before, only a
cluster-scoped grant did. This route is not platform-gated, so the fix also applies on
OpenShift: a project member now gets the same answer from this lookup that a direct
`GET /api/v1/namespaces/<name>` against the API server already gave them.

## Candidates

Candidates only propose names. **No source grants anything**: a candidate is returned only after
the caller's own reviews allow at least one action in it.

| Order | Source                                                         | When                                                     | `source`       |
| ----- | -------------------------------------------------------------- | -------------------------------------------------------- | -------------- |
| 1     | The caller's own namespace list                                | SSAR `list namespaces` (cluster-scoped) allowed          | `cluster-list` |
| 2     | `NAMESPACE_CANDIDATES`                                         | Caller cannot list                                       | `candidates`   |
| 3     | Service-account label enumeration (`NAMESPACE_DISCOVERY_LABEL_SELECTOR`) | Caller cannot list, selector configured        | `candidates`   |
| 4     | `namespace` query parameters                                   | Always                                                   | either         |

`source: candidates` tells the UI the list is not exhaustive and manual entry should stay
available.

### The service-account exception

The label enumeration is the only place discovery uses the dashboard service account, and it is
**off by default**. Enabling it requires a cluster-scoped `list` on `namespaces` for the service
account, which `manifests/base` does not grant. It is narrow by construction:

- It lists only namespaces matching the configured selector.
- It contributes names. Its copy of a namespace's metadata (display name, phase) is used only
  when the caller's own `get` on that namespace is allowed.
- A name it contributes reaches the caller only after the caller's reviews authorize it, so a
  label (for example `opendatahub.io/dashboard=true`) never establishes access.

Prefer `NAMESPACE_CANDIDATES` where the set of RHAII namespaces is known at install time.

## Permission matrix

Evaluated in every candidate namespace with a `SelfSubjectAccessReview` as the caller.
`SelfSubjectRulesReview` is not used: it is documented as incomplete under webhook authorizers,
which AKS with Entra ID authorization uses.

Before the per-namespace reviews, every entry (plus `get namespaces`) is reviewed once with no
namespace. RBAC allows a namespaced resource reviewed without a namespace only through a
cluster-wide grant, which then holds in every namespace, so those verbs are reported `allowed`
without a per-namespace review. A cluster admin's discovery therefore costs about 17 reviews in
total instead of 16 per namespace. A denied or failed cluster-wide review proves nothing and falls
through to the per-namespace review.

| Key (`<group>/<resource>`)                         | Verbs                                                    | Why                                                                             |
| -------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `serving.kserve.io/llminferenceservices`           | `get` `list` `watch` `create` `update` `patch` `delete`  | Model lifecycle: list/inspect/watch, deploy, edit, delete (finalizers run server-side) |
| `serving.kserve.io/llminferenceserviceconfigs`     | `get` `list`                                             | Namespace-local configs the wizard offers                                       |
| `core/pods`                                        | `get` `list`                                             | Deployment status and troubleshooting                                           |
| `core/secrets`                                     | `create` `get` `patch` `delete`                          | Token-authentication Secrets; `patch` sets the owner reference to the LLMInferenceService, `delete` is explicit cleanup |
| `core/namespaces`                                  | `get` (on the namespace itself)                          | Whether display name and phase can be read                                      |

Cleanup of owned Secrets after a delete is Kubernetes garbage collection and needs no caller
permission; `delete` on Secrets covers explicit cleanup only. On clusters that enable the
`OwnerReferencesPermissionEnforcement` admission plugin, setting `blockOwnerDeletion` additionally
needs `update` on `llminferenceservices/finalizers`; vanilla AKS does not enable it.

Evaluated once, in the dashboard namespace (`shared`):

| Key                                                 | Verbs         | Why                                   |
| --------------------------------------------------- | ------------- | ------------------------------------- |
| `infrastructure.opendatahub.io/hardwareprofiles`    | `get` `list`  | Retained shared HardwareProfile reads |
| `serving.kserve.io/llminferenceserviceconfigs`      | `get` `list`  | Retained shared config reads          |

Bootstrap and the wizard need **no shared Secret access**; Secrets are only reviewed in the
target namespace.

Each review reports `allowed`, `denied` or `error`. `error` means the review request failed
(API server unreachable, timeout, request deadline) and is never treated as allowed. A review
that completes with `allowed: false` and a `status.evaluationError` is reported as `denied`, per the
[error contract](./error-contract.md) rule that completed reviews use `status.allowed`. On a webhook
authorizer that reports its own failures this way, such a namespace is hidden rather than reported
as a failure.

### Actions

| Action            | Requires every one of                                        |
| ----------------- | ------------------------------------------------------------ |
| `view`            | `llminferenceservices` `list`, `get`                         |
| `deploy`          | `llminferenceservices` `create`                              |
| `edit`            | `llminferenceservices` `patch`                               |
| `delete`          | `llminferenceservices` `delete`                              |
| `manageTokenAuth` | `secrets` `create`, `get`, `patch`, `delete`                 |

An action is `true` only when every review it needs is `allowed`; a `denied` or `error` review
hides it. A namespace is returned when at least one action is `true`. Admin flags, admission,
dashboard labels and unrelated permissions (for example `pods` alone) never enable an action.

A deploy that uses token authentication needs both `deploy` and `manageTokenAuth`; a read-only
user gets `view` only and is offered no mutation.

## Outcomes

| Situation                                                  | List endpoint                                           | Single endpoint |
| ---------------------------------------------------------- | ------------------------------------------------------- | --------------- |
| Authorized namespaces found                                | 200, `namespaces: [...]`                                | 200             |
| No candidates, or every candidate denied                   | 200, `namespaces: []`, `complete: true`                 | 403             |
| Namespace does not exist, caller cannot read namespaces    | not listed                                              | 403 (same as denied) |
| Namespace does not exist, caller holds cluster-wide grants on matrix resources but no `get namespaces` | listed without `phase` | 200 without `phase` |
| Namespace does not exist, caller may read it               | not listed                                              | 404             |
| Some reviews or a source failed                            | 200, `complete: false`, `issues` lists codes and counts | 503 if no action could be decided |
| Every source or review failed and nothing was found        | 503 `SERVICE_UNAVAILABLE`                               | 503             |
| More than 200 candidates                                   | 200, requested names first then the rest by name, `CANDIDATES_TRUNCATED` | n/a |
| Request deadline (25 s) expired                            | pending reviews count as failed, `DISCOVERY_DEADLINE_EXCEEDED` | 503      |

`issues` never contains a namespace name, and error responses never echo one, so a failure cannot
reveal a namespace the caller is not authorized for. Counts can reflect the size of the
operator-configured sources (for example how many candidates were truncated); they never carry
names. Issue codes: `CLUSTER_LIST_REVIEW_FAILED`, `CLUSTER_LIST_FAILED`, `LABEL_DISCOVERY_FAILED`,
`ACCESS_REVIEW_FAILED`, `CANDIDATES_TRUNCATED`, `SHARED_ACCESS_REVIEW_FAILED` (dashboard-namespace
reads; never causes a 503 on its own), `DISCOVERY_DEADLINE_EXCEEDED`.

If the cluster-list review or the list itself fails, discovery falls back to the configured
candidates. That fallback is safe because candidates grant nothing.

## Cost

One cluster-wide pass of 17 reviews, then for each candidate one review per matrix verb not
already granted cluster-wide (at most 16), plus one namespace read when permitted. Reviews run
concurrently with at most 16 in flight per request. The caller's per-request client allows 50
requests per second (burst 100) instead of client-go's 5/10 default. A request evaluates at most
200 candidates and stops after 25 seconds, below the server's 60-second write timeout. Results are
not cached server-side; the response carries the per-identity no-store headers from the bootstrap
contract.

## Example

```json
{
  "data": {
    "source": "candidates",
    "complete": true,
    "issues": [],
    "namespaces": [
      {
        "name": "team-b",
        "phase": "Active",
        "displayName": "team-b",
        "actions": { "view": true, "deploy": false, "edit": false, "delete": false, "manageTokenAuth": false },
        "permissions": {
          "serving.kserve.io/llminferenceservices": { "get": "allowed", "list": "allowed", "watch": "allowed", "create": "denied", "update": "denied", "patch": "denied", "delete": "denied" },
          "serving.kserve.io/llminferenceserviceconfigs": { "get": "denied", "list": "denied" },
          "core/pods": { "get": "denied", "list": "denied" },
          "core/secrets": { "create": "denied", "get": "denied", "patch": "denied", "delete": "denied" },
          "core/namespaces": { "get": "allowed" }
        }
      }
    ],
    "shared": {
      "namespace": "opendatahub",
      "permissions": {
        "infrastructure.opendatahub.io/hardwareprofiles": { "get": "allowed", "list": "allowed" },
        "serving.kserve.io/llminferenceserviceconfigs": { "get": "allowed", "list": "allowed" }
      }
    }
  }
}
```

## Where it is enforced

- `bff/internal/repositories/namespace_access.go` — candidates, matrix, actions, outcomes
- `bff/internal/repositories/namespace_access_test.go` — matrix, mixed/read-only access, failed
  reviews, empty results, fallback, label exception, concurrency bound
- `bff/internal/api/namespace_access_handler_test.go` — envtest with real RBAC
- `contract-tests/__tests__/xks/testCoreBffNamespaceAccess.test.ts` and
  `contract-tests/__tests__/openshift/testCoreBffNamespaceAccess.test.ts`
