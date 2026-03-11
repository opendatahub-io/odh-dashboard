package helper

import (
	"testing"
)

func TestIsClusterLocalURL(t *testing.T) {
	tests := []struct {
		name     string
		url      string
		expected bool
	}{
		{
			name:     "valid cluster-local HTTP URL",
			url:      "http://service.namespace.svc.cluster.local",
			expected: true,
		},
		{
			name:     "valid cluster-local HTTPS URL",
			url:      "https://service.namespace.svc.cluster.local",
			expected: true,
		},
		{
			name:     "cluster-local URL with port",
			url:      "http://service.namespace.svc.cluster.local:8080",
			expected: true,
		},
		{
			name:     "cluster-local URL with path",
			url:      "http://service.namespace.svc.cluster.local/v1/api",
			expected: true,
		},
		{
			name:     "cluster-local URL with port and path",
			url:      "https://service.namespace.svc.cluster.local:8443/v1/api",
			expected: true,
		},
		{
			name:     "external URL - should not match",
			url:      "https://api.openai.com",
			expected: false,
		},
		{
			name:     "external URL with cluster-local in query param - should not match",
			url:      "https://evil.com/redirect?to=http://internal.svc.cluster.local",
			expected: false,
		},
		{
			name:     "external URL with cluster-local in path - should not match",
			url:      "https://evil.com/path/service.namespace.svc.cluster.local",
			expected: false,
		},
		{
			name:     "external URL with cluster-local in fragment - should not match",
			url:      "https://evil.com#service.namespace.svc.cluster.local",
			expected: false,
		},
		{
			name:     "invalid URL - should return false for safety",
			url:      "not a valid url",
			expected: false,
		},
		{
			name:     "empty URL - should return false",
			url:      "",
			expected: false,
		},
		{
			name:     "URL with cluster-local subdomain but different TLD - should not match",
			url:      "https://service.namespace.svc.cluster.local.evil.com",
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := IsClusterLocalURL(tt.url)
			if result != tt.expected {
				t.Errorf("IsClusterLocalURL(%q) = %v, expected %v", tt.url, result, tt.expected)
			}
		})
	}
}
