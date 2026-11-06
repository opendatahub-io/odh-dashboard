# Core BFF Error And Correlation Contract

Defines the shared Core BFF error and request-correlation contract for native APIs, HTTP proxy
failures and WebSocket connections. Route availability and credential policy are configured separately.

## Response Sources

Versioned native and service-proxy BFF failures use `{ "error": { "code": "FORBIDDEN", "message": "insufficient permissions for this operation", "requestId": "<UUIDv4>" } }`.
Messages are selected from a safe catalog, never raw errors or submitted values.

Local failures on unversioned native APIs and the Perses proxy use
`{ "code": "FORBIDDEN", "message": "insufficient permissions for this operation", "error": "insufficient permissions for this operation", "requestId": "<UUIDv4>" }`.
Existing Fastify consumers read the top-level `message` or string `error`; the Perses client reads
`error` first. Keep this response format through proxy path rewriting, including both BFF aliases.
MaaS and GenAI proxy failures retain the nested envelope. Upstream service responses pass through.

| BFF cause                                 | HTTP      | Code                                  |
| ----------------------------------------- | --------- | ------------------------------------- |
| Missing/malformed or rejected credentials | 401       | UNAUTHORIZED                          |
| Confirmed policy/access denial            | 403       | FORBIDDEN                             |
| Missing route/resource                    | 404       | NOT_FOUND                             |
| Unsupported method                        | 405       | METHOD_NOT_ALLOWED                    |
| Local conflict                            | 409       | CONFLICT                              |
| Malformed request / semantic validation   | 400 / 422 | BAD_REQUEST / VALIDATION_FAILED       |
| Dependency timeout / known unavailable    | 504 / 503 | GATEWAY_TIMEOUT / SERVICE_UNAVAILABLE |
| Other upstream transport/protocol error   | 502       | BAD_GATEWAY                           |
| Unexpected local failure                  | 500       | INTERNAL_SERVER_ERROR                 |

Existing connection-test codes `INVALID_REQUEST`, `UNSUPPORTED_TYPE` and `PROBE_BUSY` remain stable,
with fixed safe messages.

Missing/malformed credentials are detected locally. Trusted credential causes are distinguished in
logs as `CREDENTIALS_MISSING`, `CREDENTIALS_INVALID` or `CREDENTIALS_EXPIRED`; all use 401 UNAUTHORIZED
on the wire. A future authentication strategy can supply the trusted invalid/expired cause.
An upstream 401 does not prove expiry. A successful SelfSubjectReview without a username is unresolved identity: return 401 `UNAUTHORIZED` and log `IDENTITY_UNRESOLVED`, without claiming the token is invalid. Other SSR request failures retain their actual cause.

Completed access reviews use `status.allowed`, even when `evaluationError` is present. Diagnostics log only the boolean outcome and a fixed event name, never upstream text. Guarded operations propagate failed reviews and never grant access on a failure. The authenticated `/api/status` probe preserves the session and reports conservative flags when its reviews fail.

The Kubernetes HTTP proxy strips outbound `Connection` and `Upgrade` headers and retains its defensive 502 rejection of upstream protocol switches. WebSocket clients use `/wss/k8s/*`.

The Kubernetes HTTP proxy (`/api/k8s/*`, including its `/core-bff` alias) returns Kubernetes `v1/Status` for every pre-commitment failure, including local authentication, policy and transport failures. This preserves Kubernetes SDK rejection behavior. Local failures use `reason: DashboardProxyError`, the safe catalog message, and the stable BFF code in `details.causes[].reason`; correlation remains in `X-Request-ID`. Keep the inbound response format through outbound path rewriting.

