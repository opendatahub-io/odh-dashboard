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
	HeaderStrictTransportSecurity     = "Strict-Transport-Security"

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
	StrictTransportSecurityValue              = "max-age=31536000; includeSubDomains"
)
