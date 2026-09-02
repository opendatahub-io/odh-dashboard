package api

import (
	"errors"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestFriendlyConfigMapError(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name      string
		err       error
		namespace string
		want      string
		notWant   string
	}{
		{
			name:      "not found",
			err:       errors.New("configmaps \"gen-ai-aa-mcp-servers\" not found"),
			namespace: "demo",
			want:      "ConfigMap 'gen-ai-aa-mcp-servers' not found in namespace 'demo'",
		},
		{
			name:      "forbidden",
			err:       errors.New("forbidden: User cannot get configmaps"),
			namespace: "demo",
			want:      "Access denied to ConfigMap 'gen-ai-aa-mcp-servers' in namespace 'demo'",
		},
		{
			name:      "fallback redacts internal details",
			err:       errors.New(`User "system:serviceaccount:opendatahub:gen-ai-bff" cannot get resource "configmaps"`),
			namespace: "opendatahub",
			want:      "Failed to read ConfigMap 'gen-ai-aa-mcp-servers'",
			notWant:   "system:serviceaccount",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			got := friendlyConfigMapError(tt.err, tt.namespace)
			assert.Equal(t, tt.want, got)
			if tt.notWant != "" {
				assert.NotContains(t, got, tt.notWant)
			}
		})
	}
}