Kubernetes failures at proxy boundaries preserve their upstream HTTP status and a Kubernetes
`v1/Status` representation, including reason and applicable details; this covers HTTP proxy
failures and rejected upstream WS handshakes, including 401/403, 409, 410, 422, 429 and retry
metadata. Versioned native typed-client failures with an upstream Kubernetes cause use the BFF
envelope, preserving the upstream HTTP status and selecting the code from the local status catalog.
Unversioned native upstream Kubernetes failures retain sanitized Status with a top-level message.
Non-Kubernetes service responses retain their service
contract. Successful resource responses and non-error watch events retain their original bytes.
JSON HTTP watches buffer one newline-delimited event at a time; HTTP and WS watch `ERROR` objects retain their Status semantics with the same sanitization as ordinary failure responses. WebSocket watch detection uses the rewritten Kubernetes path and original query, including legacy watch paths and both BFF aliases. Non-watch WebSocket messages retain their frame type and bytes, including JSON objects shaped like watch ERROR events.
HTTP watches retain supported `application/json` Accept entries, including representation parameters and quality weights, and use plain `application/json` when none remain; an unexpected response media type fails before commitment with a 502 `DashboardProxyError` Status whose cause is `BAD_GATEWAY`. Malformed JSON events and incomplete events ending in a transport error are discarded and terminate the stream without appending JSON. A complete final JSON event without a newline is accepted.
The upstream JSON encoding of each HTTP watch event is limited to 4 MiB, including its newline when present. An oversized event is discarded, logs a safe correlated read failure, and causes the proxy to terminate the stream without appending JSON. Events within the limit retain their existing sanitization and byte-preservation behavior; this cap does not apply to WebSocket messages.
Plain and `base64.binary.k8s.io` watches sanitize complete JSON events, buffering events that span
messages and processing multiple events in one message. Base64 messages are decoded and re-encoded;
non-error event bytes and stream delimiters are preserved after decoding. Incomplete events buffer
at most 4 MiB. Invalid base64/JSON, oversized incomplete events, or an upstream close with a pending
incomplete event closes the connection with code 1011 without forwarding the fragment.
Non-watch connections retain their original frame types and bytes regardless of subprotocol.
HTTP watch detection recognizes legacy `/api/<version>/watch/...` and `/apis/<group>/<version>/watch/...` routes before and after proxy path rewriting, including both BFF aliases. Legacy watch paths remain watches even with `watch=false`. Other paths use Kubernetes' query conversion, including `watch=1`, `watch=TRUE`, empty values and bare `watch`; absent parameters, `watch=0` and case-insensitive `watch=false` disable it.
The Kubernetes proxy disables transparent transport decompression so error bodies can be bounded to 1 MiB both on the wire and after decoding. HTTP watches request gzip independently of the caller's `Accept-Encoding` and decode it before event sanitization. Non-watch successful responses retain the caller's negotiated compression. An invalid gzip header or unsupported watch encoding fails closed before commitment with a 502 `DashboardProxyError` Status whose cause is `BAD_GATEWAY`, preventing an encoded stream from bypassing ERROR-event sanitization.

The native `/api/prometheus/*` query family retains its existing `{code, response}` format and
Prometheus-specific status/body semantics. BFF-generated unexpected query failures use a fixed safe
message inside that format. Upstream Prometheus error bodies retain their service contract and are
outside the Kubernetes sanitization policy.

The HTTP Kubernetes proxy rejects upstream protocol upgrades before commitment with a 502 `DashboardProxyError` Status whose cause is `BAD_GATEWAY`. WebSocket clients use `/wss/k8s/*` (or its `/core-bff` alias), where the dedicated relay sanitizes ERROR messages and enforces the WebSocket policy.

## Sanitization

Caller-token Kubernetes resource proxies preserve upstream `Status.message`, validation cause text,
field paths and resource names. Existing consumers use these for not-found detection, duplicate-name
messages and actionable quota, validation and admission explanations. Apply targeted redaction to
complete known request credentials, recognized Bearer/Basic credentials, bearer subprotocols and credential assignments, including quoted keys and JSON-escaped diagnostic representations. Short credential values are redacted in explicit credential contexts, rather than replaced inside ordinary words. Credential validation fields include terminal bracketed map keys. Complete JSON and PEM assignment values are redacted; YAML blocks and malformed structured or PEM values suppress the remaining diagnostic when their extent cannot be safely determined. Ordinary subprotocol names are not treated as credentials.
Diagnostic strings are bounded to 8 KiB; longer strings use the safe fallback. A 404 response includes
`404` in its message so existing numeric and `not found` checks continue working.

Native typed-client failures, Secret resource operations and unrecognized proxy routes retain strict
sanitization. Native handlers may use service-account credentials, so caller-token diagnostic access
does not apply there. Generate their messages from standard reasons, known cause types and sanitized
field paths. Omit resource names, map keys and arbitrary upstream explanations. Summaries include at
most three field diagnostics below 1 KiB; the complete sanitized cause list remains available.

