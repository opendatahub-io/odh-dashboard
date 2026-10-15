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

	// OpenShift Console WithSecurityHeaders wire values.
	CacheControlNoStore                       = "no-cache, no-store, must-revalidate"
	ReferrerPolicyStrictOriginWhenCrossOrigin = "strict-origin-when-cross-origin"
	XContentTypeOptionsNoSniff                = "nosniff"
	CrossOriginOpenerPolicySameOrigin         = "same-origin"
	XFrameOptionsDeny                         = "DENY"
	XDNSPrefetchControlOff                    = "off"
)
