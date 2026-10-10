# Community Plugin Registration

## Scope

Dashboard can compose compatible community Module Federation entries into its
generated federation configuration. This is a narrow installer integration,
not a general plugin platform or a Dashboard-managed plugin lifecycle.

The operator reads one fixed, installer-owned ConfigMap:

```text
community-plugins-config in redhat-ods-community-plugins
```

Dashboard does not discover other ConfigMaps or sources, select a source at
runtime, install or remove plugin workloads, manage their networking, or make
a compatibility or support promise for a community plugin.

> **Warning**: Module Federation loads plugin JavaScript in the Dashboard
> browser context. Write access to this ConfigMap is therefore authority to
> register browser-executed code; route isolation is not a code sandbox.

## Source Contract

Each ConfigMap `data` key is the plugin's compiled Module Federation remote
name. The value is a strict JSON object. The operator derives the generated
entry `name` from that key, so the key must be a valid JavaScript identifier and
must not collide with a built-in or another accepted remote.

All Dashboard module names, plus `coreBff`, `perses`, and `mlflowEmbedded`, are
permanently reserved. A community entry using one of these names is rejected
even when the corresponding Dashboard entry is not currently emitted.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: community-plugins-config
  namespace: redhat-ods-community-plugins
data:
  communityPluginsAdmin: |
    {
      "backend": {
        "remoteEntry": "/remoteEntry.js",
        "authorize": false,
        "tls": false,
        "service": {
          "name": "community-plugins-admin-ui",
          "namespace": "cai-plugin-system",
          "port": 8080
        }
      },
      "proxyService": [
        {
          "pathSuffix": "api",
          "pathRewrite": "/api",
          "authorize": true,
          "tls": false,
          "service": {
            "name": "community-plugins-admin-bff",
            "namespace": "cai-plugin-system",
            "port": 3000
          }
        }
      ]
    }
```

`backend` is required. `proxyService` is optional and may contain more than
one target. The frontend Service in `backend` serves the remote bundle; each
`proxyService` entry can target a separate BFF Service.

The source schema deliberately uses `pathSuffix`, not `proxyService.path`.
Dashboard owns the public route namespace and derives each generated path:

```text
/community-plugins/<remote-name>/<path-suffix>
```

For the example above, the generated runtime entry contains
`/community-plugins/communityPluginsAdmin/api` with `pathRewrite: "/api"`.
CAI and the plugin must use that Dashboard-visible API base path.

## Validation and Failure Behavior

The source JSON rejects unknown fields. The operator validates remote names,
Kubernetes Service names and namespaces, ports, remote-entry paths, route
suffixes, and generated-route collisions.

- `backend.remoteEntry` is a non-empty absolute path beginning with `/`. It
  cannot contain query, fragment, percent-escape, backslash, control
  characters, empty, `.` or `..` segments.
- `proxyService.pathSuffix` is non-empty and relative. It cannot begin or end
  with `/`. Each `/`-separated segment must match `[A-Za-z0-9_-]+`; route
  parameters (`:id`) and wildcards (`*`) are rejected.
- Each accepted remote receives an isolated generated route prefix. Within one
  community entry, duplicate derived proxy paths are rejected. Distinct nested
  suffixes are supported; for example, `api` and `api/v1` generate separate
  routes.

An invalid entry is skipped and recorded in the operator log. Built-in entries
and valid sibling entries remain available. If the source ConfigMap is absent
or empty, Dashboard produces its built-in federation configuration only. If it
is deleted, the next reconciliation removes only entries derived from it;
Dashboard never deletes installer-owned workloads, Services, namespaces, or
releases.

## Reconciliation and Rollout

The operator samples the source ConfigMap during an otherwise-triggered
Dashboard reconciliation. It does not watch the ConfigMap. A missing
`redhat-ods-community-plugins` Namespace or source ConfigMap produces no
community entries and does not fail reconciliation. CAI must cause an existing
reconciliation trigger after creating, changing, or deleting the source; the
normal integration mechanism is a main Dashboard Deployment event.

Accepted entries are sorted with built-in entries before the generated
`federation-config` is written. This makes the effective configuration and its
deployment hash deterministic. A material accepted-entry change updates the
existing hash annotation and rolls out only the main Dashboard Deployment:

- `rhods-dashboard` on RHOAI;
- `odh-dashboard` on ODH.

The change does not require restarting dashboard-operator, plugin workloads,
or other Dashboard-managed module Deployments.

## Responsibilities

| Dashboard operator                                                          | CAI installer and plugin owner                                                     |
| --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Reads and validates the fixed source during reconciliation.                 | Creates and updates the source ConfigMap with upsert semantics.                    |
| Generates `federation-config` and triggers the existing hash-based rollout. | Owns plugin workloads, Services, lifecycle, and readiness.                         |
| Derives public community proxy paths.                                       | Causes reconciliation after source changes or deletion.                            |
| Preserves Dashboard availability when source entries are invalid.           | Provides or coordinates cross-namespace networking, TLS, and service reachability. |

## Related Documentation

- [Dashboard Operator](dashboard-operator.md) explains operator reconciliation
  and generated federation configuration.
- [Module Federation](module-federation.md) explains how the runtime consumes
  generated federation entries.