Both policies omit metadata and UID, retain bounded group/kind and retry delay, and decode JSON and
Kubernetes protobuf Status bodies. Error bodies remain bounded to 1 MiB on the wire and after
decompression. Unsupported encodings, malformed bodies and limit violations use a safe fallback with
the original HTTP status. HTTP watch ERROR objects and rejected WS handshakes use the same resource
boundary. Other successful resource responses and non-error watch events remain unchanged.

This deliberately restores the caller-visible Kubernetes diagnostic contract for ordinary resources.
Targeted redaction cannot identify every sensitive value in upstream diagnostics. This includes admission explanations and validation echoes of submitted values on non-Secret resources, such as ConfigMaps, pod environment fields and custom resources. Such values can remain when they do not match a credential context; compatibility does not imply universal secret detection. Strict suppression remains the policy for Secret operations. BFF-generated errors, native failures,
logs and WebSocket close reasons retain fixed safe classifications and text.
Non-Kubernetes service response bodies retain their own contracts and are not sanitized by the
Kubernetes response adapter.

Request/error/audit logging in this contract uses safe classifications and correlation instead of
arbitrary upstream/transport text. Request debug logs omit query/userinfo and redact credential
headers, including configured token headers. Authenticated audit identity is permitted; unrelated
identities from upstream error messages are not.

## Correlation

Generate one fresh canonical UUIDv4 per inbound request. Ignore every incoming `X-Request-ID`,
including duplicate, malformed and oversized values. Return `X-Request-ID` on responses, including
early errors and WS 101/rejection, and in BFF error `error.requestId` (top-level `requestId` for
unversioned native and Perses failures). Forward it to upstreams.
Use `request_id` in structured logs; `trace_id` remains an alias for existing log consumers.
Connection IDs remain distinct. Expose `X-Request-ID` and `Audit-ID` through configured CORS.

CORS applies to the complete route tree, including exact-root errors and mux-generated responses.
Public health, OpenAPI and static routes already supported CORS. With an allowed origin configured,
preflights on previously unwrapped early-error paths can now return 204. CORS library debug output
stays disabled to avoid logging unredacted header values.

Preserve available upstream `Audit-ID` separately, accepting only canonical 36-byte UUIDs. Return
it as `Audit-ID` and log it as `upstream_audit_id`. For typed clients with multiple calls, retain the
latest available valid ID per request; do not claim it identifies all upstream operations. Never
substitute it for the BFF ID or forward caller-supplied audit IDs as server-generated identifiers.

## Streaming And WebSockets

Before response commitment, local Kubernetes HTTP proxy failures use Status; native and service-proxy failures use the BFF envelope. After headers/data have started, terminate the stream and log its safe correlated failure; never append JSON or send a second
status. Client cancellation aborts work without synthesizing a server error. Preserve reverse-proxy
abort panics through recovery middleware so partial responses cannot appear successfully complete.

Before WS upgrade, preserve upstream rejection status and safe Status body; local rejections use the
BFF contract. After upgrade, send valid upstream close codes with fixed safe reasons. Use 1000 for
normal closure, 1008 for policy rejection, 1011 for upstream/internal failure and 1001 for shutdown.
A valid empty close frame is treated as normal closure (1000), including its acknowledgement and relay to the other peer. Gorilla's internal no-status sentinel (1005) is not a wire code; reserved/invalid wire codes remain rejected. Reasons use fixed UTF-8 catalog text below the 123-byte protocol
limit; upstream and peer free text is discarded. Shutdown notification is implemented by the existing
connection tracker, which removes tracked connections under its lock before closing them and shares one absolute deadline across shutdown close-frame writes; process draining/timing remains with the lifecycle task. Other heartbeat, message-size and lifetime limits remain with proxy hardening.

Native BFF 400/401/403 rejections and native Kubernetes 4xx failures log at Warn. Native request
failures, HTTP proxy transport failures and tracked stream reads/writes log cancellation at Debug;
unexpected failures log at Error. Recovered panics include at most
32 stack frames with function names and source locations, excluding panic text and argument values.

## WebSocket Implementation Layout

