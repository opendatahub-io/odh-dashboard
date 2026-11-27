# Core BFF bootstrap contract

What `/api/status` and the retained configuration endpoints promise, and what they deliberately do
not. This is the contract the frontend bootstraps against before it can render anything.

Tracked by [RHOAIENG-101219](https://redhat.atlassian.net/browse/RHOAIENG-101219). The
configuration inputs are in [runtime-contract.md](./runtime-contract.md).

## Three things, kept separate

|                   | What it answers              | Where it comes from                        | What a failure does      |
| ----------------- | ---------------------------- | ------------------------------------------ | ------------------------ |
| **Identity**      | Who is calling               | `SelfSubjectReview` against the API server | Fails the request        |
| **Admission**     | May the dashboard shell load | The admission mode (below)                 | Degrades to not admitted |
| **UI capability** | Are admin surfaces offered   | SSAR `patch` on `auths/auth`               | Degrades to non-admin    |

Identity is the only hard requirement. If the API server cannot resolve the caller there is no
session to describe, so the request fails rather than returning a degraded answer.

> **Admission and UI capability are not authorization.** `isAllowed` and `isAdmin` describe what the shell should render. They are not permission to call
> anything. Every API operation runs its own resource authorization against the caller's
> credentials regardless of what this endpoint returned, and a client must never treat these
> fields as a substitute. A caller who is admitted and sees admin surfaces still gets 403 from any
> route their RBAC does not allow.

## Admission modes

Set with `--admission-mode` / `ADMISSION_MODE`. Leaving it unset resolves from the platform.

| Mode            | Default on | Behaviour                                                                        |
| --------------- | ---------- | -------------------------------------------------------------------------------- |
| `auth-resource` | OpenShift  | The RHOAI contract. The Auth resource gates admission.                           |
| `authenticated` | xKS        | Any caller the API server resolves is admitted. The Auth resource is never read. |

`authenticated` exists because the Auth resource is outside the xKS profile. Requiring an
inherited RHOAI Auth-resource permission just to enter the supported RHAII journey would make the
dashboard depend on RBAC the profile deliberately omits. An authorized non-admin bootstraps on a
deployment with no Auth, no OdhDashboardConfig and no OdhApplication resources at all.

An explicit value always wins over the platform default, in both directions.

### The platform default requires a _confirmed_ platform

The probe reads the `version` singleton with the service account, and the API server authorizes
that request before it resolves the resource. A deployment that leaves the platform to
auto-detection must therefore grant `get` on `clusterversions/version` (`config.openshift.io`):
without it the probe is a 403 on every cluster, so neither "API not served" nor a successful read
could ever be observed. No shipped xKS manifest auto-detects: the RHAII bundle sets
`--platform-type=XKS`, never probes and grants no such rule.

Startup falls back to `XKS` when the OpenShift `ClusterVersion` probe fails, because XKS is the
least-privilege answer for deciding which API calls to make. That fallback is a **guess**, and a
transient forbidden or timed-out probe on a real OpenShift cluster lands in exactly that branch.

Keying admission off the guess would mean a probe failure silently drops the Auth-resource gate
and admits callers the cluster denies. So the platform default only selects `authenticated` when
the platform is **confirmed** — explicitly configured, or detected by a probe that succeeded. An
unconfirmed platform keeps `auth-resource`, the restrictive contract.

| Platform resolution                                                 | Platform  | Confirmed | Default mode    |
| ------------------------------------------------------------------- | --------- | --------- | --------------- |
| `ODH_PLATFORM_TYPE` set explicitly                                  | the value | yes       | from the value  |
| `ClusterVersion` read, with or without a usable cluster ID          | OpenShift | yes       | `auth-resource` |
| `ClusterVersion` API not served (discovery reports it absent)       | XKS       | yes       | `authenticated` |
| `ClusterVersion` API served but the `version` singleton missing     | XKS       | **no**    | `auth-resource` |
| Bare 404 on the read that discovery does not confirm                | XKS       | **no**    | `auth-resource` |
| Probe failed (forbidden, 405, timeout, no client), fell back to XKS | XKS       | **no**    | `auth-resource` |

Only positive evidence that the OpenShift configuration API is absent confirms XKS. A 404 without
a resource name on the read is only a hint, because a proxy or gateway in front of the API server
can return the same response on OpenShift. The probe then asks discovery (`/apis`, readable by
every authenticated identity through the default `system:discovery` role), and only a successful
answer that lists the core `v1` group and in which no listed version of `config.openshift.io` serves
`clusterversions` confirms absence. An answer without the core group is a stub, not a discovery
document. Discovery goes through the same network path as the read, so this catches an intermediary
that rejects resource paths, not one that forges discovery; set `ODH_PLATFORM_TYPE` where neither can
be trusted. A discovery failure, an unreadable resource list, or a resource served at any version of
its group is inconclusive. That includes a version skew: for example the Auth CRD's `v1alpha1` set to
`served: false` during an upgrade, while a sibling CRD keeps `v1alpha1` listed. The same rule decides whether the Auth CRD is absent. A missing
singleton, a malformed object or a 405 on the read is not that evidence either, and a successful read is
OpenShift even when the cluster ID cannot be parsed. The same confirmation also decides whether
the HTTPS listener may skip the cluster TLS profile (see [runtime-contract.md](./runtime-contract.md)).

An operator who wants `authenticated` on a cluster where detection is unreliable sets
`ODH_PLATFORM_TYPE=XKS` or `ADMISSION_MODE=authenticated` and gets it. The startup log reports
`platform`, `platformConfirmed` and the resolved `admissionMode` so the applied contract is never
in doubt.

## `auth-resource` mode: every outcome

Admin capability is resolved first; a dashboard admin is admitted by definition, because the admin
review already proved access to the Auth resource.

For everyone else:

| Auth read outcome                               | Admission        | Code                              | Why                                                                                                                        |
| ----------------------------------------------- | ---------------- | --------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| CRD not installed (confirmed by discovery)      | **Admitted**     | `ADMISSION_AUTH_CRD_ABSENT`       | No Auth resource means no group restriction to enforce.                                                                    |
| Bare 404 that discovery does not confirm        | SSAR decides     | `ADMISSION_AUTH_UNAVAILABLE`      | An intermediary can return a bare 404 while the CRD is installed, so it is not evidence of absence.                        |
| `allowedGroups` contains `system:authenticated` | **Admitted**     | `ADMISSION_SYSTEM_AUTHENTICATED`  | The cluster explicitly admits every authenticated user.                                                                    |
| Readable, restricted groups                     | SSAR decides     | `ADMISSION_ACCESS_REVIEW`         | `get` on `auths/auth` as the caller.                                                                                       |
| CRD installed, singleton not provisioned        | SSAR decides     | `ADMISSION_AUTH_INSTANCE_MISSING` | The installation owner provisions it; the dashboard never does. Deferring means a late provision does not lock anyone out. |
| Forbidden for the service account               | SSAR decides     | `ADMISSION_AUTH_FORBIDDEN`        | **Reduced service-account RBAC must not become an admission dependency.**                                                  |
| Any other upstream failure                      | SSAR decides     | `ADMISSION_AUTH_UNAVAILABLE`      | A transient failure is not evidence either way.                                                                            |
| SSAR itself cannot be evaluated                 | **Not admitted** | `ADMISSION_REVIEW_UNAVAILABLE`    | Fails closed. Safe because admission is not authorization.                                                                 |
| `authenticated` mode                            | **Admitted**     | `ADMISSION_AUTHENTICATED`         | The Auth resource is not consulted.                                                                                        |
| Admin                                           | **Admitted**     | `ADMISSION_ADMIN`                 | The admin review already succeeded.                                                                                        |

The codes are logged on every decision, so an operator can tell the four Auth failure modes apart
without reading the source. A CRD absence confirmed by discovery is reused for 30 seconds, so
admission does not run discovery on every request; a CRD installed later takes effect within that
window. `bff/internal/repositories/bootstrap.go` is the single place this is
decided; `status_integration_test.go` asserts each row.

The two rules this table exists to enforce:

- **Nothing silently grants access.** No failure path turns into "admitted" by accident; every
  non-trivial outcome routes through the caller's own authoritative review.
- **Nothing unexpectedly locks out an authorized user.** No failure path denies outright either;
  a failure the caller cannot fix defers to their own review rather than pre-empting it.

## Configuration endpoints

| Endpoint              | Read as                                            | Resource             |
| --------------------- | -------------------------------------------------- | -------------------- |
| `GET /api/status`     | caller, plus the service account for the Auth read | `auths/auth`         |
| `GET /api/config`     | service account                                    | `OdhDashboardConfig` |
| `GET /api/components` | service account                                    | `OdhApplication`     |

The privileged service-account read is deliberate: a non-admin must see the real dashboard
configuration without being granted read access to the CR itself.

### Bootstrap reads are read-only

On the xKS profile the dashboard never writes during bootstrap. Required resources are provisioned
by the installation owner or supplied through the agreed xKS configuration source.

| Situation                                     | xKS                                                 | OpenShift                                 |
| --------------------------------------------- | --------------------------------------------------- | ----------------------------------------- |
| `OdhDashboardConfig` CRD not installed        | Defaults (`CONFIG_CRD_ABSENT`)                      | Defaults                                  |
| `OdhDashboardConfig` instance not provisioned | Defaults, **no create** (`CONFIG_INSTANCE_MISSING`) | Auto-created (RHOAI behaviour, unchanged) |
| `OdhDashboardConfig` read forbidden           | Defaults (`CONFIG_FORBIDDEN`)                       | Error — the misconfiguration is visible   |
| `OdhApplication` CRD or instances absent      | Empty list                                          | Empty list                                |
| `OdhApplication` list forbidden               | Error                                               | Error                                     |
| Either read rejected with 405                 | Error: a rejected method is not evidence of absence | Error                                     |

On an **unconfirmed** platform (the last two rows of the platform table) neither column is known to
apply, so bootstrap never writes: a missing `OdhDashboardConfig` instance serves defaults with a
`CONFIG_PLATFORM_UNCONFIRMED` warning naming `ODH_PLATFORM_TYPE` as the fix, and a forbidden read
surfaces as an error.

`dashboard_config_bootstrap_test.go` asserts that an xKS bootstrap issues no `create`, `update`,
`patch` or `delete` against the API server.

## Response caching

Bootstrap responses are per-identity and must never be shared between callers. Every `/api`
response carries:

```
Cache-Control: no-cache, no-store, private, max-age=0, must-revalidate
Vary: Authorization, X-Forwarded-Access-Token, Cookie
```

`no-store` is what forbids a compliant cache from storing these responses. `Vary` is a second
signal for caches that honour it, so one that does store a response keys it on the caller's
identity headers; it does not protect against an intermediary that ignores `Vary`. Both token headers are listed because either may
carry the identity depending on the edge, and a custom `AUTH_TOKEN_HEADER` is added when it is a
different header, so `Vary` always names the header that carries the caller's identity.

The response body carries only what the frontend needs: identity, namespace, cluster metadata, and
the two capability flags. There is no token, no group list and no raw Auth or configuration object.

## Credential policy

Tracked by [RHOAIENG-101218](https://redhat.atlassian.net/browse/RHOAIENG-101218). Whose
credentials perform a user-initiated read or mutation depends on the platform
(`repositories.CredentialPolicyFor`):

| Platform  | Policy            | Behaviour                                                                                                                                   |
| --------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| OpenShift | `service-account` | Unchanged RHOAI privileged-watcher model: the handler authorizes the caller (admin review or resource SSAR), then the service account acts. |
| xKS       | `caller`          | The caller's own credentials perform the operation, so the API server authorizes the exact resource and verb.                               |

Under `caller` a missing or failing caller credential is an error. There is no path to the service
account: `repositories.clientSource` returns `ErrCallerClientsUnavailable` and the operation is not
attempted. An unconfirmed xKS guess also selects `caller`, the least-privilege direction, so a
misdetection denies rather than elevates.

Operations that follow the policy (all of them user-initiated):

| Endpoint                                                        | Operation                                                     |
| --------------------------------------------------------------- | ------------------------------------------------------------- |
| `GET /api/namespaces/:name/:context`                            | Namespace label/annotation patch, including `dryRun=All`      |
| `POST /api/servingRuntimes`                                     | ServingRuntime create, including `dryRun=All`                 |
| `POST/PUT/PATCH/DELETE /api/connection-types[/:name]`           | Connection-type ConfigMap mutations and their existence check |
| `GET /api/components/remove`                                    | Enabled-apps ConfigMap update                                 |
| `GET/PUT /api/cluster-settings`                                 | Culler and segment ConfigMaps, notebook-controller rollout    |
| `PATCH /api/config`, `GET/PATCH /api/dashboardConfig/:ns/:name` | OdhDashboardConfig admin read and patch                       |

The Kubernetes HTTP and WebSocket proxies always use the caller's token, on every platform.

The namespace mutation is the visible difference. On OpenShift a caller who may create
ServingRuntimes in a project gets the label applied by the service account. On xKS the same caller
needs `patch` on the Namespace itself; without it the response is `{"applied": false}` and nothing
is written. The deploy flow already tolerates `applied: false`. Only that denial is `applied: false`
on xKS: any other failure of the caller's patch (a timeout, an API server error, a missing namespace,
an admission rejection answered with another status) is returned as that error, so a client can tell
"you may not" from "it failed". A `403` from the API server is a denial whatever produced it: RBAC,
or an admission webhook or `ValidatingAdmissionPolicy` that denies with `403` (their default); the
status cannot tell them apart, so both are `applied: false`. Caller credentials that cannot be used at all (no usable token) are a `401`, not
`applied: false`. OpenShift keeps answering every failed patch with `applied: false`, as before.

The connection-type update, patch and delete are bound the same way to the connection type they
validated (its `resourceVersion`): a change in between, or a `PUT` body with a different
`metadata.resourceVersion`, is `200 {"success": false}` and nothing is written.

Under `caller` an RBAC denial from the API server reaches the client as its `403` (or `401`). The
connection-type, component-removal and cluster-settings endpoints, which otherwise report failures
as `200 {"success": false}`, do not fold a denial into that shape, so a client can tell "you may
not" from "it failed". The cluster-settings access reviews are decided by `status.allowed`, like every
access review (see the [error contract](./error-contract.md)): a review that is not allowed is a `403`
before any write, even when it carries an `evaluationError`, because the RBAC authorizer reports one for
an ordinary denial whenever a matching binding names a missing role.

`GET /api/cluster-settings` and `PUT /api/cluster-settings` read the OdhDashboardConfig the same
way. Under `caller` that is the caller's own read, with no fallback on a denial: a caller who cannot read it
gets the API server's `403`, never the defaults the service-account bootstrap read falls back to, so
saving the form cannot write those defaults back. When no instance exists at all, `GET` shows the
defaults, built directly with no second read by the service account, and `PUT` fails, because it
does not write against a configuration it could not read.

`PUT /api/cluster-settings` makes several separate writes: the OdhDashboardConfig patch, the culler
and segment-key ConfigMaps, and a notebook-controller rollout when needed. There is no transaction.
The writes are planned once, from one read of the cluster, and only the planned writes run:

- The stored values are read the same way for `GET` and for planning: culling is off unless the
  culler ConfigMap has `ENABLE_CULLING: "true"` (in any case), and tracking is off unless the segment-key
  ConfigMap has `segmentKeyEnabled: "true"`. When the OdhDashboardConfig sets `disableTracking`,
  `GET` does not read or show tracking and `PUT` neither reads nor writes the segment-key ConfigMap,
  so neither needs access to it; a save that enables tracking there fails (`200 {"success": false}`)
  before anything is written instead of reporting success for a setting left off. Tracking can be enabled only when the segment-key ConfigMap is
  provisioned; otherwise the save fails (`200 {"success": false}`) before anything is written. Under
  `caller`, a failed read of either ConfigMap fails `GET` as it fails `PUT`. Under the
  service-account policy `GET` shows an unreadable segment-key ConfigMap as tracking off, as before,
  and a save that keeps tracking off leaves it alone; enabling tracking then fails.
- A ConfigMap write is planned only when it would change the stored value. A ConfigMap whose stored
  value already matches the request (absent or disabled culling for culling off, an absent key for
  tracking off) gets no write and no review. A culler ConfigMap that turns culling on without a readable
  idle time is shown as off but still culls, so saving culling off deletes it, so saving the values `GET` returned while changing
  another setting needs no ConfigMap write access.
- The OdhDashboardConfig patch carries the `resourceVersion` of the configuration the request read,
  so another save that lands between this request's read and its patch is a conflict
  (`200 {"success": false}`) instead of being overwritten. Defaults that were never stored carry no
  version. The request body carries no version, so this does not protect the form across `GET` and
  `PUT`: a form loaded before another admin's save still writes its own values (last writer wins,
  as before this change).
