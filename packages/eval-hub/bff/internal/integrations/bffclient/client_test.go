package bffclient

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestHTTPBFFClientIsPathAllowedChecksOnlyURLPath(t *testing.T) {
	client := &HTTPBFFClient{allowedPaths: []string{"/security_artifacts/"}}

	tests := []struct {
		name string
		path string
		want bool
	}{
		{
			name: "allowed path",
			path: "/model_catalog/sources/source/security_artifacts/model",
			want: true,
		},
		{
			name: "pattern only in query",
			path: "/model_catalog/sources/source/artifacts/model?next=/security_artifacts/model",
			want: false,
		},
		{
			name: "invalid URL",
			path: "/model_catalog/sources/%zz/artifacts/model",
			want: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.Equal(t, tt.want, client.isPathAllowed(tt.path))
		})
	}
}