| File                                                                       | Responsibility                                                                                                         | Tests                                                                                                                                                 |
| -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| [ws_proxy.go](../bff/internal/proxy/ws_proxy.go)                           | Configuration, construction, request flow and HTTP failure handling.                                                   | [Request flow](../bff/internal/proxy/ws_proxy_test.go), [error contract](../bff/internal/proxy/error_contract_test.go)                                |
| [ws_handshake.go](../bff/internal/proxy/ws_handshake.go)                   | Origin checks, upstream dialing, bearer subprotocols and browser upgrade.                                              | [ws_handshake_test.go](../bff/internal/proxy/ws_handshake_test.go)                                                                                    |
| [ws_handshake_response.go](../bff/internal/proxy/ws_handshake_response.go) | Bounded rejection-body capture before Gorilla's 1 KiB truncation, preserving TLS verification and successful upgrades. | [ws_handshake_response_test.go](../bff/internal/proxy/ws_handshake_response_test.go), [rejection tests](../bff/internal/proxy/error_contract_test.go) |
| [ws_relay.go](../bff/internal/proxy/ws_relay.go)                           | Bidirectional forwarding, heartbeat and bridge cleanup.                                                                | [ws_relay_test.go](../bff/internal/proxy/ws_relay_test.go)                                                                                            |
| [ws_close.go](../bff/internal/proxy/ws_close.go)                           | Close-code validation, safe reasons and close/shutdown notifications.                                                  | [ws_close_test.go](../bff/internal/proxy/ws_close_test.go)                                                                                            |
| [ws_tracker.go](../bff/internal/proxy/ws_tracker.go)                       | Connection tracking, metrics and stale-connection cleanup.                                                             | [ws_tracker_test.go](../bff/internal/proxy/ws_tracker_test.go)                                                                                        |

## Verification And Integration

Use local HTTP/TLS/WS servers through production middleware and clients to test status preservation,
SDK Status decoding, review failures, correlation isolation and redaction. Synthetic token factories
prove fixture behavior, not production rejection. Run BFF tests and both platform contract suites.

## Implementation And Test Coverage

| Area                                                | Implementation and automated evidence                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shared classification, Status details and redaction | [httpcontract](../bff/internal/httpcontract/errors.go) and [contract tests](../bff/internal/httpcontract/contract_test.go) and [diagnostic tests](../bff/internal/httpcontract/diagnostics_test.go): safe field summaries, upstream-only secret suppression, wrapped causes, stable codes, SDK decoding, validation and resource-version/field-manager causes, retry delay, canary redaction and bounded error bodies.                                                    |
| Native handlers, authentication and discovery       | [Native errors](../bff/internal/api/errors.go), [namespace handling](../bff/internal/api/namespaces_handler.go), [auth middleware](../bff/internal/api/middleware_auth.go), [status aggregation](../bff/internal/repositories/status.go): authenticated probes degrade to conservative flags; guarded operations still reject failed reviews. [Production-path tests](../bff/internal/api/error_contract_test.go) exercise real SSR clients against a controlled TLS API. |
| HTTP proxies and streaming                          | [Shared factory](../bff/internal/proxy/factory.go), [Kubernetes response adapter](../bff/internal/httpcontract/upstream.go), [watch errors](../bff/internal/httpcontract/watch.go): pre-response JSON failures, safe Status, post-commit aborts and correlated read/write failures. Handler integration tests verify a partial stream ends with an incomplete-response error.                                                                                             |
| WS rejection and closure                            | [WS implementation](../bff/internal/proxy/ws_proxy.go), [tracker shutdown](../bff/internal/proxy/ws_tracker.go), [rejection tests](../bff/internal/proxy/error_contract_test.go), [close tests](../bff/internal/proxy/ws_close_test.go) and [relay tests](../bff/internal/proxy/ws_relay_test.go): upstream rejection status, 1000/1008/1011/1001, safe close reasons, bearer-subprotocol suppression and sanitized watch errors.                                         |
| Request correlation                                 | [Middleware and transport](../bff/internal/httpcontract/correlation.go), native tests and WS tests: early errors, panic recovery, outbound/header/body equality, separate upstream audit UUIDs, hostile input replacement, CORS and concurrent isolation. Caller and retained service-account Kubernetes clients use the correlation transport.                                                                                                                           |
| Platform compatibility                              | [Correlation contracts](../contract-tests/__tests__/foundation/testCoreBffErrors.test.ts) and [error response contracts](../contract-tests/__tests__/foundation/testCoreBffErrorResponses.test.ts) run in both OpenShift and xKS suites. Existing native, module/model-serving proxy, successful WS and HTTP proxy tests remain in the BFF suite. Mock impersonation is RBAC evidence; controlled production-code-path SSR tests prove failure handling independently.    |

