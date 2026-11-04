# Core BFF Error And Correlation Contract

Defines the shared Core BFF error and request-correlation contract for native APIs, HTTP proxy
failures and WebSocket connections. Route availability and credential policy are configured separately.

## Response Sources

BFF failures use `{ "error": { "code": "FORBIDDEN", "message": "insufficient permissions for this operation", "requestId": "<UUIDv4>" } }`.
Messages are selected from a safe catalog, never raw errors or submitted values.

| BFF cause                                           | HTTP      | Code                                  |
| --------------------------------------------------- | --------- | ------------------------------------- |
| Missing/malformed or rejected credentials           | 401       | UNAUTHORIZED                          |
| Confirmed policy/access denial                      | 403       | FORBIDDEN                             |
| Missing route/resource                              | 404       | NOT_FOUND                             |
| Unsupported method                                  | 405       | METHOD_NOT_ALLOWED                    |
| Local conflict                                      | 409       | CONFLICT                              |
| Malformed request / semantic validation             | 400 / 422 | BAD_REQUEST / VALIDATION_FAILED       |
| Dependency timeout / known unavailable              | 504 / 503 | GATEWAY_TIMEOUT / SERVICE_UNAVAILABLE |
| Other upstream transport/protocol error             | 502       | BAD_GATEWAY                           |
| Unexpected local failure / failed review evaluation | 500       | INTERNAL_SERVER_ERROR                 |

Existing connection-test codes `INVALID_REQUEST`, `UNSUPPORTED_TYPE` and `PROBE_BUSY` remain stable,
with fixed safe messages.

Missing/malformed credentials are detected locally. Trusted credential causes are distinguished in
logs as `CREDENTIALS_MISSING`, `CREDENTIALS_INVALID` or `CREDENTIALS_EXPIRED`; all use 401 UNAUTHORIZED
on the wire. A future authentication strategy can supply the trusted invalid/expired cause.
An upstream 401 does not prove expiry. A denied review differs from a failed review evaluation;
neither produces an implicit grant or a successful empty namespace list.

Kubernetes failures preserve their upstream HTTP status and a Kubernetes `v1/Status` representation,
including reason and applicable details. They are never wrapped in the BFF envelope. This applies
to native typed-client failures, HTTP proxy failures and rejected upstream WS handshakes, including
401/403, 409, 410, 422, 429 and retry metadata. Non-Kubernetes service responses retain their service
contract. Successful resource responses and non-error watch events retain their original bytes.
JSON HTTP watches buffer one newline-delimited event at a time; HTTP and WS watch `ERROR` objects
retain their Status semantics with the same sanitization as ordinary failure responses.
HTTP watch detection uses Kubernetes' query conversion, including `watch=1`, `watch=TRUE`, empty
values and bare `watch`; absent parameters, `watch=0` and case-insensitive `watch=false` disable it.
The proxy removes the caller's `Accept-Encoding` so its transport can negotiate and decompress
responses. A successful JSON watch that still has a non-empty `Content-Encoding` fails closed before
commitment with 502 `BAD_GATEWAY`, preventing an encoded stream from bypassing ERROR-event sanitization.

The native `/api/v1/prometheus/*` query family retains its existing `{code, response}` format and
Prometheus-specific status/body semantics. BFF-generated unexpected query failures use a fixed safe
message inside that format. Upstream Prometheus error bodies retain their service contract and are
outside the Kubernetes sanitization policy.

## Sanitization

Kubernetes error messages are replaced by safe reason-based text. Omit metadata, UID and object name;
retain bounded schema-like group/kind, standard reason, retry delay and validation cause types/field
paths. Preserve array positions, redact bracketed map keys in field paths, and replace cause messages.
Unknown reason/type strings use safe fallbacks. Invalid/non-JSON Kubernetes error bodies become
sanitized Status with the same HTTP status; error bodies are read with a 1 MiB bound. This bounds
error inspection only, not successful responses, watch messages or transport policy.

BFF-generated errors, sanitized Kubernetes failures, and WebSocket close reasons use fixed safe text
instead of raw errors, submitted Secret values, credentials, cookies or bearer subprotocols.
Non-Kubernetes service response bodies retain their own contracts and are not sanitized by the
Kubernetes response adapter.

Request/error/audit logging in this contract uses safe classifications and correlation instead of
arbitrary upstream/transport text. Request debug logs omit query/userinfo and redact credential
headers, including configured token headers. Authenticated audit identity is permitted; unrelated
identities from upstream error messages are not.

## Correlation

Generate one fresh canonical UUIDv4 per inbound request. Ignore every incoming `X-Request-ID`,
including duplicate, malformed and oversized values. Return `X-Request-ID` on responses, including
early errors and WS 101/rejection, and in BFF error `error.requestId`. Forward it to upstreams.
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

Before response commitment, local proxy failures use the BFF envelope. After headers/data have
started, terminate the stream and log its safe correlated failure; never append JSON or send a second
status. Client cancellation aborts work without synthesizing a server error. Preserve reverse-proxy
abort panics through recovery middleware so partial responses cannot appear successfully complete.

