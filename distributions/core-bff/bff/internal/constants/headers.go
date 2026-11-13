package constants

const (
	HeaderAuthorization               = "Authorization"
	HeaderContentType                 = "Content-Type"
	HeaderContentLength               = "Content-Length"
	HeaderContentEncoding             = "Content-Encoding"
	HeaderAccept                      = "Accept"
	HeaderAcceptEncoding              = "Accept-Encoding"
	HeaderOrigin                      = "Origin"
	HeaderHost                        = "Host"
	HeaderLocation                    = "Location"
	HeaderConnection                  = "Connection"
	HeaderUpgrade                     = "Upgrade"
	HeaderRetryAfter                  = "Retry-After"
	HeaderTrailer                     = "Trailer"
	HeaderCacheControl                = "Cache-Control"
	HeaderReferrerPolicy              = "Referrer-Policy"
	HeaderXContentTypeOptions         = "X-Content-Type-Options"
	HeaderCrossOriginOpenerPolicy     = "Cross-Origin-Opener-Policy"
	HeaderXFrameOptions               = "X-Frame-Options"
	HeaderXDNSPrefetchControl         = "X-DNS-Prefetch-Control"
	HeaderContentSecurityPolicy       = "Content-Security-Policy"
	HeaderCSPReportOnly               = "Content-Security-Policy-Report-Only"
	HeaderCookie                      = "Cookie"
	HeaderSetCookie                   = "Set-Cookie"
	HeaderProxyAuthorization          = "Proxy-Authorization"
	HeaderSecWebSocketProto           = "Sec-WebSocket-Protocol"
	HeaderSecWebSocketVersion         = "Sec-WebSocket-Version"
	HeaderImpersonateUser             = "Impersonate-User"
	HeaderImpersonateGroup            = "Impersonate-Group"
	HeaderForwardedToken              = "X-Forwarded-Access-Token" //nolint:gosec // G101: header name, not a credential
	HeaderForwarded                   = "Forwarded"
	HeaderXForwardedFor               = "X-Forwarded-For"
	HeaderXForwardedHost              = "X-Forwarded-Host"
	HeaderXForwardedPort              = "X-Forwarded-Port"
	HeaderXForwardedProto             = "X-Forwarded-Proto"
	HeaderXForwardedScheme            = "X-Forwarded-Scheme"
	HeaderXForwardedEmail             = "X-Forwarded-Email"
	HeaderXForwardedUser              = "X-Forwarded-User"
	HeaderXForwardedPreferredUsername = "X-Forwarded-Preferred-Username"
	HeaderXForwardedGroups            = "X-Forwarded-Groups"
	HeaderXRealIP                     = "X-Real-IP"
	HeaderFeatureFlags                = "x-odh-feature-flags"
	HeaderAccessControlOrigin         = "Access-Control-Allow-Origin"
	HeaderAccessControlMethod         = "Access-Control-Allow-Methods"
	HeaderAccessControlHeader         = "Access-Control-Allow-Headers"

	ContentTypeJSON = "application/json"
	ContentTypeYAML = "text/yaml"
	ContentTypeHTML = "text/html"

	ContentEncodingGzip = "gzip"

	AllowedMethodsReadOnly = "GET, OPTIONS"
	AllowedOriginAll       = "*"

	ConnectionClose  = "close"
	WebSocketVersion = "13"

	// Host static-file Cache-Control policies (Node backend/src/utils/cacheHeaders.ts parity).
	CacheControlNo        = "no-cache"
	CacheControlShort     = "public, max-age=86400"
	CacheControlImmutable = "public, max-age=31536000, immutable"

	// Cache-Control is applied selectively. Console also sends Pragma: no-cache
	// and no-store on every response.
	CacheControlNoStore                       = "no-cache, no-store, private, max-age=0, must-revalidate"
	ReferrerPolicyStrictOriginWhenCrossOrigin = "strict-origin-when-cross-origin"
	XContentTypeOptionsNoSniff                = "nosniff"
	CrossOriginOpenerPolicySameOrigin         = "same-origin"
	XFrameOptionsDeny                         = "DENY"
	XDNSPrefetchControlOff                    = "off"

	// SegmentTelemetryOrigin is the origin the dashboard's Segment client loads its
	// bundle from and sends events to. packages/analytics/src/initSegment.ts hardcodes
	// the same values — update both together if the endpoint ever moves.
	// Analytics only initializes when tracking is enabled, but the origin is
	// allowlisted unconditionally so enabling tracking never breaks under the policy.
	SegmentTelemetryOrigin = "https://console.redhat.com"

	// ContentSecurityPolicy is the policy for this application's own documents: index.html
	// as served for `/`, for a direct index.html request, and as the deep-link fallback.
	// Proxied upstream documents and dev-only tooling (the Swagger UI page) keep their own
	// headers. The value must stay identical to the shared definition in
	// packages/app-config/src/security-policy.ts, which the Node backend and the rspack dev
	// server both consume; a parity test in the backend suite
	// (backend/src/utils/__tests__/securityHeaders.spec.ts) reads this constant and fails on
	// drift. Both header modes send the same directive string; only the header name changes.
	// See docs/content-security-policy.md for the directive rationale.
	ContentSecurityPolicy = "default-src 'self'; " +
		"base-uri 'self'; " +
		"object-src 'none'; " +
		"script-src 'self' " + SegmentTelemetryOrigin + "; " +
		"style-src 'self' 'unsafe-inline'; " +
		"img-src 'self' https: data: blob:; " +
		"font-src 'self' data:; " +
		"media-src 'self' https: data: blob:; " +
		"connect-src 'self' " + SegmentTelemetryOrigin + "; " +
		"frame-src 'self' https:; " +
		"form-action 'self'; " +
		"worker-src 'self' blob:; " +
		"frame-ancestors 'none'"

	// CSPModeEnvVar selects the header mode. "report-only" sends
	// Content-Security-Policy-Report-Only; "enforce" and unknown non-empty values send
	// the enforcing header, so a typo fails closed. Must match the Node backend.
	//
	// TEMPORARY: unset or empty also sends Report-Only, so a deployment that does not set
	// the variable reports violations instead of blocking them. Switch it back to the
	// enforcing header once deployments running Report-Only report no unexpected violations.
	CSPModeEnvVar = "CSP_MODE"
)
