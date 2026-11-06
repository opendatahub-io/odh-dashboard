package constants

const (
	HeaderAuthorization           = "Authorization"
	HeaderContentType             = "Content-Type"
	HeaderAccept                  = "Accept"
	HeaderOrigin                  = "Origin"
	HeaderHost                    = "Host"
	HeaderLocation                = "Location"
	HeaderConnection              = "Connection"
	HeaderCacheControl            = "Cache-Control"
	HeaderReferrerPolicy          = "Referrer-Policy"
	HeaderXContentTypeOptions     = "X-Content-Type-Options"
	HeaderCrossOriginOpenerPolicy = "Cross-Origin-Opener-Policy"
	HeaderXFrameOptions           = "X-Frame-Options"
	HeaderXDNSPrefetchControl     = "X-DNS-Prefetch-Control"
	HeaderContentSecurityPolicy   = "Content-Security-Policy"
	HeaderCSPReportOnly           = "Content-Security-Policy-Report-Only"
	HeaderCookie                  = "Cookie"
	HeaderSetCookie               = "Set-Cookie"
	HeaderProxyAuthorization      = "Proxy-Authorization"
	HeaderSecWebSocketProto       = "Sec-WebSocket-Protocol"
	HeaderImpersonateUser         = "Impersonate-User"
	HeaderImpersonateGroup        = "Impersonate-Group"
	HeaderForwardedToken          = "X-Forwarded-Access-Token" //nolint:gosec // G101: header name, not a credential
	HeaderFeatureFlags            = "x-odh-feature-flags"
	HeaderAccessControlOrigin     = "Access-Control-Allow-Origin"
	HeaderAccessControlMethod     = "Access-Control-Allow-Methods"
	HeaderAccessControlHeader     = "Access-Control-Allow-Headers"

	ContentTypeJSON = "application/json"
	ContentTypeYAML = "text/yaml"
	ContentTypeHTML = "text/html"

	AllowedMethodsReadOnly = "GET, OPTIONS"
	AllowedOriginAll       = "*"

	ConnectionClose = "close"

	// Host static-file Cache-Control policies (Node backend/src/utils/cacheHeaders.ts parity).
	CacheControlNo        = "no-cache"
	CacheControlShort     = "public, max-age=86400"
	CacheControlImmutable = "public, max-age=31536000, immutable"

	// Cache-Control is applied selectively.
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

	// ContentSecurityPolicy is applied to HTML responses only and must stay identical to
	// the shared definition in packages/app-config/src/security-policy.ts, which the Node
	// backend and the rspack dev server both consume. A parity test in the backend suite
	// (backend/src/utils/__tests__/securityHeaders.spec.ts) reads this constant and fails
	// on drift. Both header modes send the same directive string; only the header name
	// changes. See docs/content-security-policy.md for the directive rationale.
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
	// Content-Security-Policy-Report-Only; "enforce", unset, or empty sends the
	// enforcing header. Unknown values fail closed to enforcement. Must match the
	// Node backend.
	CSPModeEnvVar = "CSP_MODE"
)
