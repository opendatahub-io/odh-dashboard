package bffclient

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestHTTPBFFClientCallDeniesWhenPathRulesAreEmpty(t *testing.T) {
	requestCount := 0
	server := httptest.NewServer(http.HandlerFunc(func(http.ResponseWriter, *http.Request) {
		requestCount++
	}))
	defer server.Close()

	for _, rules := range [][]AllowedPathRule{nil, {}} {
		client := &HTTPBFFClient{
			baseURL:          server.URL,
			target:           BFFTargetModelCatalog,
			httpClient:       server.Client(),
			allowedPathRules: rules,
		}

		err := client.Call(context.Background(), http.MethodGet, "/model_catalog/sources/source/artifacts/model", nil, nil)

		clientErr, ok := err.(*BFFClientError)
		require.True(t, ok)
		assert.Equal(t, ErrCodePathNotAllowed, clientErr.Code)
	}

	assert.Zero(t, requestCount)
}

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
