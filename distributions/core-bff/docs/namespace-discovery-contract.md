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
| 3     | `namespace` query parameters                                   | Always                                                   | either         |

`source: candidates` tells the UI the list is not exhaustive and manual entry should stay
available.

With `cluster-list`, the caller's list is also authoritative for what exists: a `namespace` query
parameter it does not contain is dropped, rather than reported as usable from cluster-wide grants.
The candidate cap does not apply to it, so a caller who could already list every namespace keeps
seeing every one they are authorized in, within the request deadline (see [Cost](#cost)): on a
cluster with more namespaces than one request can review, the rest are reported as failed reviews
and the listing is partial.

### No service-account access

Discovery never uses the dashboard service account. Every candidate and every decision comes from
the caller's own credentials, so the service account needs no permission on `namespaces` (see the
[bootstrap contract](./bootstrap-contract.md#service-account-permissions)). A caller who can
neither list namespaces nor reach a configured candidate can still open a project by name: the UI
looks it up with `GET /api/v1/namespace-access/{name}` (or sends it as a `namespace` query
parameter), and it is returned only if the caller's reviews allow it.

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
| `serving.kserve.io/llminferenceserviceconfigs`     | `get` `list` `watch` `update` `patch`                    | Namespace-local configs: a deployment's own config copy (its `baseRefs`), which the deployments page watches, the edit wizard loads, and saving an edit writes back |
| `core/pods`                                        | `get` `list`                                             | Deployment status and troubleshooting (optional detail)                         |
| `core/secrets`                                     | `create` `get` `list` `update` `delete`                  | Token-authentication Secrets; `list` reads a deployment's existing tokens, `update` replaces an existing token Secret, `delete` removes a token, and `get` reads the Hugging Face token Secret when editing. The owner reference is set in the object itself |
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
unchanged. A binding of the caller's to a missing role is not an authorizer error: RBAC reports it as the
reason, so the review is `denied` unless something else allows it.

### Actions

| Action            | Requires every one of                                        |
| ----------------- | ------------------------------------------------------------ |
| `view`            | `llminferenceservices` `list`, `get`. `watch` is reported but not required: without it the deployments page polls the list instead of watching |
| `deploy`          | `llminferenceservices` `create`                              |
| `edit`            | `llminferenceservices` `patch` and `update`; `llminferenceserviceconfigs` `get`, `list`, `update`, `patch`; `secrets` `get`, `list`; `serviceaccounts` `get`. The edit wizard first loads the deployment's config copy, its token Secrets and its Hugging Face token ServiceAccount and Secret; without them it cannot load the deployment, and saving would drop its config reference or its tokens. Saving writes the config copy back. As with `view`, the config `watch` is reported, not required |
| `startStop`       | `llminferenceservices` `patch`: starting and stopping patch an annotation |
| `delete`          | `llminferenceservices` `delete`                              |
| `createTokenAuth` | `secrets` `create`; `serviceaccounts`, `roles` and `rolebindings` `get`, `create`; `llminferenceservices` `get`. What token authentication on a new deployment needs |
| `manageTokenAuth` | `createTokenAuth`, plus `secrets` `list`, `update`, `delete`. What managing the tokens of an existing deployment needs: they are listed, replaced on every save, and deleted when removed |

An action is `true` only when every review it needs is `allowed`; a `denied` or `error` review
hides it. A namespace is returned when at least one action is `true`. Admin flags, admission,
dashboard labels and unrelated permissions (for example `pods` alone) never enable an action.

Actions are decided per namespace, not per deployment: `edit` requires the Hugging Face token
ServiceAccount and Secret reads, and the config writes, even where no deployment uses a Hugging
Face token or a config copy, because the edit wizard needs them for any that does.

The token actions are advisory: token setup reuses the ServiceAccount, Role and RoleBinding where
they already exist, so a caller without `createTokenAuth` may still set tokens up in a namespace
where they were pre-provisioned. Only Kubernetes can decide that; a read-only
user gets `view` only and is offered no mutation. `pods` are reported but enable no action: they
only add status details, and the UI degrades without them.

Creating the token Role and RoleBinding is also subject to Kubernetes' RBAC escalation check: the
caller must hold the permissions the Role grants, `get` on the deployment's model. That is why
both token actions require it; a create-only deployer gets `deploy` without token authentication.

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
| More than 200 candidates with `source: candidates`         | 200, `complete: false`, requested names first then the rest by name, `CANDIDATES_TRUNCATED` | n/a |
| Request deadline (25 s) expired                            | pending reviews count as failed, `DISCOVERY_DEADLINE_EXCEEDED`; 200 or 503 by the rows above | 503, even if an action was already allowed |

`issues` never contains a namespace name, and error responses never echo one, so a failure cannot
reveal a namespace the caller is not authorized for. Counts can reflect the size of the
operator-configured sources (for example how many candidates were truncated); they never carry
names. Issue codes: `CLUSTER_LIST_REVIEW_FAILED`, `CLUSTER_LIST_FAILED`,
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

- Only `source: cluster-list` with `complete: true` is a complete listing. `complete` is `false`
  whenever an issue was recorded, truncation and a failed shared review included. Anything else
  (`source: candidates`, failed reviews, the candidate cap) is shown as a partial listing: the
  authorized namespaces appear and manual entry stays available.
- A `503` falls back to `GET /api/v1/namespaces`. Listing a namespace says nothing about the
  caller's actions in it, so those names are offered only in the project selector: they are not in
  `projects` or `modelServingProjects` (nothing is watched), are not deployment targets and offer
  no action. The listing counts as partial, so selecting one, or entering any name, looks it up by
  name first, and the lookup decides what is watched and offered. Without the unified project
  selector (the default), the page's selector has no manual entry, so after a discovery failure
  (a `503` or a partial listing) the provider looks up, four at a time, up to 50 names: the stored
  preference, the recent projects and the listed names. Each one a lookup verifies is added with
  its actions. The page reports itself loaded once those lookups end, or after 30 seconds, and
  later lookups still add projects. Where nothing is known (for example the fallback list is
  forbidden too), the **No projects** empty state offers to open a project by name
  (`findProject` on `ProjectsContext`), through the same lookup.
- `projects` and `modelServingProjects` hold only namespaces with `actions.view`: listing
  deployments in a create-only namespace would fail. A create-only namespace is still a deployment
  target, and a caller with only such namespaces gets the deployments page's **Deploy model**
  empty state instead of **No projects**.
- The deployments page needs only `view` to list a project's models. Pod and config reads only add
  details, so where the host reports actions for the project (RHAII with discovery) a denied Pod
  read is not a page error, and a denied config read is not one while Edit is not offered. With
  Edit offered (for example access revoked mid-session), and everywhere else, a denied config read
  stays an error, since an edit without the config would drop it. Discovery reviews
  LLMInferenceServices only: a denied KServe InferenceService read shows no KServe deployments
  instead of an error (a denied ServingRuntime read stays one), and KServe rows keep every action (Edit included, also when saved), authorized by
  Kubernetes. The wizard's deployment targets and token permission come from the same
  LLMInferenceService reviews and also apply to a new KServe deployment.
- RHAII's Kubernetes transport rejects with k8s-core's `K8sStatusError`, as the ODH frontend does,
  so the packages' status checks work: a `404` before creating a missing token ServiceAccount, Role
  or RoleBinding, and a `403` on an optional read.
- `getProjectDeploymentActions` on `ProjectsContext` carries `actions.edit`, `actions.startStop`,
  `actions.delete`, `actions.createTokenAuth` and `actions.manageTokenAuth`. The deployments table
  offers Edit only with `edit`, Start and Stop (including Stop in the status modal) only with
  `startStop`, and Delete only with `delete`.
- No permission check changes whether a new deployment requires authentication. The token field
  keeps its default token and stays enabled whatever `createTokenAuth` and RoleBinding create
  access say. Where either may be missing it shows a warning: token setup reuses an existing
  ServiceAccount, Role and RoleBinding, and if Kubernetes refuses it, the dry run stops the
  deployment before anything is saved, saying to turn token authentication off or ask for access.
  This also applies in ODH: a user without RoleBinding create (for example the `edit` role) now
  keeps the default token, and deploys with it only where the token resources already exist. A force update dry-runs too, with the same overwrite, so
  its Hugging Face and token setup are checked before anything is written. A token action that is
  off only because one of its reviews failed (`error`) is unknown, and shows no warning. An edit
  keeps its earlier behaviour: with RoleBinding create its tokens are managed, with a warning
  where `manageTokenAuth` is `false`; without it the field is disabled, token setup is skipped and
  the deployment keeps its existing authentication setting.
- A lookup the BFF denies (`403`, or `404` for a missing namespace) drops the project this session
  cached, so it is no longer offered as a target, and its actions read as denied (not unknown)
  until a lookup allows it again. A failed lookup keeps it. An older lookup that
  completes after a newer one is ignored, including the background restoration of recent
  projects. A new deployment is saved only while its project is still a deployment target;
  editing an existing deployment is not affected.
- Permissions are checked in one project, so YAML must deploy to it: the selected project for a
  new deployment (which, where deploy targets are known, must be selected in the form), the
  deployment's own for an edit. A YAML `metadata.namespace` that differs is
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

For each candidate, the 23 action reviews; for a namespace that is returned, 2 more matrix reviews
plus the named `get` (26 in all), and one namespace read when permitted. Reviews run concurrently
with at most 16 in flight per request, which is what bounds the load on the API server, and at
most 16 namespaces are evaluated at a time, which bounds the request's goroutines. Namespaces not
started when the request is cancelled or its deadline passes count as failed reviews. The
caller's per-request client allows 400 requests per second (burst 800) instead of client-go's 5/10
default, which would otherwise throttle discovery to minutes. A request from configured
candidates evaluates at most 200 of them; a caller's own cluster list is not
capped. Every request stops after 25 seconds, below the server's 60-second write timeout. At the client
rate that bounds one request to roughly 10,000 reviews: about 390 namespaces the caller can use, or
about 440 they cannot, fewer when authorizer webhooks are slow. Beyond that the listing is partial,
and the remaining namespaces can still be entered by name. Results are
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
        "actions": { "view": true, "deploy": false, "edit": false, "startStop": false, "delete": false, "createTokenAuth": false, "manageTokenAuth": false },
        "permissions": {
          "serving.kserve.io/llminferenceservices": { "get": "allowed", "list": "allowed", "watch": "allowed", "create": "denied", "update": "denied", "patch": "denied", "delete": "denied" },
          "serving.kserve.io/llminferenceserviceconfigs": { "get": "denied", "list": "denied", "watch": "denied", "update": "denied", "patch": "denied" },
          "core/pods": { "get": "denied", "list": "denied" },
          "core/secrets": { "create": "denied", "get": "denied", "list": "denied", "update": "denied", "delete": "denied" },
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
  reviews, empty results, fallback, concurrency bound
- `bff/internal/api/namespace_access_handler_test.go` — envtest with real RBAC
- `contract-tests/__tests__/xks/testCoreBffNamespaceAccess.test.ts` and
  `contract-tests/__tests__/openshift/testCoreBffNamespaceAccess.test.ts`