- Every ConfigMap operation is bound to the version the plan read. If the cluster changes after the
  plan, the planned write fails instead of switching to another one or overwriting a newer value: a
  planned create fails if the ConfigMap now exists, and a planned update or delete is a conflict if
  the ConfigMap changed. A ConfigMap the plan left alone but which was created, changed or deleted
  since is reported as a conflict (`200 {"success": false}`), not success. The rollout decision comes
  from the same read, so it always matches what was stored.
- Before the OdhDashboardConfig patch, the plan is re-checked: a ConfigMap another save changed
  since the read is reported as a conflict before anything is written. Only a change in the short
  window between that check and the ConfigMap writes can still leave the configuration patched with
  a conflict reported.
- The segment-key ConfigMap, which needs no rollout, is handled before the culler ConfigMap, so a
  conflict on it stops the update before the culler is written and a retry still restarts the
  controller. When the PVC size changed, the OdhDashboardConfig patch has already stored it, so the
  planned rollout still runs after a later conflict, which is still reported. When both fail, both
  causes are returned and an authorization failure takes precedence for the status (`403` under
  `caller`).
- A failed read that the plan depends on is an error, never a detected change, so it cannot trigger
  a notebook-controller rollout.
- A notebook-controller Deployment that does not exist (as on xKS, which has no workbenches) is
  nothing to restart: the save succeeds instead of reporting a failure after its writes. Under
  `caller` the planned rollout is still reviewed, so the caller needs `patch` on that Deployment.

