# Content Security Policy (CSP)

Both dashboard servers send an **enforcing** `Content-Security-Policy` header on HTML
document responses. There is no report-only mode and no configuration switch: the policy
is always `Content-Security-Policy`, and the rollback path is reverting the change.

| Surface                                                             | Policy value              | Applied by                                                                             |
| ------------------------------------------------------------------- | ------------------------- | -------------------------------------------------------------------------------------- |
| Node backend                                                        | `CONTENT_SECURITY_POLICY` | `backend/src/utils/securityHeaders.ts` (`applySecurityHeaders`)                        |
| Go core-bff (serves the `core-bff`, `rhaii`, and `maas-portal` UIs) | `ContentSecurityPolicy`   | `distributions/core-bff/bff/internal/api/security_headers.go` (`applySecurityHeaders`) |

Both values must stay in sync. They are the same directive list, and the two constants
cross-reference each other.

## Where the header applies

Only responses whose `Content-Type` is `text/html` get the policy — the SPA shell for `/`
and every unknown deep link (`/projects`, `/modelServing`, ...). JSON APIs, static assets,
and Module Federation proxy responses are not documents and carry no policy.

Documents that reach the browser through a reverse proxy are covered too. The middleware
wraps the combined mux, and `httputil.ReverseProxy` copies the upstream `Content-Type`
before writing the status line, so a proxied `index.html` from a module BFF is classified as
a document and gets the policy. The same applies to the portal bundle: `maas-portal` is the
same core-bff binary with `--static-assets-dir=/static/maas-portal`, so `/maas-portal/`
is served by this policy rather than by a separate server.

## Enforced directives

| Directive         | Value                               | Why                                                                   |
| ----------------- | ----------------------------------- | --------------------------------------------------------------------- |
| `default-src`     | `'self'`                            | Baseline for every fetch type not listed below                        |
| `base-uri`        | `'self'`                            | Blocks `<base>` injection that could redirect relative script URLs    |
| `object-src`      | `'self'`                            | No plugin content is loaded                                           |
| `script-src`      | `'self' https://console.redhat.com` | App bundles plus the Segment CDN bundle                               |
| `style-src`       | `'self' 'unsafe-inline'`            | PatternFly and Monaco inject styles at runtime                        |
| `img-src`         | `'self' https: data: blob:`         | Artifact/image previews, `data:` icons, gen-ai chatbot image previews |
| `font-src`        | `'self' data:`                      | PatternFly icon fonts                                                 |
| `media-src`       | `'self' https: data: blob:`         | Gen-ai chatbot audio previews                                         |
| `connect-src`     | `'self' https://console.redhat.com` | SPA API calls, `/wss` WebSocket proxy, Segment event API              |
| `frame-src`       | `'self' https:`                     | KFP artifact `RENDER` iframes (cross-origin object storage)           |
| `frame-ancestors` | `'none'`                            | Matches the shipped `X-Frame-Options: DENY`                           |

No directive allows plain `http:`. A unit test in each codebase asserts that.

## Why these allowances exist

Two directives are wider than the strictest possible value, and both are load-bearing:

- `frame-src 'self' https:` rather than `'none'`. Artifact previews embed a URL returned by
  the KFP API (`getArtifact(..., 'RENDER')`). That URL is a presigned object-storage URL on
  another host (for example `https://<bucket>.s3.<region>.amazonaws.com/...`), so
  `'self'` alone would break every HTML/JSON artifact preview.
- `blob:` in `img-src` and `media-src` for gen-ai attachment previews, which render
  `URL.createObjectURL` blobs.

`console.redhat.com` is deliberately not in `default-src`. It appears only in `script-src`
and `connect-src`, so it cannot widen `frame-src`, `font-src`, or anything else.

## Telemetry origin

`console.redhat.com` is **not an RHOAI product origin**. It is the Segment telemetry endpoint
that `packages/analytics/src/initSegment.ts` hardcodes as `cdnURL` and `apiHost`. That
hardcoding predates this policy, and the CSP mirrors it rather than inventing a second
source of truth.

Analytics initializes only when tracking is enabled (`disableTracking: false` plus a segment
key), which is off by default. The origin is allowlisted unconditionally so that enabling
tracking never breaks under the policy. **If the Segment endpoint ever moves, update all
three constants together:**

- `packages/analytics/src/initSegment.ts`
- `SEGMENT_TELEMETRY_ORIGIN` in `backend/src/utils/securityHeaders.ts`
- `SegmentTelemetryOrigin` in `distributions/core-bff/bff/internal/constants/headers.go`

## Deferred directives

Deliberately not in the first iteration:

- `nonce-...`. `frontend/src/index.html` has no executable inline script (the only inline
  `<script>` is `type="application/json"`), and Rspack emits no `InlineChunk`, so a nonce
  would add moving parts without tightening anything today.
- `worker-src`. `monaco-editor-webpack-plugin` serves workers from the same origin
  (`publicPath` is `/`, `ODH_PUBLIC_PATH` is unset), so `default-src 'self'` covers them.
  Revisit if a deployment ever sets a cross-origin public path.
- `form-action`, `upgrade-insecure-requests`, `report-uri`. `report-uri` needs a collector
  endpoint that does not exist yet.

## Where the policy is not exercised

- **Local dev (`pnpm run dev`)**: `rspack dev` serves `index.html` itself and proxies only
  `/api`, `/_mf`, `/mlflow`, `/wss/k8s` to the backend, so the backend never renders the
  document and no CSP is applied. Dev deliberately does not mirror the policy —
  `eval-source-map` needs `'unsafe-eval'` and HMR needs a ws `connect-src`, so a dev policy
  would give false confidence.
- **Cypress**: `experimentalCspAllowList` defaults to `false`, which makes Cypress strip the
  entire CSP header from the application under test. Suites neither break nor validate.
- **Responses the app never writes**: the policy is a property of this application. HTML
  produced by anything in front of it or beside it — gateway/Envoy error pages, ingress
  `413`/`502`/`503` bodies, `kube-rbac-proxy` `401` responses — carries no CSP and is out of
  reach of this change. Anyone auditing "all HTML responses" needs to look at those
  separately.
- **Direct hits on a module BFF**: the per-module BFFs (`packages/*/bff`) each have their own
  `index.html` SPA fallback. None is gateway-routed; they are reached only through the host
  proxy described above, which is where the header is applied. A future route that exposes a
  module BFF directly would bypass this policy.

## Verification

Automated:

```bash
pnpm --filter odh-dashboard-backend test:jest
make -C distributions/core-bff/bff test
```

Manual (fastify-served HTML, no cluster required for the header itself):

```bash
pnpm run cypress:server:e2e
# then open http://localhost:4000 and check the response header, or:
curl -sI http://localhost:4000/projects | grep -i content-security-policy
```

Flow-level checks that need a real cluster — confirm no CSP violations in the browser
console for:

1. Module Federation remotes loading (`/_mf/...`)
2. Login/logout
3. Pipeline artifact preview iframes (HTML and JSON artifacts, presigned object-storage URLs)
4. Analytics on and off (toggle tracking in Cluster Settings)
5. WebSocket traffic (`/wss/k8s/...`)
6. The `maas-portal` document at `/maas-portal/` when that operand is Managed
