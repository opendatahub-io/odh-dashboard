# Content Security Policy (CSP)

The dashboard ships an enforcing `Content-Security-Policy` on the HTML document it serves.
This document describes the architecture behind that policy: where enforcement lives, how
the directives were chosen, how development and telemetry deviate from production, and
where the control does not reach.

CSP here is defence in depth against injected script, style, and framing in the SPA shell.
It does not replace input handling or server-side authorization.

## Enforcement model

A policy can only protect a document if it arrives with that document. The server that
renders the SPA shell is therefore the enforcement point — not the API layer, and not the
browser bundles:

- the **Node backend** serves the shell for the main dashboard and any distribution that
  runs it;
- the **Go core-bff** serves the shell for the `core-bff`, `rhaii`, and `maas-portal` UIs.

Both apply the policy to `text/html` responses only. JSON APIs, static assets, and Module
Federation proxy responses are not documents and carry no policy.

Because the header is attached when a response is classified as a document, documents that
arrive through the core-bff's reverse proxy are covered too. `maas-portal` is that same
binary serving a different bundle, so it inherits the same policy rather than defining a
second one.

## Modes

| `CSP_MODE` value                                            | Header sent                                       |
| ----------------------------------------------------------- | ------------------------------------------------- |
| `report-only` (case-insensitive, surrounding space trimmed) | `Content-Security-Policy-Report-Only`             |
| `enforce`                                                   | `Content-Security-Policy`                         |
| unset or empty                                              | `Content-Security-Policy-Report-Only` (temporary) |
| any other value                                             | `Content-Security-Policy` (fail closed)           |

> **Temporary default.** While the CSP violation baseline is being captured,
> an unset or empty `CSP_MODE` resolves to `report-only` rather than
> `enforce`, so a deployment that does not set the variable reports violations
> instead of blocking them. Explicit `enforce` and unrecognized values still
> enforce. Restore the unset/empty branch to `enforce` once the baseline exists —
> the compliance requirement is the enforcing header.

Both serving paths read the same operator-facing environment variable (`CSP_MODE`) and
resolve it identically. Both modes send the **identical directive string**; only the header name
changes, so switching a deployment never changes what is allowed — only whether the browser
blocks it.

An unknown value resolves to enforcement, so a typo cannot silently downgrade a deployment
(the unset default above is the one deliberate exception, and it is temporary).
Report-Only exists as a per-environment escape hatch for a deployment blocked by a broken
federated module. It is not a substitute for enforcement: product and compliance
requirements call for the enforcing header.

Report-Only also cannot enforce `frame-ancestors` — the specification ignores that directive
in a report-only policy. Framing protection in those deployments still comes from the
`X-Frame-Options: DENY` header sent on every response.

## Policy design

### Enforced directives

| Directive         | Value                               | Why                                                                                       |
| ----------------- | ----------------------------------- | ----------------------------------------------------------------------------------------- |
| `default-src`     | `'self'`                            | Baseline for every fetch type not listed below                                            |
| `base-uri`        | `'self'`                            | Blocks `<base>` injection that could redirect relative script URLs                        |
| `object-src`      | `'none'`                            | No plugin content is loaded; blocks `<object>`/`<embed>` injection                        |
| `script-src`      | `'self' https://console.redhat.com` | App bundles plus the Segment CDN bundle                                                   |
| `style-src`       | `'self' 'unsafe-inline'`            | CSS-in-JS in module frontends and Monaco inject styles at runtime                         |
| `img-src`         | `'self' https: data: blob:`         | Icons, gen-ai `blob:` previews, and remote images embedded in rendered markdown artifacts |
| `font-src`        | `'self' data:`                      | PatternFly icon fonts                                                                     |
| `media-src`       | `'self' https: data: blob:`         | gen-ai `blob:` audio/video previews and remote media embedded in markdown artifacts       |
| `connect-src`     | `'self' https://console.redhat.com` | SPA API calls, `/wss` WebSocket proxy, Segment event API                                  |
| `frame-src`       | `'self' https:`                     | KFP artifact `RENDER` iframes (cross-origin object storage)                               |
| `form-action`     | `'self'`                            | Restricts form submission targets; does **not** inherit from `default-src`                |
| `worker-src`      | `'self' blob:`                      | Monaco and similar editors start workers from the same origin or `blob:` URLs             |
| `frame-ancestors` | `'none'`                            | Matches the shipped `X-Frame-Options: DENY`                                               |

