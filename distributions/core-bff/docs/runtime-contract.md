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

Numbers and booleans are parsed strictly, from the environment and the command line alike. `PORT`
and `-port` must be a canonical decimal (no sign, spaces, leading zeros or hex); `DEV_MODE`,
`MOCK_K8S_CLIENT`, `MOCK_HTTP_CLIENT`, `MOCK_BFF_CLIENTS` and `INSECURE_SKIP_VERIFY` must be a
`strconv.ParseBool` value (`true`, `false`, `1`, `0`, ...). A malformed value fails startup
instead of silently becoming the default; the error names the variable, not the value. `LOG_LEVEL`
is the one exception: an invalid value logs a warning and uses `INFO`.

An explicitly empty variable overrides its default, so a required setting set to blank fails
startup (`DASHBOARD_CONFIG_NAME`, `NAMESPACE`, `STATIC_ASSETS_DIR`, `AUTH_TOKEN_HEADER`). In the
namespace fallback chain an empty `NAMESPACE` or `POD_NAMESPACE` counts as unset and falls
through to the next one.

The command line accepts only `-flag=value` settings. A positional argument is refused, because
flag parsing stops at the first one and any flag after it (for example `-cert-file`) would be
silently ignored. Parse errors name at most the flag, never the argument text. Enum settings
(`DEPLOYMENT_MODE`, `ODH_PLATFORM_TYPE`, `ADMISSION_MODE`, `AUTH_METHOD`) and an invalid
`MODEL_SERVING_HOST` or `PROMETHEUS_HOST` are reported by setting name and accepted values, never
by the rejected value. `-h` prints flag names and descriptions without their environment-derived defaults and
exits 0.

## Startup is a gate

`parseStartupConfig` resolves the configuration and validates it before anything is built. A
configuration that does not validate does not start. Once parsing and enum resolution succeed,
validation collects every problem it finds and prints them in one pass, so a fix does not need one
restart per mistake. A flag or enum value that fails to parse stops startup on its own, before
validation runs:

```
core-bff refusing to start: invalid configuration (2 problems):
  - AUTH_METHOD=disabled is not supported in a production profile; use user_token, or set MOCK_K8S_CLIENT=true for a local run without a cluster
  - CERT_FILE/--cert-file is set but KEY_FILE/--key-file is not; TLS needs both, and a partial pair must not fall back to plaintext HTTP
```

## Settings

### Core

| Flag                      | Environment                                          | Default                | Notes                                                                                |
| ------------------------- | ---------------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------ |
| `--port`                  | `PORT`                                               | `4000`                 | Must be an integer 1–65535. A malformed explicit `PORT` is refused.                  |
| `--deployment-mode`       | `DEPLOYMENT_MODE`                                    | `standalone`           | `standalone` or `federated`.                                                         |
| `--platform-type`         | `ODH_PLATFORM_TYPE`                                  | _(auto-detect)_        | `OpenShift`, `XKS`, or empty. Explicit always wins over detection.                   |
| `--admission-mode`        | `ADMISSION_MODE`                                     | _(from platform)_      | `auth-resource` or `authenticated`. See the bootstrap contract.                      |
| `--namespace`             | `NAMESPACE`, else `POD_NAMESPACE`, else `OC_PROJECT` | `opendatahub`          | Dashboard namespace. Required. The RHOAI and ODH overlays set `POD_NAMESPACE` only.  |
| `--workbench-namespace`   | `WORKBENCH_NAMESPACE`                                | _(= namespace)_        | Namespace allowlist entry.                                                           |
| `--operator-namespace`    | `OPERATOR_NAMESPACE`                                 | _(empty)_              | Preferred subscription namespace (OpenShift).                                        |
| `--dashboard-config-name` | `DASHBOARD_CONFIG_NAME`                              | `odh-dashboard-config` | OdhDashboardConfig CR name.                                                          |
| `--enabled-apps-cm`       | `ENABLED_APPS_CM`                                    | _(empty)_              | ConfigMap tracking enabled applications.                                             |
| `--static-assets-dir`     | `STATIC_ASSETS_DIR`                                  | `./static`             | SPA asset root. Required.                                                            |
| `--log-level`             | `LOG_LEVEL`                                          | `INFO`                 | `error`, `warn`, `info`, `debug`.                                                    |
| `--mf-remotes-config`     | `MF_REMOTES_CONFIG`                                  | _(empty)_              | Module federation remotes file. Errors name the setting, never the path or contents. |
| `--namespace-candidates`  | `NAMESPACE_CANDIDATES`         | _(empty)_              | xKS discovery candidates, comma-separated. Grants nothing. See the namespace discovery contract. |
| `--namespace-discovery-label-selector` | `NAMESPACE_DISCOVERY_LABEL_SELECTOR` | _(empty: off)_ | Opt-in service-account enumeration of extra xKS candidates. Needs SA `list namespaces`. |

