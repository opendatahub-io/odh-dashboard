package repositories

import "testing"

func TestIsInternalHost(t *testing.T) {
	tests := []struct {
		name      string
		baseURL   string
		namespace string
		want      bool
	}{
		{
			name:      "in-cluster service in caller's namespace is trusted",
			baseURL:   "https://my-model.test-namespace.svc.cluster.local:8080/v1",
			namespace: "test-namespace",
			want:      true,
		},
		{
			name:      "in-cluster service in a different namespace is not trusted",
			baseURL:   "https://my-model.other-namespace.svc.cluster.local:8080/v1",
			namespace: "test-namespace",
			want:      false,
		},
		{
			name:      "namespace-like service name does not trick the namespace label",
			baseURL:   "https://other-namespace.my-model.test-namespace.svc.cluster.local/v1",
			namespace: "test-namespace",
			want:      true,
		},
		{
			name:      "namespace prefix match is not enough",
			baseURL:   "https://my-model.test-namespace-extra.svc.cluster.local/v1",
			namespace: "test-namespace",
			want:      false,
		},
		{
			name:      "localhost is trusted for local development",
			baseURL:   "http://localhost:8080/v1",
			namespace: "test-namespace",
			want:      true,
		},
		{
			name:      "loopback IP is trusted for local development",
			baseURL:   "http://127.0.0.1:8080/v1",
			namespace: "test-namespace",
			want:      true,
		},
		{
			name:      "external host is not trusted",
			baseURL:   "https://api.openai.com/v1",
			namespace: "test-namespace",
			want:      false,
		},
		{
			name:      "private IP is not trusted without SSRF validation",
			baseURL:   "http://10.0.0.1/v1",
			namespace: "test-namespace",
			want:      false,
		},
		{
			name:      "overly-broad cluster.local suffix is not trusted",
			baseURL:   "https://evil.cluster.local/v1",
			namespace: "cluster",
			want:      false,
		},
		{
			name:      "invalid URL is not trusted",
			baseURL:   "://not-a-url",
			namespace: "test-namespace",
			want:      false,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := isInternalHost(tt.baseURL, tt.namespace); got != tt.want {
				t.Errorf("isInternalHost(%q, %q) = %v, want %v", tt.baseURL, tt.namespace, got, tt.want)
			}
		})
	}
}