Before WS upgrade, preserve upstream rejection status and safe Status body; local rejections use the
BFF contract. After upgrade, send valid upstream close codes with fixed safe reasons. Use 1000 for
normal closure, 1008 for policy rejection, 1011 for upstream/internal failure and 1001 for shutdown.
Do not send reserved/invalid codes. Reasons use fixed UTF-8 catalog text below the 123-byte protocol
limit; upstream and peer free text is discarded. Shutdown notification is implemented by the existing
connection tracker; process draining/timing remains with the lifecycle task. Heartbeat/size/lifetime
limits remain with proxy hardening.

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

| Area                                                | Implementation and automated evidence                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shared classification, Status details and redaction | [httpcontract](../bff/internal/httpcontract/errors.go) and [contract tests](../bff/internal/httpcontract/contract_test.go): wrapped causes, stable codes, SDK decoding, validation and resource-version/field-manager causes, retry delay, canary redaction and bounded error bodies.                                                                                                                                                                                  |
| Native handlers, authentication and discovery       | [Native errors](../bff/internal/api/errors.go), [namespace handling](../bff/internal/api/namespaces_handler.go), [auth middleware](../bff/internal/api/middleware_auth.go), [status aggregation](../bff/internal/repositories/status.go): failed checks propagate. [Production-path tests](../bff/internal/api/error_contract_test.go) exercise real SSR clients against a controlled TLS API.                                                                         |
| HTTP proxies and streaming                          | [Shared factory](../bff/internal/proxy/factory.go), [Kubernetes response adapter](../bff/internal/httpcontract/upstream.go), [watch errors](../bff/internal/httpcontract/watch.go): pre-response JSON failures, safe Status, post-commit aborts and correlated read/write failures. Handler integration tests verify a partial stream ends with an incomplete-response error.                                                                                          |
| WS rejection and closure                            | [WS implementation](../bff/internal/proxy/ws_proxy.go), [tracker shutdown](../bff/internal/proxy/ws_tracker.go), [rejection tests](../bff/internal/proxy/error_contract_test.go), [close tests](../bff/internal/proxy/ws_close_test.go) and [relay tests](../bff/internal/proxy/ws_relay_test.go): upstream rejection status, 1000/1008/1011/1001, safe close reasons, bearer-subprotocol suppression and sanitized watch errors.                                      |
| Request correlation                                 | [Middleware and transport](../bff/internal/httpcontract/correlation.go), native tests and WS tests: early errors, panic recovery, outbound/header/body equality, separate upstream audit UUIDs, hostile input replacement, CORS and concurrent isolation. Caller and retained service-account Kubernetes clients use the correlation transport.                                                                                                                        |
| Platform compatibility                              | [Correlation contracts](../contract-tests/__tests__/foundation/testCoreBffErrors.test.ts) and [error response contracts](../contract-tests/__tests__/foundation/testCoreBffErrorResponses.test.ts) run in both OpenShift and xKS suites. Existing native, module/model-serving proxy, successful WS and HTTP proxy tests remain in the BFF suite. Mock impersonation is RBAC evidence; controlled production-code-path SSR tests prove failure handling independently. |

Coverage includes native namespace/config/status paths, Kubernetes HTTP/WS and infrastructure errors.
Access-review evaluation failures and access-configuration read failures return errors instead of
successful status results; confirmed denials remain denials.

For `/api/status`, an admin access-review failure or a non-NotFound Auth configuration read failure
fails bootstrap with the corresponding error. These cases previously degraded to non-admin status
or another access check. This intentionally distinguishes evaluation/dependency failures from a
completed denial; missing-resource fallbacks and confirmed denials retain their existing behavior.

## Consumer Compatibility

Native Kubernetes failures now use sanitized `v1/Status` instead of the BFF error envelope.
Clients that inspect failure bodies must distinguish `Status` from `{error: ...}` and use its
`reason`, `message` and applicable details. BFF-generated errors retain their stable codes and add
`error.requestId`; successful response shapes are unchanged.

Core BFF's [bootstrap fetch hook](../frontend/src/app/hooks/useFetchJson.ts) handles non-success HTTP
statuses independently of the error body. Its [user/namespace API helpers](../frontend/src/app/api/k8s.ts)
use the shared `mod-arch-core` error handler, which recognizes BFF envelopes. Their success-shape
guard also rejects Kubernetes Status, but reports a generic `Invalid response format` error instead
of the sanitized Kubernetes message. Consumers needing detailed error presentation must recognize
the Kubernetes shape. No Core BFF consumer branch on the old native `error.code` was found.

## OpenAPI Error Response Coverage

The foundation suite covers Kubernetes error statuses across HTTP proxy and WS handshake paths,
including both `/core-bff` aliases; BFF-generated transport failures; and native method rejections.
Each proxy response is validated against its named OpenAPI component and the operation's response
reference. Fixtures include rejection bodies larger than 1 KiB. Assertions also cover Status reasons,
validation cause fields, retry metadata, request/audit identifiers, redaction, and the distinction
between Kubernetes Status and BFF envelopes.

The [fixture server](../bff/internal/proxy/contract_fixture_test.go) is a build-tagged Go test in the
existing proxy package. A central framework helper manages it from Jest setup/teardown, using the
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
