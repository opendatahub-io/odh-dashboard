package constants

const (
	IndexHTMLFileName = "index.html"
	// BFFPathPrefix is the mount point for BFF-scoped routes.
	BFFPathPrefix = "/core-bff"
	// APIPathPrefix is the base path for native APIs and HTTP proxies.
	APIPathPrefix = "/api"
	// APIVersion is the native API version path segment.
	APIVersion = "/v1"
	// VersionedAPIPrefix identifies native endpoints consumed by versioned clients.
	VersionedAPIPrefix = APIPathPrefix + APIVersion + "/"
	// ServiceProxyPrefix identifies service proxies rather than native APIs.
	ServiceProxyPrefix = APIPathPrefix + "/service/"
	// PersesProxyPrefix identifies the proxy consumed by the Perses fetch client.
	PersesProxyPrefix = "/perses/api/"
	// K8sProxyPrefix is the Kubernetes HTTP proxy subtree.
	K8sProxyPrefix = APIPathPrefix + "/k8s/"
	// WssProxyPrefix is the Kubernetes WebSocket proxy subtree.
	WssProxyPrefix = "/wss/k8s/"
	// K8sCoreAPIPrefix and K8sGroupedAPIPrefix are upstream Kubernetes API roots.
	K8sCoreAPIPrefix    = APIPathPrefix + "/"
	K8sGroupedAPIPrefix = "/apis/"
)