No directive allows plain `http:`. The policy has no `report-uri` or `report-to` (see
[Violation capture](#violation-capture)).

### Allowances wider than the strictest value

Four allowances are broader than the strict minimum, and each is load-bearing:

- `frame-src 'self' https:` rather than `'none'`. Artifact previews embed a presigned
  object-storage URL returned by the KFP API (for example
  `https://<bucket>.s3.<region>.amazonaws.com/...`), so `'self'` alone would break every
  HTML and JSON artifact preview.
- `img-src`/`media-src` `blob:` for gen-ai attachment previews, which render
  `URL.createObjectURL` blobs, including audio previews in the chat input.
- `img-src`/`media-src` `https:` because markdown artifacts are rendered with raw HTML
  support, so an artifact can embed an image or video from any host. Removing that ability
  would be a product change, not a CSP change.
- `script-src https://console.redhat.com` because the analytics SDK is loaded as a remote
  script rather than bundled (see [Telemetry origin](#telemetry-origin)).

`console.redhat.com` is deliberately absent from `default-src`. It appears only in
`script-src` and `connect-src`, so it cannot widen `frame-src`, `font-src`, or anything else.

### Telemetry origin

`console.redhat.com` is **not an RHOAI product origin**. It is the analytics vendor's
endpoint, hardcoded by the browser analytics client for both its script bundle and its event
API. That hardcoding predates the policy, and the CSP mirrors it rather than inventing a
second source of truth. Because the SDK bundle is fetched from that origin, `script-src` has
to allow it; bundling the SDK would let `script-src` drop back to `'self'` and is worth
revisiting.

Analytics initializes only when tracking is enabled (a segment key is configured and
tracking is not disabled), which is off by default. The origin is allowlisted
unconditionally so enabling tracking never breaks the page. The endpoint is declared in
three places — the browser analytics client, the shared policy in `app-config`, and the Go
policy — and they must move together if it ever changes.

### Source of truth

The directive list is defined once, in `@odh-dashboard/app-config/security-policy`. The Node
backend re-exports it, the rspack dev server imports it directly, and this document describes
it. The Go core-bff cannot share TypeScript at runtime, so it carries an equivalent literal,
and an automated comparison of the full string and directive order fails the build on drift.

## Development

The dev server renders the shell itself, so the backend's header never applies to the
document you are looking at. It imports the same definition the backend serves, from
`@odh-dashboard/app-config/security-policy`, and applies the declared dev-only delta below.
There is no second copy of the policy, no fetch, and no dependency on a built document.

The value is served as `Content-Security-Policy-Report-Only`, on document responses only,
matching production where assets carry no policy. Development therefore reports rather than
blocks: violations are visible, but hot reload, eval-based source maps, and local API sockets
cannot be broken by a policy gap.

Because the shared policy is the production policy, it lacks tokens that only development
needs. A small, explicit set is added so the report reflects real regressions instead of
expected dev traffic:

| Directive     | Extra tokens                     | Why                                            |
| ------------- | -------------------------------- | ---------------------------------------------- |
| `script-src`  | `'unsafe-eval'`                  | `eval-source-map`                              |
| `connect-src` | `ws:`, `http://localhost:<port>` | HMR socket and the local `/api` `/wss` proxies |
| `frame-src`   | `http://localhost:<port>`        | Local object-storage previews                  |

Development always validates the **local branch's** policy, including in ext-cluster mode:
the definition is read from source rather than from the cluster. A deployed environment is
the only place where that environment's own header is exercised.

## Violation capture

The platform has no server-side collector: the gateway runs authentication on every request,
so an unauthenticated `report-uri`/`report-to` endpoint would answer `401` and silently drop
reports. Violations are therefore captured in the browser by a reporter installed once near
the root of the app.

- Every violation is logged to the console.
- Each unique violation — effective directive plus blocked host — is forwarded through the
  same tracking pipeline as the rest of the dashboard's telemetry as a `CSP Violation`
  event. It therefore carries the same cluster and version context, is logged rather than
  sent when the app runs in development, and is skipped until the analytics SDK exists.
- Telemetry is throttled to once per unique violation per browser per 24 hours. Throttle
  state lives in browser storage; unavailable storage degrades to no throttling, never to a
  lost console warning.
- The payload carries the effective directive, blocked host, disposition, page path, source
  file, line, column, sample, referrer, and the full policy string. Query strings,
  fragments, and credentials are stripped from every URL.
- In development the reporter also raises a toast through the shared notification context.
  Production shows no UI.

Two limitations are accepted. Capture starts after the first render, so resources fetched
while the document is still loading are covered by the E2E guard instead. And the reporter
does not attempt to attribute a violation to the module that caused it.

## How this is verified

Three layers, each catching a different class of problem:

1. **Policy assertions** in each implementation check the directive set, the absence of
   plain `http:`, and Node↔Go parity (full string and directive order). A directive edit
   that lands in one implementation only fails the build.
2. **Browser-level end-to-end tests** run against the real server with the header intact.
   Violations are recorded from before any page script runs and fail the spec unless they
   are on an explicit allowlist. That allowlist is empty by default; an entry is an
   accepted, documented, time-boxed exception. Cypress relaxes `script-src`/`default-src`
   for its own instrumentation, so those two directives are not a byte-for-byte production
   check there.
3. **Deployed environments** surface violations through console warnings and the
   `CSP Violation` telemetry event.

Flow-level checks that need a real cluster: Module Federation remotes, login/logout,
pipeline artifact previews of every shape, analytics on and off, WebSocket traffic, and
`maas-portal` when that operand is Managed.

## Where the policy is not exercised

- **Responses the app never writes.** HTML produced by anything in front of or beside the
  application — gateway and Envoy error pages, ingress `413`/`502`/`503` bodies,
  `kube-rbac-proxy` `401` responses — carries no CSP. Anyone auditing "all HTML responses"
  needs to look at those separately.
- **Direct hits on a module BFF.** Per-module BFFs have their own SPA fallback. None is
  gateway-routed; they are reached through the host proxy described above, which is where
  the header is applied. A future route that exposes a module BFF directly would bypass
  this policy.

## Product consequence: markdown artifacts

Enforcing `connect-src 'self'` blocks the cross-origin fetch of the KFP download URL that
markdown artifacts use to render client-side. The artifact renderers already fall back to
the render URL in an iframe, so the artifact still displays — as a sandboxed iframe rather
than rendered markdown. This is intended, and must be verified for HTML and JSON artifacts,
and for markdown artifacts of every shape, before release.

## Deferred directives

Deliberately not used yet:

- `nonce-...`. The SPA shell contains no executable inline script — its only inline script
  is inert JSON — and the bundler emits no inline chunks, so a nonce would add moving parts
  without tightening anything today.
- `report-uri` / `report-to`. There is no collector and no component that can host one.
