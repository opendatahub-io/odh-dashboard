package repositories

import "testing"

// TestIsInternalHost verifies that SSRF validation is only skipped for localhost/loopback
// and for in-cluster services in the caller's authorized namespace. Cross-namespace and
// external hosts must NOT be treated as internal (CWE-918).
func TestIsInternalHost(t *testing.T) {
	tests := []struct {
		name             string
		baseURL          string
		allowedNamespace string
		want             bool
	}{
		{"same-namespace cluster service is trusted", "https://my-model.my-ns.svc.cluster.local:8443/v1", "my-ns", true},
		{"same-namespace cluster service on arbitrary port", "http://model.my-ns.svc.cluster.local:19530", "my-ns", true},
		{"cross-namespace cluster service is NOT trusted", "https://secret.kube-system.svc.cluster.local/v1", "my-ns", false},
		{"cluster service with empty authorized namespace is NOT trusted", "https://svc.my-ns.svc.cluster.local", "", false},
		{"localhost is trusted", "http://localhost:8080", "my-ns", true},
		{"loopback IP is trusted", "http://127.0.0.1:9000", "my-ns", true},
		{"external host is not internal", "https://api.openai.com/v1", "my-ns", false},
		{"lookalike cluster suffix is not internal", "https://evil.cluster.local", "my-ns", false},
		{"too-few labels is not internal", "https://svc.cluster.local", "my-ns", false},
		{"unparseable url is not internal", "://bad-url", "my-ns", false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := isInternalHost(tt.baseURL, tt.allowedNamespace); got != tt.want {
				t.Errorf("isInternalHost(%q, %q) = %v, want %v", tt.baseURL, tt.allowedNamespace, got, tt.want)
			}
		})
	}
}