Under `caller` the request first reads the current OdhDashboardConfig with the caller's credentials
(a failed read aborts the request), then runs a `SelfSubjectAccessReview` for every planned write,
and returns `403` before the first write if any is denied. This preflight is best-effort, not
transactional: it stops the common case of a caller with partial permissions, but RBAC can change
between the review and the write, and a write can still fail for other reasons (a conflict, an
admission webhook). A later write that fails after earlier ones succeeded still leaves a partial
change, reported as a `403` for a denial or `200 {"success": false}` otherwise. Any `403` from the
API server counts as a denial, including one from an admission webhook or policy that denies with
`403`. A write denied this way also skips the planned notebook-controller rollout.

On xKS the caller therefore needs, on `odhdashboardconfigs` (`opendatahub.io`) in the dashboard
namespace:

- `GET /api/cluster-settings`: `get`, plus `get` on the culler and segment-key ConfigMaps.
- `PUT /api/cluster-settings`: `get` and `patch`, plus `get` on the culler and segment-key
  ConfigMaps (the plan and its re-check read them even when no write is planned), plus the ConfigMap
  and Deployment verbs its planned writes need.
- `PATCH /api/config`: `get` and `patch`. The patch itself needs only `patch` (its response is built
  from the patched object), but the settings pages read the configuration before they save it.

