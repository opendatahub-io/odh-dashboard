# Content Security Policy (CSP)

Design record for the CSP the dashboard serves on the HTML documents it renders itself. The
policy is defined once in `packages/app-config/src/security-policy.ts`
(`@odh-dashboard/app-config/security-policy`); the Node backend and the rspack dev server
import it, and the Go core-bff keeps a literal mirror whose string and directive order are
asserted by `backend/src/utils/__tests__/securityHeaders.spec.ts`. Every document is
rendered with a per-response nonce (see [Nonce](#nonce)).

It is attached only to documents a server renders itself: the SPA shell for `/` and every
`text/html` deep link, on the Node backend and on the Go core-bff (which also serves the
`core-bff`, `rhaii`, and `maas-portal` UIs). Proxied upstream HTML (`/mlflow`, module
documents) and the dev-only Swagger UI keep their own headers; JSON APIs and static assets are
unchanged.

- RFE: [RHAIRFE-3516](https://redhat.atlassian.net/browse/RHAIRFE-3516)
- Strategy: [RHAISTRAT-3029](https://redhat.atlassian.net/browse/RHAISTRAT-3029)
- Implementation: [RHOAIENG-100581](https://redhat.atlassian.net/browse/RHOAIENG-100581)

## `CSP_MODE`

The only operator control. Both modes send the same directive string; only the header name
changes.

| `CSP_MODE` value                          | Header sent                                               |
| ----------------------------------------- | --------------------------------------------------------- |
| `report-only` (case-insensitive, trimmed) | `Content-Security-Policy-Report-Only`                     |
| `enforce`, or any other non-empty value   | `Content-Security-Policy` (unknown values fail closed)    |
| unset or empty                            | `Content-Security-Policy-Report-Only` (temporary default) |

An unrecognized value enforces, so a typo cannot silently downgrade a deployment. Unset or
empty currently resolves to Report-Only while a violation baseline is collected; flipping that
branch to enforcement in both servers is the follow-up, and both servers log a startup warning
when the variable is absent. Report-Only cannot enforce `frame-ancestors` — the specification
ignores that directive there — so framing protection in those deployments still comes from
`X-Frame-Options: DENY` on every response.

## Final directive set

| Directive         | Value                                                      | Why                                                                                       |
| ----------------- | ---------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `default-src`     | `'self'`                                                   | Baseline for every fetch type not listed below                                            |
| `base-uri`        | `'self'`                                                   | Blocks `<base>` injection that could redirect relative script URLs                        |
| `object-src`      | `'none'`                                                   | No plugin content is loaded; blocks `<object>`/`<embed>` injection                        |
| `script-src`      | `'self' https://console.redhat.com 'nonce-<per response>'` | App bundles, the Segment CDN bundle, and the shell's one inline script                    |
| `style-src`       | `'self' 'unsafe-inline'`                                   | CSS-in-JS in module frontends and Monaco inject styles at runtime                         |
| `img-src`         | `'self' https: data: blob:`                                | Icons, gen-ai `blob:` previews, and remote images embedded in rendered markdown artifacts |
| `font-src`        | `'self' data:`                                             | PatternFly icon fonts                                                                     |
| `media-src`       | `'self' https: data: blob:`                                | gen-ai `blob:` audio/video previews and remote media embedded in markdown artifacts       |
| `connect-src`     | `'self' https://console.redhat.com`                        | SPA API calls, `/wss` WebSocket proxy, Segment event API                                  |
| `frame-src`       | `'self' https:`                                            | KFP artifact `RENDER` iframes (cross-origin object storage)                               |
| `form-action`     | `'self'`                                                   | Restricts form submission targets; does **not** inherit from `default-src`                |
| `worker-src`      | `'self' blob:`                                             | Monaco and similar editors start workers from the same origin or `blob:` URLs             |
| `frame-ancestors` | `'none'`                                                   | Matches the shipped `X-Frame-Options: DENY`                                               |

## Nonce

The SPA shell carries one inline `<script>` — the PatternFly theme bootstrap that must run
before the bundle so tokens are correct on first paint. It is admitted by a per-request nonce
rather than by `'unsafe-inline'`, a hash, or an external file:

1. The server mints a nonce (`crypto.randomBytes(16).toString('base64url')` in Node, the same
   via `crypto/rand` in core-bff) for one document response.
2. The nonce is appended to `script-src` in the CSP header for that response only.
3. The same nonce replaces `CSP_NONCE_PLACEHOLDER` (`__CSP_NONCE__`) in the shell's
   `nonce` attribute before the body is written.

Header and body must come from the same response, so each serving path renders the shell
itself: the Node backend renders `index.html` to a string with `fastify.view` and substitutes
the nonce before `reply.send`; the rspack dev server serves the compiled shell out of the
compiler's output filesystem; core-bff reads `index.html` instead of handing it to
`http.ServeFile`. If a server cannot supply the shell (the dev server before its first
successful compile) it sends no policy at all — a document without a policy is safe, a
document whose nonce does not match its header is not.

The nonce is never reused: `theme-bootstrap`-style inline scripts are the only permitted inline
script, and adding another one means adding a `nonce` attribute to it, not widening
`script-src`. `script-src` is the only directive the nonce widens.

No directive allows plain `http:`, and there is no `report-uri` or `report-to` (see
[Violation reporting](#violation-reporting)).

Two allowances are wider than the strict minimum: `frame-src https:` because artifact previews
embed a presigned object-storage URL from the KFP API (enforcing `connect-src` blocks the
cross-origin download, and markdown artifacts fall back to the `RENDER` iframe), and
`img-src`/`media-src` `https:`/`blob:` because markdown artifacts can embed remote media and
gen-ai previews use object URLs.

`https://console.redhat.com` is **not an RHOAI product origin**: it is the analytics vendor's
endpoint, hardcoded by the browser analytics client for both its script bundle and its event
API. The SDK is fetched from that origin rather than bundled, so `script-src` must allow it;
`connect-src` allows it for the event API. It appears in no other directive, so it cannot widen
`frame-src`, `font-src`, or anything else. It is allowlisted unconditionally so enabling
tracking never breaks the page, even though tracking is off by default.

### Development delta

The dev server always serves the policy as Report-Only plus exactly this delta, and refuses to
start if the shared policy drops a directive the delta widens:

| Directive     | Extra tokens                     | Why                                            |
| ------------- | -------------------------------- | ---------------------------------------------- |
| `script-src`  | `'unsafe-eval'`                  | `eval-source-map`                              |
| `connect-src` | `ws:`, `http://localhost:<port>` | HMR socket and the local `/api` `/wss` proxies |
| `frame-src`   | `http://localhost:<port>`        | Local object-storage previews                  |

## Violation reporting

There is no server-side collector: the gateway authenticates every request, so an
unauthenticated `report-uri`/`report-to` endpoint would answer `401`. Violations are captured
in the browser by the reporter in `frontend/src/concepts/csp`: every violation is logged with
`console.warn`; each unique violation (disposition, effective directive, blocked host) is
forwarded through the host tracking adapter as a `CSP Violation` event, so it carries the same
cluster and version metadata as the rest of the dashboard telemetry. Capture starts at module
load of the dashboard entry (`bufferCspViolationsUntilReporter`) and is replayed when the
reporter installs on the first render, so violations raised while the document loads, and while
SDK initialization withholds the tree, are recorded. Violations raised before the SDK is
initialized are held and delivered once `isSegmentReady()` reports it is available. Outside
development each one is forwarded at most once per browser per 24 hours, and its throttle
window opens only when it is actually delivered. URLs are stripped of credentials, query
strings and fragments; an unparseable URL is reported as `invalid`. Development sends no telemetry; violations are still logged with
`console.warn`.
