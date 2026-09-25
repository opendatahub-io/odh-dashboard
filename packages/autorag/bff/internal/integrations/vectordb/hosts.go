package vectordb

import "strings"

// isLocalNetworkHost reports whether host is trusted enough to allow a plaintext
// (non-TLS) connection: the local loopback, or an in-cluster Kubernetes DNS name
// (*.cluster.local). Anything else must use TLS.
func isLocalNetworkHost(host string) bool {
	h := strings.ToLower(host)
	return h == "localhost" || h == "127.0.0.1" || h == "::1" || strings.HasSuffix(h, ".cluster.local")
}
