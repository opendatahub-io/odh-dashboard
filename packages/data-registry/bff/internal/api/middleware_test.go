package api

import (
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/opendatahub-io/data-registry/bff/internal/config"
	"github.com/opendatahub-io/data-registry/bff/internal/repositories"
	"github.com/stretchr/testify/assert"
)

// TestEnableCORS_PreflightAllowsAuthorizationAndContentType covers a browser preflight
// (OPTIONS + Access-Control-Request-Headers) for a cross-origin request that carries a bearer
// token and a JSON body — both required by the Data Registry proxy routes and by the existing
// BFF handlers, so the CORS middleware must not reject the preflight before either is ever sent.
func TestEnableCORS_PreflightAllowsAuthorizationAndContentType(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	app := &App{
		config:       config.EnvConfig{AllowedOrigins: []string{"https://example.com"}},
		logger:       logger,
		repositories: repositories.NewRepositories(),
	}

	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	req := httptest.NewRequest(http.MethodOptions, "/api/v1/my-project/namespaces", nil)
	req.Header.Set("Origin", "https://example.com")
	req.Header.Set("Access-Control-Request-Method", http.MethodPost)
	req.Header.Set("Access-Control-Request-Headers", "authorization,content-type")

	rr := httptest.NewRecorder()
	app.EnableCORS(next).ServeHTTP(rr, req)

	res := rr.Result()
	defer res.Body.Close()

	assert.Equal(t, "https://example.com", res.Header.Get("Access-Control-Allow-Origin"))
	// The cors library echoes back the requested headers using their original casing, so compare
	// case-insensitively rather than asserting an exact string.
	allowedHeaders := strings.ToLower(res.Header.Get("Access-Control-Allow-Headers"))
	assert.Contains(t, allowedHeaders, "authorization")
	assert.Contains(t, allowedHeaders, "content-type")
}