### Authentication

| Flag                   | Environment          | Default                    | Notes                                                                                                                                                         |
| ---------------------- | -------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--auth-method`        | `AUTH_METHOD`        | `user_token`               | `user_token` or `disabled`. `disabled` is rejected in a production profile.                                                                                   |
| `--auth-token-header`  | `AUTH_TOKEN_HEADER`  | `x-forwarded-access-token` | Required when `AUTH_METHOD=user_token` and `AUTH_TOKEN_HEADERS` is unset; a valid HTTP field name that is not hop-by-hop, `Host` or `Cookie`. `Authorization` needs `AUTH_TOKEN_PREFIX`. |
| `--auth-token-prefix`  | `AUTH_TOKEN_PREFIX`  | _(empty)_                  | Set to `Bearer ` when the header is `Authorization`.                                                                                                          |
| `--auth-token-headers` | `AUTH_TOKEN_HEADERS` | _(empty)_                  | Ordered list of credential headers. When set, replaces `AUTH_TOKEN_HEADER`; `AUTH_TOKEN_PREFIX` must be unset. See [Caller credentials](#caller-credentials). |

## Caller credentials

Tracked by [RHOAIENG-96081](https://redhat.atlassian.net/browse/RHOAIENG-96081). One caller
identity is resolved once per request, by `InjectRequestIdentity`, and every transport uses it:
REST handlers, the Kubernetes HTTP proxy (`/api/k8s/*`), the Kubernetes WebSocket proxy
(`/wss/k8s/*`), the model-serving proxy and the module proxies. The extractor lives in
`bff/internal/callerauth` and knows nothing about Kubernetes.

The identity carries only the token. Who the caller is comes from `SelfSubjectReview` against the
API server, never from a header. `X-Forwarded-User`, `X-Forwarded-Groups`, `Impersonate-*` and
`X-Remote-*` are never read as identity, are removed before any request is proxied, and cannot be
configured as credential headers. Neither can `X-Request-ID` and `Audit-ID`, which the correlation
middleware removes before authentication. Startup rejects all of them, and any name that is not a
valid HTTP header, in `AUTH_TOKEN_HEADERS` and in `AUTH_TOKEN_HEADER` alike. A rejected entry is reported by
setting and position, never by its value, so a token pasted into the setting by mistake does not
reach the log. A list that is set but names no header (`,` or whitespace only) also fails startup
rather than falling back to the single-header mode. An empty value is the same as unset.

### Two modes, one setting

| `AUTH_TOKEN_HEADERS` | Mode          | Used by                                                        | Behaviour                                                                                         |
| -------------------- | ------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| unset _(default)_    | single header | OpenShift (unchanged)                                          | Reads `AUTH_TOKEN_HEADER`; strips `AUTH_TOKEN_PREFIX` when set (the prefix must then be present). |
| ordered list         | precedence    | xKS (RHAII manifest: `Authorization,x-forwarded-access-token`) | Rules below. `AUTH_TOKEN_PREFIX` must be empty; the combination fails startup as ambiguous.       |

The xKS gateway sends the Entra access token in both `Authorization: Bearer` and
`x-forwarded-access-token`. Which one is the contract is not decided yet, so the xKS value accepts
both, `Authorization` first; the RHAII manifest (`manifests/distributions/rhaii/deployment.yaml`)
sets that value. Switching to one header is a configuration change, not a code change.

### Precedence rules (ordered list)

Headers are consulted in the configured order.

1. **Absent or empty** headers are skipped. The HTTP server trims surrounding whitespace from header
   values, so a whitespace-only value sent on the wire arrives empty and is skipped too.
2. **`Authorization` must use the Bearer scheme** (`Bearer <token>`, scheme case-insensitive). Any
   other header carries the bare token. A token with embedded whitespace or a comma is malformed.
3. **A header that is present must be well formed.** A malformed header fails the request; it does
   **not** fall through to the next header, because the edge may have authenticated exactly that
   header.
4. **A header repeated with several values** is rejected.
5. **Every credential presented must be the same token.** The first in order is reported as the
   source. Two different tokens fail closed: the BFF cannot tell which one the edge authenticated.
6. **None present** is a missing credential.

| Request                                                     | Result                              |
| ----------------------------------------------------------- | ----------------------------------- |
| `Authorization: Bearer T`                                   | Caller `T`                          |
| `x-forwarded-access-token: T`                               | Caller `T`                          |
| both, same `T`                                              | Caller `T` (source `Authorization`) |
| both, different tokens                                      | 401                                 |
| `Authorization: Basic …` (with or without a valid fallback) | 401                                 |
| `Authorization: Bearer` with no token, repeated header      | 401                                 |
| only empty or whitespace-only credential headers            | 401 (missing credential)            |
| no credential header                                        | 401                                 |

### Failing closed

Every route except the public ones (`/healthcheck`, the OpenAPI document, the static SPA shell and
the OpenShift-only NIM status routes) requires a credential. A protected route without one returns
`401` under the [error contract](./error-contract.md), which keeps it distinct from upstream
transport and availability failures (`502`/`503`/`504`); the request log records
`CREDENTIALS_MISSING` or `CREDENTIALS_INVALID`, never the value. The
Kubernetes HTTP and WebSocket proxies also refuse, on their own, any request without a caller
token, so an uncredentialed request can never reach the API server anonymously.

Outside `DEV_MODE` nothing can replace a missing or rejected caller credential:

- The kubeconfig/service-account identity is used only by the documented service-account reads
  (see the [bootstrap contract](./bootstrap-contract.md#service-account-permissions)), never as a
  substitute for the caller.
- A client certificate in the kubeconfig is **not** presented with a caller credential. The
  Kubernetes proxies present it only for the `DEV_MODE` fallback identity (no caller credential
  sent), on a separate connection pool; outside `DEV_MODE` it is never presented (see
  [TLS inputs](#tls-inputs)). The typed clients drop it too (`rest.AnonymousClientConfig`).
- `DEV_MODE` keeps its kubeconfig fallback identity for local development, but only when **no**
  credential header was sent at all. A credential header that was sent, even empty, blocks the
  fallback. A malformed or conflicting one is rejected with 401, as in production; an empty one is
  skipped like an absent one in the ordered list (rule 1), so the request is a 401 only when no other
  configured header carries a token. With `AUTH_METHOD=disabled` no credential is ever read, so under `DEV_MODE`
  every request is the fallback identity and runs as the kubeconfig. On the Kubernetes proxies that
  needs a kubeconfig with a bearer token or a client certificate: with an exec-plugin kubeconfig
  (for example `kubelogin` on AKS) the proxies have no kubeconfig credential to present, so proxied
  requests reach the API server without one. Without `DEV_MODE`, disabled auth
  only works with the mock clients. `DEV_MODE` is a development profile and cannot be enabled in
  production without the profile changing.

### Where the configured headers are applied

Every configured header (plus `AUTH_TOKEN_HEADER`, which module proxies use as their outbound
header) is:

- removed from inbound requests before any HTTP proxy forwards them (the WebSocket proxy never copies
  inbound headers: its upstream handshake is built from scratch); the proxies install the resolved
  caller token themselves (`Authorization: Bearer` for the Kubernetes API);
- redacted in request debug logs and never written in error text;
- allowed as a CORS request header and listed in `Vary` on `/api` responses;
- rejected as a static header in module-proxy configuration when `authorize` is on.

WebSocket upgrades are authenticated the same way as any other request, before the upgrade. The
browser cannot set `Authorization` on a WebSocket, so on xKS the gateway supplies the header.

Covered by `bff/internal/callerauth/credentials_test.go` (precedence and rejections),
`bff/internal/api/caller_auth_transport_test.go` (routing and identity resolution for every transport through the real handler tree; the proxies themselves are replaced by recorders there),
`bff/internal/proxy/caller_auth_test.go` (proxy stripping and fail-closed forwarding) and the
`xks/testCoreBffCallerAuth` and `openshift/testCoreBffCallerAuth` contract suites.
`scripts/validate-caller-auth.sh` runs the same checks against a live cluster with a throwaway
ServiceAccount (`PLATFORM=XKS` or `PLATFORM=OpenShift`). It never prints a token or passes one as
a process argument: credential headers are written to files only the user can read and passed to
curl and the WebSocket client by path. A `BFF_URL` it does not start must be `https://`, or
`http://` on a loopback host for a port-forward, so tokens never cross a remote plaintext link. Its
`X-Remote-*` row only checks that the caller keeps its own access: the API server ignores those
headers on a bearer-token connection, so their stripping is shown by `caller_auth_test.go`, which
inspects the upstream request. On xKS it also creates a second ServiceAccount that may patch only
its test Namespace, so the mutation rows prove the caller's credentials are used without an admin
token; the cluster-scoped grant is removed on exit. Skipped rows are counted, and `STRICT=true`
fails the run when any were skipped.

### Transport and trust

| Flag                     | Environment            | Default                | Notes                                                               |
| ------------------------ | ---------------------- | ---------------------- | ------------------------------------------------------------------- |
| `--cert-file`            | `CERT_FILE`            | _(empty)_              | Serving certificate. Both halves or neither.                        |
| `--key-file`             | `KEY_FILE`             | _(empty)_              | Serving key.                                                        |
| `--bundle-paths`         | `BUNDLE_PATHS`         | _(4 well-known paths)_ | Comma-separated PEM CA bundles for the HTTP clients and proxies.    |
| `--insecure-skip-verify` | `INSECURE_SKIP_VERIFY` | `false`                | Requires `DEV_MODE=true`; rejected everywhere else.                 |
| `--allowed-origins`      | `ALLOWED_ORIGINS`      | _(none)_               | CORS origins. Production accepts exact `scheme://host[:port]` only. |

### Development and mocks

`DEV_MODE`, `MOCK_K8S_CLIENT`, `MOCK_HTTP_CLIENT`, `MOCK_BFF_CLIENTS`, `DEV_MODE_CLIENT_PORT`,
`DEV_USER`, `DEV_GROUPS`. All default to off/empty, except `DEV_MODE_CLIENT_PORT` (`8080`) and
`DEV_USER` (`developer`).

### Services

`MODEL_SERVING_HOST`, `PROMETHEUS_HOST`, `PROMETHEUS_NAMESPACE` (`openshift-monitoring`),
`PROMETHEUS_INSTANCE` (`thanos-querier`), `PROMETHEUS_PORT` (`9092`).

`MODEL_SERVING_HOST` and `PROMETHEUS_HOST`, when set, must be absolute `http(s)://host[:port]`
URLs with a port, if any, between 1 and 65535 (not empty), no user info, no query string or
fragment, and no surrounding whitespace; request paths are joined under the base path (a trailing
`/` does not double) and queries are appended, and a bad value fails startup instead
of failing the first request. Without `PROMETHEUS_HOST` the target is derived as
`https://<instance>.<namespace>.svc.cluster.local:<port>`, so `PROMETHEUS_PORT` must be a port
number and the assembled URL must pass the same checks. The three parts are all-or-nothing: all
set derives the target, all empty turns Prometheus off, and only some set fails startup. They are
logged only when in use, that is without `PROMETHEUS_HOST`. Both targets receive the caller's bearer
token, so they require `https` unless `DEV_MODE=true`, including when only `MOCK_K8S_CLIENT` is
set; the loopback mock Prometheus started when no host is configured is not affected. A path in
`MODEL_SERVING_HOST` is a base the upstream is mounted under: `https://models.example/serving`
receives `/serving/<route>`. The same holds for a kubeconfig API server URL with a path, on both
the HTTP and the WebSocket proxy. Escaping is preserved on both sides of the join: a base of
`/tenant%2Fblue` stays one segment, `%23` is never read as a fragment, and an escaped route keeps
its escaping. The Prometheus and inter-BFF clients refuse a redirect that
changes the scheme, host or effective port before sending it, since net/http would forward the
caller's token on such a redirect. Problems name the setting, never the value.

### Kubernetes names

`NAMESPACE`, `OPERATOR_NAMESPACE`, `WORKBENCH_NAMESPACE` and `PROMETHEUS_NAMESPACE` must be valid
namespace names (DNS-1123 labels), `PROMETHEUS_INSTANCE` a valid Service name (DNS-1035 label), and
`DASHBOARD_CONFIG_NAME` and `ENABLED_APPS_CM` valid object names (DNS-1123 subdomains), when set.
These values end up in API paths and in-cluster DNS names, so a value such as
`monitoring/thanos-querier` would otherwise change the request target. An optional name may be
empty, but whitespace is an invalid value. `DASHBOARD_CONFIG_NAME` is required. Problems name the
setting, never the value.

## Profiles

A deployment is in a **production profile** unless `DEV_MODE` or `MOCK_K8S_CLIENT` is on. Both
mean there is no real cluster behind the process. `MOCK_HTTP_CLIENT` and `MOCK_BFF_CLIENTS` replace
one client each while every other client stays real, so on their own they keep the production
profile and its rejections. Opting into a development profile is explicit, which is what makes
these rejections safe:

| Rejected in a production profile                                                                                                                                                                                                                                                           | Why                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Way out                                                        |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `AUTH_METHOD=disabled`                                                                                                                                                                                                                                                                     | No caller identity is extracted at all.                                                                                                                                                                                                                                                                                                                                                                                                                                                             | `AUTH_METHOD=user_token`, or `DEV_MODE=true` locally.          |
| `INSECURE_SKIP_VERIFY=true` (also rejected with only `MOCK_K8S_CLIENT`, which leaves the other outbound clients real)                                                                                                                                                                      | Disables upstream certificate verification on every outbound call.                                                                                                                                                                                                                                                                                                                                                                                                                                  | Supply the upstream CA through `BUNDLE_PATHS`.                 |
| A kubeconfig with `insecure-skip-tls-verify`                                                                                                                                                                                                                                               | client-go honours it for the service-account and caller-token clients regardless of `INSECURE_SKIP_VERIFY`.                                                                                                                                                                                                                                                                                                                                                                                         | Supply the cluster CA in the kubeconfig.                       |
| A kubeconfig API server that resolves to `http://` (an explicit `http://` URL, or a scheme-less host without TLS settings, which client-go sends as plaintext)                                                                                                                             | The service-account token, and the caller tokens, would be sent to it in the clear; the discovery probe runs before any proxy would refuse it.                                                                                                                                                                                                                                                                                                                                                      | Use the `https://` API server URL.                             |
| `MODEL_SERVING_HOST` or `PROMETHEUS_HOST` over `http` (outside `DEV_MODE`, mocked Kubernetes or not)                                                                                                                                                                                       | Both receive the caller's bearer token, which plaintext HTTP would expose.                                                                                                                                                                                                                                                                                                                                                                                                                          | Use an `https://` URL; plaintext targets need `DEV_MODE=true`. |
| `ALLOWED_ORIGINS` with `*` anywhere (`*`, `https://*`, `https://*.example.com`), an entry with a path (including a trailing `/`), query or user info, the scheme's default port (`:443`, `:80`), or a non-canonical port or host (empty or zero-padded port, trailing dot, non-ASCII host) | CORS replies allow credentials and the middleware matches `*` as a wildcard, so a pattern admits any matching site. Browsers send `Origin` without a trailing slash, so `https://host/` could never match; they also omit the default port, so `https://host:443` could not either. The same holds for any port or host a browser would not serialize that way. Entries match case-insensitively, for CORS and WebSocket upgrades alike. Rejected entries are reported by position, never by value. | List each exact dashboard origin as `scheme://host[:port]`.    |

## TLS inputs

**Serving certificate.** `CERT_FILE` and `KEY_FILE` are both-or-neither. A half-configured pair
fails startup; it must never fall back to plaintext HTTP, because the failure mode is silent and
the operator's intent was clearly TLS. A pair that is present but does not load — missing file,
mismatched key, not PEM — also fails startup. The diagnostic names the setting that failed
(`CERT_FILE/--cert-file`, `KEY_FILE/--key-file`) and the reason, never the path or any PEM
material, since a key pasted where a path belongs would otherwise reach the log.

When no pair is supplied, the server listens on plain HTTP. That is the supported RHAII standalone
topology, where a Gateway or Ingress terminates TLS at the edge.

**Outbound trust.** There are two trust sources, and `BUNDLE_PATHS` governs only one of them.
Getting this wrong is an easy way to pass startup validation and still fail every request, so the
split is explicit:

| Transport                                                                                         | Trust source                                                         | Does `BUNDLE_PATHS` apply? |
| ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | -------------------------- |
| Kubernetes API **clients** (client-go: the service-account clients and the caller-token clients)  | The kubeconfig or in-cluster service-account CA, from `rest.Config`  | **No**                     |
| Kubernetes HTTP and WebSocket **proxies** (`/api/k8s/*`, `/wss/k8s/*`)                            | A copy of system pool + `BUNDLE_PATHS`, with the kubeconfig CA added | Yes                        |
| Model-serving proxy, module proxies, inter-BFF clients, Prometheus client, connection-test probes | System pool + `BUNDLE_PATHS`                                         | Yes                        |

The practical consequence: **supplying the Kubernetes API CA only through `BUNDLE_PATHS` does not
configure the client-go clients.** Identity resolution and every service-account read would still
fail certificate verification. The Kubernetes API CA must reach the pod the way client-go expects
it — the projected service-account CA at
`/var/run/secrets/kubernetes.io/serviceaccount/ca.crt` in-cluster, or the `certificate-authority`
in the kubeconfig out of cluster. `BUNDLE_PATHS` is for the upstream services the dashboard calls
over plain HTTP clients, not for the API server. The kubeconfig CA is added to a copy of the shared
pool that only the two Kubernetes proxies use, so the other transports never trust it.

There is no per-transport trust override and no per-transport skip-verify: `INSECURE_SKIP_VERIFY`
applies to every outbound transport and requires `DEV_MODE=true`. Every transport also checks
`DEV_MODE` itself, so no mock flag on its own (`MOCK_K8S_CLIENT`, `MOCK_HTTP_CLIENT` or
`MOCK_BFF_CLIENTS`) disables verification anywhere.

The default set does not include the service-account `ca.crt`. That file is the Kubernetes API CA,
and listing it would make the model-serving, module, inter-BFF and Prometheus transports trust it.
The RHOAI, ODH and MaaS Portal deployments still pass it explicitly in `--bundle-paths`, so on
those overlays the upstream transports also trust the Kubernetes API CA. That is the existing
deployment behaviour, kept unchanged here; dropping the path from those manifests is tracked as a
follow-up.

`BUNDLE_PATHS` has two modes, because the two cases have different failure semantics:

| Case                                       | Behaviour                                                                                                                                                                                                                                           |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Default set (the four well-known paths)    | Unreadable entries are skipped. Most do not exist on most clusters; the set is a convenience.                                                                                                                                                       |
| Supplied explicitly by environment or flag | If **no** path yields a certificate, startup fails. That includes an explicitly empty or separator-only value. Falling back to the system pool would be a silent trust downgrade. Failing entries are reported by 1-based position, never by value. |

**Client credentials.** Outbound client certificates come from the Kubernetes rest config
(`CertData`/`KeyData` or `CertFile`/`KeyFile`). A half-configured client pair is an error, the same
rule as the serving pair. The dashboard never presents a client certificate it was not given.

The Kubernetes proxies are caller-scoped: each request carries the caller's bearer token. A
kubeconfig client certificate is the BFF's own identity, and the API server does not define which
authenticator wins when a request carries both. The proxies therefore present it only on a
`DEV_MODE` fallback request, one that arrived without a caller token and runs on the developer's
kubeconfig identity; a `DEV_MODE` request that carries its own token is authenticated by that token
alone. Only a request that sent no credential at all falls back. In `DEV_MODE` a credential header
that was sent but is empty or malformed (wrong prefix, an empty or whitespace-only header, which the
HTTP parser trims to empty) is answered with 401, never with the fallback identity; that includes the
legacy `AUTH_TOKEN_HEADER` when `AUTH_TOKEN_HEADERS` is set. A caller token in the other
identity header (`Authorization: Bearer`, or `X-Forwarded-Access-Token`, whichever is not among the
configured ones) is the caller's credential too: it is used as the request identity, never replaced
by the fallback, and is 401 when malformed. A WebSocket bearer subprotocol (`base64url.bearer.authorization.k8s.io.<token>`, a browser's
only way to send a token on a WebSocket) counts the same way and is taken first; every
`Sec-WebSocket-Protocol` line is read. Otherwise the other identity headers are read with the list
rules: `Authorization` must use Bearer, a repeated header or two different tokens are a 401, and one
sent blank is an invalid credential. A fallback request on a certificate-only kubeconfig carries no bearer token at
all (no `Authorization` header, no bearer subprotocol), so it authenticates with the certificate
alone; no placeholder token is ever sent upstream. In every profile the WebSocket proxy and the
reverse proxies drop client-supplied bearer subprotocols and send only the resolved token, and every proxy strips
both inbound identity headers (`Authorization` and `X-Forwarded-Access-Token`) whichever is
configured; an `authorize` module receives the resolved token in both and in every other configured
credential header (`AUTH_TOKEN_HEADERS` or `AUTH_TOKEN_HEADER`; Bearer-prefixed only in `Authorization`). On an
`authorize` module route `Authorization`, `X-Forwarded-Access-Token` and every configured credential header are
reserved: a federation entry that sets a static value in any of them fails startup, and at request time they carry
only the resolved token, so a tokenless identity (a certificate-only fallback, or a mock without a
token) sends none of them. The host dashboard's module proxy sends
`Authorization`, so federated development keeps working.
Outside `DEV_MODE` the certificate is used only by the service-account clients. Every consumer of the
kubeconfig's server, credentials or TLS settings uses the one copy validated at startup rather than a
later re-read (only the context name reported by `/api/status` is read separately): the caller
clients, the `DEV_MODE` fallback client, the platform discovery probes (which run on the
service-account clients), and the proxies' API server host and TLS settings. With
`MOCK_K8S_CLIENT` the proxies present the envtest certificate, because they act as that identity.
The HTTP proxy adds impersonation headers for the caller; the WebSocket handshake builds its own
headers and does not, so WebSocket requests against envtest run as the envtest identity. With
`AUTH_METHOD=user_token`, both proxies refuse a token that maps to no mocked test user (`401`),
so such a token never runs as the envtest identity.

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
expired. Checking through `GetCertificate` costs two `stat` calls per full handshake, which is
nothing next to the handshake. A resumed TLS session may not call `GetCertificate`, so verify a
rotation on a fresh, non-resumed connection.

**An invalid rotation never causes an insecure downgrade.** The two directions are deliberately
different:

- **Startup is fail-closed.** A pair that is half-configured, does not load, or has a leaf outside
  its validity window stops the process (`config.Validate`, then `NewCertReloader`, which re-checks
  the window on the pair it actually serves). It never falls back to plaintext HTTP.
- **Rotation is fail-safe.** A rotated pair that does not load — truncated file, partial write,
  mismatched key, file removed — or whose leaf is expired or not yet valid is logged and the **last-known-good certificate keeps being
  served**. The listener is not torn down, the transport is not weakened, and the next readable
  rotation is picked up automatically. A failing pair is logged once and retried at most every
  10 seconds while its files stay unchanged (so a not-yet-valid leaf is still promoted once it
  becomes valid), never re-read on every handshake. The startup error names neither file path. The same policy applies to a failed cluster-TLS-profile
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
- **presence flags** rather than values for anything an installer may consider sensitive or that
  is free-form (`auth.tokenPrefixSet`, `staticAssetsDirSet`, `services.modelServingHostSet`,
  `services.prometheusHostSet`, `services.mfRemotesConfigSet`), and the derived Prometheus parts
  only when they are in use and so validated;
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

Auto-detection confirms xKS only when discovery reports the `ClusterVersion` API absent: a bare
404 on the read is confirmed through `/apis` before it counts (see
[bootstrap-contract.md](./bootstrap-contract.md)). A
successful read is OpenShift, with or without a usable cluster ID. When the probe is inconclusive
(the `version` singleton is missing, or the read is forbidden or times out), the resolved
platform is **XKS**, the least-privilege answer, but it is marked **unconfirmed**. An unconfirmed
platform keeps the conservative admission mode and keeps the profile-aware TLS listener
(`ListenAndServeTLSWithReload`), because the cluster may still be OpenShift with a Modern or Custom
profile. Only a configured or positively detected xKS platform uses
`ListenAndServeTLSWithoutClusterProfile`. An explicit `ODH_PLATFORM_TYPE` always wins, and a
disagreement with the probe is logged.

## Retained supporting services

| Service             | Endpoint                                                                                 | Namespace              | TLS                                                                   | Credentials                                                                                                                   | Response contract                                                  |
| ------------------- | ---------------------------------------------------------------------------------------- | ---------------------- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Kubernetes API      | rest config (in-cluster or kubeconfig)                                                   | n/a                    | Clients: rest config CA. Proxies: root pool + bundles + kubeconfig CA | Caller bearer token; SA client only for the reads listed in the bootstrap contract (and, on OpenShift, admin-gated mutations) | Kubernetes `v1.Status` on failure, sanitized by the error contract |
| Model serving       | `MODEL_SERVING_HOST`, else `https://model-serving-api.<namespace>.svc.cluster.local:443` | dashboard namespace    | Root pool + bundles, SSRF-guarded dialer                              | Caller bearer token forwarded                                                                                                 | Passthrough; local failures use the proxy error contract           |
| Module BFFs         | federation config / per-module service                                                   | per module             | Root pool + bundles                                                   | Caller bearer token forwarded                                                                                                 | Passthrough, `Cache-Control: no-store` forced on replies           |
| Prometheus / Thanos | `PROMETHEUS_HOST`, else built from namespace/instance/port                               | `PROMETHEUS_NAMESPACE` | Root pool + bundles                                                   | Caller bearer token                                                                                                           | OpenShift only; 404 on xKS via `requirePlatform`                   |

A mock response is never evidence that one of these is available. `MOCK_K8S_CLIENT` moves the
deployment out of the production profile. `MOCK_HTTP_CLIENT` and `MOCK_BFF_CLIENTS` do not, so the
real clients next to them keep every production check.

## See also

- [bootstrap-contract.md](./bootstrap-contract.md) — `/api/status`, admission and UI capability
- [error-contract.md](./error-contract.md) — error envelope and request correlation
- [namespace-discovery-contract.md](./namespace-discovery-contract.md) — xKS authorized namespaces and RHAII permissions
- `bff/internal/config/validate.go` — the enforced rules
- `bff/cmd/startup_test.go` — the tests that drive the real parser