## Service-account permissions

These are the only service-account operations left on xKS, and each is a read. On xKS the
OdhDashboardConfig reads and patches inside `PATCH /api/config` and `PUT /api/cluster-settings` use
the caller's credentials, not these. For the xKS
profile the dashboard **service account** needs:

| Resource                                       | Verbs         | Needed for                                                                                                                                                                                                                                                                                                                 |
| ---------------------------------------------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `odhdashboardconfigs` (`opendatahub.io`)       | `get`         | `/api/config`. Optional on confirmed xKS: absent or forbidden degrades to defaults.                                                                                                                                                                                                                                        |
| `odhapplications` (`dashboard.opendatahub.io`) | `list`        | `/api/components`. **Always required**, also when the OdhApplication API is not installed: the API server authorizes a request before it resolves the resource, so without this rule an absent API is a 403. A forbidden list is an error. With the rule granted, an absent API or no instances degrades to an empty list. |
| `configmaps` (core), dashboard namespace       | `get`, `list` | Connection-type templates (`GET /api/connection-types[/:name]`), filtered to the connection-type labels. Every authenticated user needs them to create a connection and is not granted ConfigMap access in the dashboard namespace.                                                                                        |

All three rules are namespaced and the BFF reads in its dashboard namespace (`NAMESPACE`), so the
Deployment sets `NAMESPACE` to the pod's own namespace, where the Role is bound. The shipped Role
is exercised against an API server without the OdhApplication API in
`bff/internal/api/components_sa_rbac_test.go`.

