package bffclient

import (
	"net/http"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestHTTPBFFClientIsPathAllowedChecksMethodAndEscapedURLPath(t *testing.T) {
	client := &HTTPBFFClient{allowedPathRules: []AllowedPathRule{
		{Method: http.MethodGet, PathPattern: "/model_catalog/sources/*/security_artifacts/*"},
		{Method: http.MethodGet, PathPattern: "/model_catalog/sources/*/artifacts/*"},
	}}

	tests := []struct {
		name   string
		method string
		path   string
		want   bool
	}{
		{
			name:   "allowed path",
			method: http.MethodGet,
			path:   "/model_catalog/sources/source/security_artifacts/model",
			want:   true,
		},
		{
			name:   "allowed encoded model name",
			method: http.MethodGet,
			path:   "/model_catalog/sources/source/artifacts/repo1%2Fmodel1",
			want:   true,
		},
		{
			name:   "pattern only in query",
			method: http.MethodGet,
			path:   "/model_catalog/sources/source/models/model?next=/security_artifacts/model",
			want:   false,
		},
		{
			name:   "unrelated path",
			method: http.MethodGet,
			path:   "/unrelated/artifacts/model",
			want:   false,
		},
		{
			name:   "wrong method",
			method: http.MethodPost,
			path:   "/model_catalog/sources/source/artifacts/model",
			want:   false,
		},
		{
			name:   "invalid URL",
			method: http.MethodGet,
			path:   "/model_catalog/sources/%zz/artifacts/model",
			want:   false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.Equal(t, tt.want, client.isPathAllowed(tt.method, tt.path))
		})
	}
}
