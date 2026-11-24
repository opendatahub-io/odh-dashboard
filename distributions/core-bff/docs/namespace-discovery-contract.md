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

With `cluster-list`, the caller's list is also authoritative for what exists: a `namespace` query
parameter it does not contain is dropped, rather than reported as usable from cluster-wide grants.
The candidate cap does not apply to it, so a caller who could already list every namespace keeps
seeing every one they are authorized in (see [Cost](#cost)).

`NAMESPACE_DISCOVERY_LABEL_SELECTOR` is trimmed once at startup; a whitespace-only value disables
label discovery, as validation treats it, instead of matching every namespace.

### The service-account exception

The label enumeration is the only place discovery uses the dashboard service account. The BFF
leaves it off unless `NAMESPACE_DISCOVERY_LABEL_SELECTOR` is set, and it requires a cluster-scoped
`list` on `namespaces` for the service account. The RHAII bundle
(`manifests/distributions/rhaii`) turns it on with `opendatahub.io/dashboard=true` and grants
that `list`; `manifests/base` grants neither. The [bootstrap contract](./bootstrap-contract.md#service-account-permissions)
lists it as the one optional service-account permission on `namespaces`. The final RHAII manifest
RBAC is owned by [RHOAIENG-104119](https://redhat.atlassian.net/browse/RHOAIENG-104119). It is
narrow by construction:

- It lists only namespaces matching the configured selector.
- It contributes names. Its copy of a namespace's metadata (display name, phase) is used only
  when the caller's own `get` on that namespace is allowed.
- A name it contributes reaches the caller only after the caller's reviews authorize it, so a
  label (for example `opendatahub.io/dashboard=true`) never establishes access.

`NAMESPACE_CANDIDATES` remains available where the set of RHAII namespaces is known at install
time. A richer source (for example one the operator manages, or a UX for registering namespaces)
is a possible future improvement, to be agreed with PM and UX.

## Permission matrix

Evaluated in every candidate namespace with a `SelfSubjectAccessReview` as the caller.
`SelfSubjectRulesReview` is not used: it is documented as incomplete under webhook authorizers,
which AKS with Entra ID authorization uses.

Every review names the target namespace. A review made without a namespace is never reused for
a named one: authorizers such as webhooks may decide per namespace, so a cluster-wide answer does
not prove access in any particular namespace. The only namespace-less review is the cluster-scoped
`list namespaces` that picks the candidate source.

The reviews the actions depend on run first. A namespace where none of them enables an action is
not returned, and its remaining reviews are skipped.

| Key (`<group>/<resource>`)                         | Verbs                                                    | Why                                                                             |
| -------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `serving.kserve.io/llminferenceservices`           | `get` `list` `watch` `create` `update` `patch` `delete`  | Model lifecycle: list/inspect/watch, deploy, edit, start/stop, delete (finalizers run server-side) |
| `serving.kserve.io/llminferenceserviceconfigs`     | `get` `list`                                             | Namespace-local configs the wizard offers (optional detail)                     |
| `core/pods`                                        | `get` `list`                                             | Deployment status and troubleshooting (optional detail)                         |
| `core/secrets`                                     | `create` `get` `list` `update` `patch` `delete`          | Token-authentication Secrets; `list` reads a deployment's existing tokens, `update` replaces an existing token Secret, `patch` sets the owner reference to the LLMInferenceService, `delete` is explicit cleanup |
| `core/serviceaccounts`                             | `get` `create`                                           | The token ServiceAccount, created when missing                                  |
| `rbac.authorization.k8s.io/roles`                  | `get` `create`                                           | The Role that lets the token read its model, created when missing               |
| `rbac.authorization.k8s.io/rolebindings`           | `get` `create`                                           | The RoleBinding to that Role, created when missing                              |
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

Each review reports `allowed`, `denied` or `error`:

- `allowed` when an authorizer allowed it, and `denied` when one denied it or none allowed it and
  none reported an error. A definitive decision wins over any `status.evaluationError`.
- `error` when the review request failed (API server unreachable, timeout, request deadline) or the
  review was indeterminate: it completed with neither `allowed` nor `denied` and with a
  `status.evaluationError`, as when an authorization webhook fails. The request might have been
  allowed, so it is neither a grant nor a denial. `error` is never treated as allowed and is
  reported in `issues`.

This is specific to discovery, where an authorizer failure must not look like an empty result. The
[error contract](./error-contract.md) rule that other access checks use `status.allowed` is
unchanged. RBAC also reports an `evaluationError` when one of the caller's own bindings references a
missing role; if nothing else decides, that review is reported as `error` as well.

### Actions

| Action            | Requires every one of                                        |
| ----------------- | ------------------------------------------------------------ |
| `view`            | `llminferenceservices` `list`, `get`, `watch`: the deployments page watches the models it lists |
| `deploy`          | `llminferenceservices` `create`                              |
| `edit`            | `llminferenceservices` `patch` and `update`                  |
| `startStop`       | `llminferenceservices` `patch`: starting and stopping patch an annotation |
| `delete`          | `llminferenceservices` `delete`                              |
| `manageTokenAuth` | `secrets` `create`, `get`, `list`, `update`, `patch`, `delete`; `serviceaccounts`, `roles` and `rolebindings` `get`, `create` |

An action is `true` only when every review it needs is `allowed`; a `denied` or `error` review
hides it. A namespace is returned when at least one action is `true`. Admin flags, admission,
dashboard labels and unrelated permissions (for example `pods` alone) never enable an action.

A deploy that uses token authentication needs both `deploy` and `manageTokenAuth`; a read-only
user gets `view` only and is offered no mutation. `configs` and `pods` are reported but enable no
action: they are optional details, and the UI degrades without them.

Creating the token Role and RoleBinding is also subject to Kubernetes' RBAC escalation check: the
caller must hold the permissions the Role grants (`get` on the deployment's model). Any caller with
`view` does, so discovery does not review `escalate` or `bind`.

## Outcomes

| Situation                                                  | List endpoint                                           | Single endpoint |
| ---------------------------------------------------------- | ------------------------------------------------------- | --------------- |
| Authorized namespaces found                                | 200, `namespaces: [...]`                                | 200             |
| No candidates, or every candidate denied                   | 200, `namespaces: []`, `complete: true`                 | 403             |
| Namespace does not exist, caller cannot read namespaces    | not listed                                              | 403 (same as denied) |
| Namespace does not exist, caller holds cluster-wide grants on matrix resources but no `get namespaces` | listed with `phase: Unknown` | 200 with `phase: Unknown` |
| Namespace does not exist, caller may read it               | not listed                                              | 404             |
| Some reviews or a source failed, and at least one candidate was decided (authorized, denied or not found; a candidate is denied when no action is possible even if every failed review had been allowed) | 200, `complete: false`, `issues` lists codes and counts, including failures in namespaces that are still returned; `namespaces` may be empty | 503 if no action could be decided |
| Nothing could be decided: every candidate's reviews failed, or there were no candidates and a source failed | 503 `SERVICE_UNAVAILABLE`, `error.issues` lists the codes and counts | 503 |
| More than 200 candidates with `source: candidates`         | 200, requested names first then the rest by name, `CANDIDATES_TRUNCATED` | n/a |
| Request deadline (25 s) expired                            | pending reviews count as failed, `DISCOVERY_DEADLINE_EXCEEDED`; 200 or 503 by the rows above | 503, even if an action was already allowed |

`issues` never contains a namespace name, and error responses never echo one, so a failure cannot
reveal a namespace the caller is not authorized for. Counts can reflect the size of the
operator-configured sources (for example how many candidates were truncated); they never carry
names. Issue codes: `CLUSTER_LIST_REVIEW_FAILED`, `CLUSTER_LIST_FAILED`, `LABEL_DISCOVERY_FAILED`,
`ACCESS_REVIEW_FAILED`, `CANDIDATES_TRUNCATED`, `SHARED_ACCESS_REVIEW_FAILED` (dashboard-namespace
reads; never causes a 503 on its own), `DISCOVERY_DEADLINE_EXCEEDED`, `NAMESPACE_READ_FAILED` (the
caller may `get` a returned namespace but reading it failed, so its `phase` is `Unknown` for a
transient reason; the single endpoint still returns it with `phase: Unknown`).

If the cluster-list review or the list itself fails, discovery falls back to the configured
candidates. That fallback is safe because candidates grant nothing.

## Phase

`phase` is always present. It is the namespace's `status.phase` (`Active` or `Terminating`)
when the namespace object could be read, and `Unknown` when the caller is authorized in the
namespace but may not `get` the Namespace object. An `Unknown` namespace is usable: the UI offers
it and labels it by its name, since `displayName` is then absent.

`isAiProject` follows the rule of `/api/v1/namespaces`: true only when the `opendatahub.io/dashboard`
label is exactly `true`. It is omitted when the namespace object could not be read (`phase:
Unknown`): the classification is then unknown, not false. The RHAII selector keeps such a
namespace in its default "AI projects only" filter, without the AI badge, so it stays reachable.

## UI consumption (RHAII)

`distributions/rhaii/src/context/fetchNamespaces.ts` calls `GET /api/v1/namespace-access` and
`GET /api/v1/namespace-access/{name}`. A 404 means the endpoints are absent (not xKS), and the UI
falls back to `GET /api/v1/namespaces` and its lookup, unchanged. With discovery:

- Only `source: cluster-list` with `complete: true` is a complete listing. Anything else
  (`source: candidates`, failed reviews, the candidate cap) is shown as a partial listing: the
  authorized namespaces appear and manual entry stays available.
- A `503` falls back to `GET /api/v1/namespaces`. Listing a namespace says nothing about the
  caller's actions in it, so those names are offered only in the project selector: they are not in
  `projects` or `modelServingProjects` (nothing is watched), are not deployment targets and offer
  no action. The listing counts as partial, so selecting one, or entering any name, looks it up by
  name first, and the lookup decides what is watched and offered.
- `projects` and `modelServingProjects` hold only namespaces with `actions.view`: listing
  deployments in a create-only namespace would fail. A create-only namespace is still a deployment
  target, and a caller with only such namespaces gets the deployments page's **Deploy model**
  empty state instead of **No projects**.
- The deployments page needs only `view` to list a project's models. Pod and config reads only add
  details, so a denied one is not reported as a page error; other failures still are.
- `getProjectDeploymentActions` on `ProjectsContext` carries `actions.edit`, `actions.startStop`,
  `actions.delete` and `actions.manageTokenAuth`. The deployments table offers Edit only with
  `edit`, Start and Stop (including Stop in the status modal) only with `startStop`, and Delete
  only with `delete`.
- The deployment wizard selects, edits and saves token authentication only with `manageTokenAuth`
  as well as RoleBinding create access. Without it the field is disabled and holds only the
  existing tokens, which are left as they are; a draft token is kept, not saved, and comes back if
  the permission does. Saving a new token that cannot be provisioned is rejected before anything
  is written, in the LLM-d and KServe deploy paths alike. Wizard state without
  `canManageTokenAuth` (older callers) keeps the RoleBinding check alone.
- A lookup the BFF denies (`403`, or `404` for a missing namespace) drops the project this session
  cached, so it is no longer offered as a target. A failed lookup keeps it. An older lookup that
  completes after a newer one is ignored, including the background restoration of recent
  projects. A new deployment is saved only while its project is still a deployment target;
  editing an existing deployment is not affected.
- Permissions are checked in one project, so YAML must deploy to it: the selected project for a
  new deployment, the deployment's own for an edit. A YAML `metadata.namespace` that differs is
  rejected on save.
- `Active` and `Unknown` namespaces are selectable; `Terminating` ones are not.
- Only namespaces with `actions.deploy` are deployment targets. The provider sets
  `deploymentTargetProjects` on `ProjectsContext`; the model deployment wizard's project selector,
  its check of a target passed in by navigation, and the **Deploy model** buttons (disabled with a
  reason in a project that is not a target, or when there is none) use that subset. `projects` keeps every
  namespace for browsing. A host that does not set the field keeps today's behaviour.
- Waiting for a newly created project polls discovery and, when the listing is partial and the
  project is not in it, looks it up by name. A partial result is merged with the projects already
  known (manual entry, remembered selections) and marks the listing partial.

## Cost

For each candidate, the 19 action reviews; for a namespace that is returned, 4 more matrix reviews
plus the named `get` (24 in all), and one namespace read when permitted. Reviews run concurrently
with at most 16 in flight per request, which is what bounds the load on the API server, and at
most 16 namespaces are evaluated at a time, which bounds the request's goroutines. Namespaces not
started when the request is cancelled or its deadline passes count as failed reviews. The
caller's per-request client allows 400 requests per second (burst 800) instead of client-go's 5/10
default, which would otherwise throttle discovery to minutes. A request from configured
candidates and label discovery evaluates at most 200 of them; a caller's own cluster list is not
capped. Every request stops after 25 seconds, below the server's 60-second write timeout. Results are
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
        "isAiProject": false,
        "actions": { "view": true, "deploy": false, "edit": false, "startStop": false, "delete": false, "manageTokenAuth": false },
        "permissions": {
          "serving.kserve.io/llminferenceservices": { "get": "allowed", "list": "allowed", "watch": "allowed", "create": "denied", "update": "denied", "patch": "denied", "delete": "denied" },
          "serving.kserve.io/llminferenceserviceconfigs": { "get": "denied", "list": "denied" },
          "core/pods": { "get": "denied", "list": "denied" },
          "core/secrets": { "create": "denied", "get": "denied", "list": "denied", "update": "denied", "patch": "denied", "delete": "denied" },
          "core/serviceaccounts": { "get": "denied", "create": "denied" },
          "rbac.authorization.k8s.io/roles": { "get": "denied", "create": "denied" },
          "rbac.authorization.k8s.io/rolebindings": { "get": "denied", "create": "denied" },
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