Coverage includes native namespace/config/status paths, Kubernetes HTTP/WS and infrastructure errors.
Completed access-review diagnostics preserve allowed/denied outcomes. Failed reviews on guarded operations propagate. Status probes preserve the authenticated session with conservative flags.

For `/api/status`, failed admin reviews report `isAdmin: false`; failed allowed-access reviews report `isAllowed: false`. If Auth is inaccessible, missing or malformed, continue to the caller's authoritative SSAR and log a safe configuration-fallback event. Its allowed/denied outcome determines `isAllowed`; a failed SSAR reports `isAllowed: false` without discarding the authenticated session. Authentication/identity failures still fail the request. The absent-CRD and `system:authenticated` shortcuts retain their existing behavior. This avoids adding a per-request service-account Auth read as an admission prerequisite.

## Consumer Compatibility

Versioned native APIs keep the BFF error envelope for both local and upstream Kubernetes failures,
so existing versioned clients can parse failures. Preserve the upstream HTTP status, retry metadata
and sanitized validation-field summary. Error codes come from the fixed catalog by HTTP status;
unmapped statuses use `INTERNAL_SERVER_ERROR` without changing the upstream HTTP status.
Unversioned native APIs retain sanitized `v1/Status` for upstream Kubernetes failures, preserving
the top-level message and avoiding an object in `error` that existing consumers would stringify.
BFF-generated errors keep their existing envelope. Consumers remain unchanged.

The Kubernetes HTTP proxy returns Status for both upstream and local failures, so SDK calls reject consistently. Consumers remain unchanged. Ordinary caller-token proxy failures retain actionable diagnostics and names; 404 text remains recognizable. Secret operations and native failures use the strict policy described above. The [error response suite](../contract-tests/__tests__/foundation/testCoreBffErrorResponses.test.ts) exercises the installed SDK against Core BFF handlers. The [status suite](../contract-tests/__tests__/foundation/testCoreBffStatus.test.ts) covers completed review diagnostics, Auth fallback, unresolved identity and failed review requests. These tests define Core BFF's own contract without depending on another backend implementation.

## OpenAPI Error Response Coverage

The foundation suite covers Kubernetes error statuses across HTTP proxy and WS handshake paths,
including both `/core-bff` aliases; BFF-generated transport failures; and native method rejections.
Each proxy response is validated against its named OpenAPI component and the operation's response
reference. Fixtures include rejection bodies larger than 1 KiB. Assertions also cover Status reasons,
validation cause fields, retry metadata, request/audit identifiers, redaction, and the distinction
between Kubernetes Status and BFF envelopes.

The [proxy fixture](../bff/internal/proxy/contract_fixture_test.go) and [native fixture](../bff/internal/api/contract_fixture_test.go) are build-tagged Go tests in their existing packages. The native fixture runs production auth middleware, typed SSR/SSAR clients and status aggregation against a controlled TLS upstream, including an inaccessible Auth configuration. A central framework helper manages it from Jest setup/teardown, using the
existing test commands unchanged. It reuses production proxy/correlation handlers and existing Go
test helpers for proxy configuration and identity. A table-driven upstream supplies HTTP failures;
a transport stub supplies timeout, connection-refusal, and unexpected-EOF errors. Go's `httptest`
and test cleanup manage the servers. It has no production entry point.

## Verification Commands

Run these commands from the repository root:

```bash
make -C distributions/core-bff/bff test
make -C distributions/core-bff/bff lint
pnpm --dir distributions/core-bff run test:contract
pnpm --dir distributions/core-bff run lint:openapi
pnpm --dir packages/contract-tests run test-unit
```

The contract command runs both OpenShift and xKS suites through the central TypeScript runner.
The Go suite covers classification, sanitization, correlation, streaming and WebSocket behavior.
These tests cover local failure handling. Production token issuance/expiry, frontend composition,
transport limits and AKS/Gateway deployment behavior require separate integration validation.