On a confirmed xKS platform the service account needs **no** write verb on any resource, no
ClusterRole, and no permission on `namespaces` (not even `list`), `servingruntimes`, `deployments`
or `auths`. An _unconfirmed_ xKS guess keeps the `auth-resource` admission mode (see above), which
reads `auths/auth` with the service account; set `ODH_PLATFORM_TYPE=XKS` so that read never happens.

**This table is the shipped RBAC.** The RHAII bundle (`manifests/distributions/rhaii`, the only
xKS manifest set) grants its service account exactly these rows in a namespaced Role, and nothing
else: no ClusterRole is bound to it. `bff/internal/bundlecontract` parses this table and fails when
the bundle grants a verb it does not list, omits one it lists, binds any other role or subject, or
uses a wildcard, `resourceNames`, a non-resource URL or an aggregated ClusterRole. To change the
service account's access, change this table first; a row whose resource cell reads
`` `resource` (`group`), cluster-wide `` is checked as a cluster-scoped grant. Decided in
[RHAI-50761](https://redhat.atlassian.net/browse/RHAI-50761):

- Removed from the RHAII bundle: ConfigMap `create`, `update`, `patch` and `delete`,
  `servingruntimes` `create`, and the ClusterRole with `namespaces` `patch`. The connection-type,
  enabled-apps, cluster-settings, ServingRuntime and namespace-label writes they served run as the
  caller on xKS (see the table of user-initiated operations above).
- Added to the RHAII bundle: `odhdashboardconfigs` `get`, for `GET /api/config`.
- The deleted `distributions/core-bff/manifests/base` copy also granted `odhdashboardconfigs`
  `patch` and the `config.openshift.io` probe reads; neither is needed with
  `--platform-type=XKS`, and `PATCH /api/config` patches as the caller.
- The service account gets **no `list namespaces`**: namespace discovery runs entirely as the
  caller.

Hand-off: the dashboard operator's xKS operand
([RHOAIENG-96147](https://redhat.atlassian.net/browse/RHOAIENG-96147)) renders this bundle and
must not add service-account rules on top of it; the rhai-on-xks install chart
([RHOAIENG-96161](https://redhat.atlassian.net/browse/RHOAIENG-96161)) installs it the same way. A
sidecar that needs its own service-account access (for example a token-reviewing proxy) adds its
rows here first. The OpenShift (RHOAI/ODH) service-account RBAC in `manifests/base` is out of scope
and unchanged.

`auths` is **not** in this list. In `authenticated` mode it is never read, which is the point: the
service-account RBAC can be reduced to the reads above without introducing an undocumented
admission dependency or a hidden fallback.

### Caller permissions

Identity and review calls are made with the **caller's** token, not the service account's, so
granting them to the dashboard service account does nothing. Each authenticated caller needs:

| Resource                                            | Verbs    | Needed for                                                                                                                                           |
| --------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `selfsubjectreviews` (`authentication.k8s.io`)      | `create` | Identity. **Required**: without it bootstrap cannot resolve who is calling and fails the request.                                                    |
| `selfsubjectaccessreviews` (`authorization.k8s.io`) | `create` | Capability and admission reviews. A failed review degrades `isAdmin` to false, and in `auth-resource` mode a failed admission review does not admit. |

Kubernetes grants both to every authenticated user through the default `system:basic-user`
ClusterRole; a cluster that removes that binding must grant them back.

## Consumers

[RHOAIENG-96067](https://redhat.atlassian.net/browse/RHOAIENG-96067) (RHAII composition) consumes
this contract. Because admission and capability are not authorization, a consumer must reject a
failed authorization check at the point of the operation — including a failure of the shared
access-review helper, which is a failure and not a denial, and must not be read as "allowed".

## See also

- [runtime-contract.md](./runtime-contract.md) — configuration, TLS and trust
- [error-contract.md](./error-contract.md) — error envelope and request correlation
- `bff/internal/repositories/bootstrap.go` — the decision
- `bff/internal/repositories/status_integration_test.go` — the tests behind every row above
