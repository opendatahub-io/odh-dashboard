# Core BFF runtime contract

The configuration contract between the Platform and the Dashboard for running Core BFF as the
RHAII backend on xKS, and the same contract on OpenShift. Everything here is enforced at startup
by `bff/internal/config/validate.go` and exercised against the real parser in
`bff/cmd/startup_test.go`.

Tracked by [RHOAIENG-96080](https://redhat.atlassian.net/browse/RHOAIENG-96080). The bootstrap
side of the contract (`/api/status` and the configuration endpoints) is in
[bootstrap-contract.md](./bootstrap-contract.md).

## Precedence

For every setting: **CLI flag > environment variable > built-in default.**

A list setting (`ALLOWED_ORIGINS`, `BUNDLE_PATHS`) supplied on the command line **replaces** the
environment value rather than appending to it.

Only the winning value is validated. An invalid `PORT`, `ADMISSION_MODE`, `DEPLOYMENT_MODE` or
`ODH_PLATFORM_TYPE` in the environment does **not** fail startup when the matching CLI flag
overrides it, because the environment value is never applied. The same invalid value with no CLI
override does fail, since it is then the value in effect. This matters for deployments that
inherit environment configuration they cannot edit and correct it with container arguments.

The command line accepts only `-flag=value` settings. A positional argument is refused, because
flag parsing stops at the first one and any flag after it (for example `-cert-file`) would be
silently ignored. Parse errors name at most the flag, never the argument text, and `-h` prints
flag names and descriptions without their environment-derived defaults and exits 0.

## Startup is a gate

`parseStartupConfig` resolves the configuration and validates it before anything is built. A
configuration that does not validate does not start, and the process prints every problem it
found in one pass so a fix does not need one restart per mistake:

```
core-bff refusing to start: invalid configuration (2 problems):
  - AUTH_METHOD=disabled is not supported in a production profile; use user_token, or set DEV_MODE=true for local development
  - CERT_FILE/--cert-file is set but KEY_FILE/--key-file is not; TLS needs both, and a partial pair must not fall back to plaintext HTTP
```

## Settings

### Core

| Flag                      | Environment                    | Default                | Notes                                                              |
| ------------------------- | ------------------------------ | ---------------------- | ------------------------------------------------------------------ |
| `--port`                  | `PORT`                         | `4000`                 | Must be an integer 1–65535. A malformed explicit `PORT` is refused. |
| `--deployment-mode`       | `DEPLOYMENT_MODE`              | `standalone`           | `standalone` or `federated`.                                       |
| `--platform-type`         | `ODH_PLATFORM_TYPE`            | _(auto-detect)_        | `OpenShift`, `XKS`, or empty. Explicit always wins over detection. |
| `--admission-mode`        | `ADMISSION_MODE`               | _(from platform)_      | `auth-resource` or `authenticated`. See the bootstrap contract.    |
| `--namespace`             | `NAMESPACE`, else `OC_PROJECT` | `opendatahub`          | Dashboard namespace. Required.                                     |
| `--workbench-namespace`   | `WORKBENCH_NAMESPACE`          | _(= namespace)_        | Namespace allowlist entry.                                         |
| `--operator-namespace`    | `OPERATOR_NAMESPACE`           | _(empty)_              | Preferred subscription namespace (OpenShift).                      |
| `--dashboard-config-name` | `DASHBOARD_CONFIG_NAME`        | `odh-dashboard-config` | OdhDashboardConfig CR name.                                        |
| `--enabled-apps-cm`       | `ENABLED_APPS_CM`              | _(empty)_              | ConfigMap tracking enabled applications.                           |
| `--static-assets-dir`     | `STATIC_ASSETS_DIR`            | `./static`             | SPA asset root. Required.                                          |
| `--log-level`             | `LOG_LEVEL`                    | `INFO`                 | `error`, `warn`, `info`, `debug`.                                  |
| `--mf-remotes-config`     | `MF_REMOTES_CONFIG`            | _(empty)_              | Module federation remotes file.                                    |

### Authentication

| Flag                  | Environment         | Default                    | Notes                                                                       |
| --------------------- | ------------------- | -------------------------- | --------------------------------------------------------------------------- |
| `--auth-method`       | `AUTH_METHOD`       | `user_token`               | `user_token` or `disabled`. `disabled` is rejected in a production profile. |
| `--auth-token-header` | `AUTH_TOKEN_HEADER` | `x-forwarded-access-token` | Required when `AUTH_METHOD=user_token`.                                     |
| `--auth-token-prefix` | `AUTH_TOKEN_PREFIX` | _(empty)_                  | Set to `Bearer ` when the header is `Authorization`.                        |

The header the gateway populates on xKS is settled by
[RHOAIENG-96081](https://redhat.atlassian.net/browse/RHOAIENG-96081); this contract only states
that the header name is configuration, not a constant.

### Transport and trust

| Flag                     | Environment            | Default                | Notes                                                               |
| ------------------------ | ---------------------- | ---------------------- | ------------------------------------------------------------------- |
| `--cert-file`            | `CERT_FILE`            | _(empty)_              | Serving certificate. Both halves or neither.                        |
| `--key-file`             | `KEY_FILE`             | _(empty)_              | Serving key.                                                        |
| `--bundle-paths`         | `BUNDLE_PATHS`         | _(5 well-known paths)_ | Comma-separated PEM CA bundles for every outbound TLS connection.   |
| `--insecure-skip-verify` | `INSECURE_SKIP_VERIFY` | `false`                | Rejected in a production profile.                                   |
| `--allowed-origins`      | `ALLOWED_ORIGINS`      | _(none)_               | CORS origins. Production accepts exact `scheme://host[:port]` only. |

### Development and mocks

`DEV_MODE`, `MOCK_K8S_CLIENT`, `MOCK_HTTP_CLIENT`, `MOCK_BFF_CLIENTS`, `DEV_MODE_CLIENT_PORT`,
`DEV_USER`, `DEV_GROUPS`. All default to off/empty.

### Services

`MODEL_SERVING_HOST`, `PROMETHEUS_HOST`, `PROMETHEUS_NAMESPACE` (`openshift-monitoring`),
`PROMETHEUS_INSTANCE` (`thanos-querier`), `PROMETHEUS_PORT` (`9092`).

## Profiles

A deployment is in a **production profile** unless at least one of `DEV_MODE`,
`MOCK_K8S_CLIENT`, `MOCK_HTTP_CLIENT` or `MOCK_BFF_CLIENTS` is on. Opting into a development
profile is explicit, which is what makes these rejections safe:

| Rejected in a production profile                                                                                             | Why                                                                                                                 | Way out                                                     |
| ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `AUTH_METHOD=disabled`                                                                                                       | No caller identity is extracted at all.                                                                             | `AUTH_METHOD=user_token`, or `DEV_MODE=true` locally.       |
| `INSECURE_SKIP_VERIFY=true`                                                                                                  | Disables upstream certificate verification on every outbound call.                                                  | Supply the upstream CA through `BUNDLE_PATHS`.              |
| `ALLOWED_ORIGINS` with `*` anywhere (`*`, `https://*`, `https://*.example.com`), or an entry with a path (including a trailing `/`), query or user info | CORS replies allow credentials and the middleware matches `*` as a wildcard, so a pattern admits any matching site. Browsers send `Origin` without a trailing slash, so `https://host/` could never match. Rejected entries are reported by position, never by value. | List each exact dashboard origin as `scheme://host[:port]`. |

## TLS inputs

**Serving certificate.** `CERT_FILE` and `KEY_FILE` are both-or-neither. A half-configured pair
fails startup; it must never fall back to plaintext HTTP, because the failure mode is silent and
the operator's intent was clearly TLS. A pair that is present but does not load — missing file,
mismatched key, not PEM — also fails startup. The diagnostic names both paths and the reason, and
strips any PEM material from the underlying error.

When no pair is supplied, the server listens on plain HTTP. That is the supported RHAII standalone
topology, where a Gateway or Ingress terminates TLS at the edge.

**Outbound trust.** There are two trust sources, and `BUNDLE_PATHS` governs only one of them.
Getting this wrong is an easy way to pass startup validation and still fail every request, so the
split is explicit:

| Transport                                                                                         | Trust source                                                        | Does `BUNDLE_PATHS` apply? |
| ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | -------------------------- |
| Kubernetes API **clients** (client-go: the service-account clients and the caller-token clients)  | The kubeconfig or in-cluster service-account CA, from `rest.Config` | **No**                     |
| Kubernetes HTTP and WebSocket **proxies** (`/api/k8s/*`, `/wss/k8s/*`)                            | System pool + `BUNDLE_PATHS` + the kubeconfig CA merged in          | Yes                        |
| Model-serving proxy, module proxies, inter-BFF clients, Prometheus client, connection-test probes | System pool + `BUNDLE_PATHS`                                        | Yes                        |

The practical consequence: **supplying the Kubernetes API CA only through `BUNDLE_PATHS` does not
configure the client-go clients.** Identity resolution and every service-account read would still
fail certificate verification. The Kubernetes API CA must reach the pod the way client-go expects
it — the projected service-account CA at
`/var/run/secrets/kubernetes.io/serviceaccount/ca.crt` in-cluster, or the `certificate-authority`
in the kubeconfig out of cluster. `BUNDLE_PATHS` is for the upstream services the dashboard calls
over plain HTTP clients, not for the API server.

There is no per-transport trust override and no per-transport skip-verify: `INSECURE_SKIP_VERIFY`
is global and rejected in a production profile.

`BUNDLE_PATHS` has two modes, because the two cases have different failure semantics:

| Case                                       | Behaviour                                                                                                                                                                         |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Default set (the five well-known paths)    | Unreadable entries are skipped. Most do not exist on most clusters; the set is a convenience.                                                                                     |
| Supplied explicitly by environment or flag | If **no** path yields a certificate, startup fails. That includes an explicitly empty or separator-only value. Falling back to the system pool would be a silent trust downgrade. |

**Client credentials.** Outbound client certificates come from the Kubernetes rest config
(`CertData`/`KeyData` or `CertFile`/`KeyFile`). A half-configured client pair is an error, the same
rule as the serving pair. The dashboard never presents a client certificate it was not given.

## Certificate and trust rotation

| What rotates                                             | Mechanism                                                                                                                            | Restart needed |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | -------------- |
| Serving certificate and key                              | `pkg/tls.CertReloader` serves the pair through `tls.Config.GetCertificate`, re-reading the files when their modification time moves. | **No**         |
| Cluster TLS profile (min version, cipher suites, curves) | `ListenAndServeTLSWithReload` polls the profile every minute and restarts the listener generation on a change.                       | **No**         |
| `BUNDLE_PATHS` contents (outbound trust)                 | Read once into the root pool at startup.                                                                                             | **Yes**        |
| Any other setting in this document                       | Read once at startup.                                                                                                                | **Yes**        |

Serving-certificate rotation matters because the pair is normally a mounted Secret, and both
cert-manager and the OpenShift service CA rotate that Secret **in place without rolling the pod**.
A listener that read the files once at startup would keep presenting the old certificate until it
expired. Reading through `GetCertificate` costs two `stat` calls per handshake, which is nothing
next to the handshake.

**An invalid rotation never causes an insecure downgrade.** The two directions are deliberately
different:

- **Startup is fail-closed.** A pair that is half-configured or does not load stops the process
  (`config.Validate`, then `NewCertReloader`). It never falls back to plaintext HTTP.
- **Rotation is fail-safe.** A rotated pair that does not load — truncated file, partial write,
  mismatched key, file removed — or whose leaf is expired or not yet valid is logged and the **last-known-good certificate keeps being
  served**. The listener is not torn down, the transport is not weakened, and the next readable
  rotation is picked up automatically. The same policy applies to a failed cluster-TLS-profile
  re-read: the running policy is retained rather than downgraded to Intermediate.

If the serve loop itself fails terminally, the process exits non-zero rather than continuing in a
degraded state, so the operator's restart policy can act on it.

Rotating a CA bundle still requires a pod restart. The operator owns that rollout and a bundle
change is already a deployment change, so this is a deliberate restriction rather than a gap.

Covered by `pkg/tls/certreload_test.go`, including an end-to-end case that rotates the files under
a live listener and asserts the new certificate is presented on the next connection.

## Resolved-configuration diagnostics

`EnvConfig` implements `slog.LogValuer`, so logging the configuration is redacted by construction
rather than by remembering to redact at each call site. The startup summary reports:

- plain values for operational settings (port, namespaces, modes, log level);
- **presence flags** rather than values for anything an installer may consider sensitive
  (`auth.tokenPrefixSet`, `services.modelServingHostSet`, `services.prometheusHostSet`);
- counts rather than contents for the trust bundle and CORS lists, plus
  `transport.allowedOriginsWildcard` so a wildcard is visible without printing the list;
- `productionProfile` so the applied ruleset is unambiguous in the log.

No token, certificate, key or credential value is ever written. `cmd/startup_test.go` asserts this
on the real log output.

## xKS startup and minimal permissions

An xKS startup with the platform set explicitly (`ODH_PLATFORM_TYPE=XKS` or `--platform-type=XKS`)
issues **no OpenShift configuration API request at all**, with or without TLS. Auto-detection still
probes `ClusterVersion` once to resolve the platform. The
dashboard service account is not expected to hold permissions on `config.openshift.io`, and
issuing a request that can only fail or fall back would put that dependency in the startup path of
a cluster that does not have the API.

There are two such reads, and both are skipped:

| Read                                          | Purpose on OpenShift                      | On xKS                                                                                                                                                                                 |
| --------------------------------------------- | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ClusterVersion` + `console-config` ConfigMap | Cluster ID and branding for `/api/status` | Skipped. `initStartupClusterInfoWith` takes the probe as a parameter, so the test asserts it is never reached rather than asserting on a log line.                                     |
| `apiservers.config.openshift.io/cluster`      | Cluster-wide TLS security profile         | Skipped. `ListenAndServeTLSWithoutClusterProfile` serves Mozilla Intermediate defaults directly — the same policy the fallback would have produced — and keeps certificate hot-reload. |

The `config.openshift.io` rule in `manifests/base/cluster-role.yaml` is therefore inert on a
**confirmed** xKS platform. Set `ODH_PLATFORM_TYPE=XKS` before dropping it from an xKS-only overlay:
an auto-detected platform whose probe was inconclusive still reads the profile (below).

Auto-detection confirms xKS only when discovery reports the `ClusterVersion` API absent. A
successful read is OpenShift, with or without a usable cluster ID. When the probe is inconclusive
(the `version` singleton is missing, or the read is forbidden or times out), the resolved
platform is **XKS**, the least-privilege answer, but it is marked **unconfirmed**. An unconfirmed
platform keeps the conservative admission mode and keeps the profile-aware TLS listener
(`ListenAndServeTLSWithReload`), because the cluster may still be OpenShift with a Modern or Custom
profile. Only a configured or positively detected xKS platform uses
`ListenAndServeTLSWithoutClusterProfile`. An explicit `ODH_PLATFORM_TYPE` always wins, and a
disagreement with the probe is logged.

## Retained supporting services

| Service             | Endpoint                                                                                 | Namespace              | TLS                                      | Credentials                                                                              | Response contract                                                  |
| ------------------- | ---------------------------------------------------------------------------------------- | ---------------------- | ---------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Kubernetes API      | rest config (in-cluster or kubeconfig)                                                   | n/a                    | Root pool + bundles                      | Caller bearer token; SA client for the privileged reads listed in the bootstrap contract | Kubernetes `v1.Status` on failure, sanitized by the error contract |
| Model serving       | `MODEL_SERVING_HOST`, else `https://model-serving-api.<namespace>.svc.cluster.local:443` | dashboard namespace    | Root pool + bundles, SSRF-guarded dialer | Caller bearer token forwarded                                                            | Passthrough; local failures use the proxy error contract           |
| Module BFFs         | federation config / per-module service                                                   | per module             | Root pool + bundles                      | Caller bearer token forwarded                                                            | Passthrough, `Cache-Control: no-store` forced on replies           |
| Prometheus / Thanos | `PROMETHEUS_HOST`, else built from namespace/instance/port                               | `PROMETHEUS_NAMESPACE` | Root pool + bundles                      | Caller bearer token                                                                      | OpenShift only; 404 on xKS via `requirePlatform`                   |

A mock response is never evidence that one of these is available. `MOCK_HTTP_CLIENT`,
`MOCK_BFF_CLIENTS` and `MOCK_K8S_CLIENT` all move the deployment out of the production profile, so
a configuration that relies on them cannot be mistaken for a production one.

## See also

- [bootstrap-contract.md](./bootstrap-contract.md) — `/api/status`, admission and UI capability
- [error-contract.md](./error-contract.md) — error envelope and request correlation
- `bff/internal/config/validate.go` — the enforced rules
- `bff/cmd/startup_test.go` — the tests that drive the real parser
