package constants

const (
	IndexHTMLFileName = "index.html"
	// BFFPathPrefix is the mount point for BFF-scoped routes.
	BFFPathPrefix = "/core-bff"
	// APIPathPrefix is the base path for native APIs and HTTP proxies.
	APIPathPrefix = "/api"
	// K8sProxyPrefix is the Kubernetes HTTP proxy subtree.
	K8sProxyPrefix = APIPathPrefix + "/k8s/"
)
