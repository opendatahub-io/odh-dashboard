package constants

const (
	HeaderAuthorization       = "Authorization"
	HeaderContentType         = "Content-Type"
	HeaderAccept              = "Accept"
	HeaderOrigin              = "Origin"
	HeaderHost                = "Host"
	HeaderLocation            = "Location"
	HeaderConnection          = "Connection"
	HeaderCacheControl        = "Cache-Control"
	HeaderCookie              = "Cookie"
	HeaderSetCookie           = "Set-Cookie"
	HeaderProxyAuthorization  = "Proxy-Authorization"
	HeaderSecWebSocketProto   = "Sec-WebSocket-Protocol"
	HeaderImpersonateUser     = "Impersonate-User"
	HeaderImpersonateGroup    = "Impersonate-Group"
	HeaderForwardedToken      = "X-Forwarded-Access-Token" //nolint:gosec // G101: header name, not a credential
	HeaderFeatureFlags        = "x-odh-feature-flags"
	HeaderAccessControlOrigin = "Access-Control-Allow-Origin"
	HeaderAccessControlMethod = "Access-Control-Allow-Methods"
	HeaderAccessControlHeader = "Access-Control-Allow-Headers"

	ContentTypeJSON = "application/json"
	ContentTypeYAML = "text/yaml"
	ContentTypeHTML = "text/html"

	AllowedMethodsReadOnly = "GET, OPTIONS"
	AllowedOriginAll       = "*"

	ConnectionClose = "close"
	CacheControlNo  = "no-cache"
)
