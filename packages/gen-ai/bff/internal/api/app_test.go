package api

import (
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/opendatahub-io/gen-ai/internal/config"
	"github.com/opendatahub-io/gen-ai/internal/constants"
	"github.com/opendatahub-io/gen-ai/internal/integrations/llamastack/lsmocks"
	"github.com/opendatahub-io/gen-ai/internal/models"
	"github.com/opendatahub-io/gen-ai/internal/repositories"
	"github.com/stretchr/testify/assert"
)

func TestIsAPIRoute(t *testing.T) {
	// Create a test app
	cfg := config.EnvConfig{}
	app := &App{
		config: cfg,
		logger: slog.Default(),
	}

	tests := []struct {
		name     string
		path     string
		expected bool
	}{
		// Health check routes
		{
			name:     "health check path",
			path:     constants.HealthCheckPath,
			expected: true,
		},
		{
			name:     "health check path with trailing slash",
			path:     constants.HealthCheckPath + "/",
			expected: false,
		},

		// OpenAPI routes
		{
			name:     "openapi path",
			path:     constants.OpenAPIPath,
			expected: true,
		},
		{
			name:     "openapi json path",
			path:     constants.OpenAPIJSONPath,
			expected: true,
		},
		{
			name:     "openapi yaml path",
			path:     constants.OpenAPIYAMLPath,
			expected: true,
		},
		{
			name:     "swagger ui path",
			path:     constants.SwaggerUIPath,
			expected: true,
		},

		// API v1 routes - exact matches
		{
			name:     "api v1 prefix exact match",
			path:     "/api/v1",
			expected: true,
		},
		{
			name:     "api v1 config",
			path:     "/api/v1/config",
			expected: true,
		},
		{
			name:     "api v1 models",
			path:     "/api/v1/models",
			expected: true,
		},
		{
			name:     "api v1 vector-dbs",
			path:     "/api/v1/vector-dbs",
			expected: true,
		},
		{
			name:     "api v1 upload",
			path:     "/api/v1/upload",
			expected: true,
		},
		{
			name:     "api v1 query",
			path:     "/api/v1/query",
			expected: true,
		},
		{
			name:     "api v1 auth callback",
			path:     "/api/v1/auth/callback",
			expected: true,
		},
		{
			name:     "api v1 auth state",
			path:     "/api/v1/auth/state",
			expected: true,
		},

		// Llama-stack routes
		{
			name:     "llama-stack exact match",
			path:     "/llama-stack",
			expected: true,
		},
		{
			name:     "llama-stack with subpath",
			path:     "/llama-stack/models",
			expected: true,
		},
		{
			name:     "llama-stack with nested subpath",
			path:     "/llama-stack/v1/models",
			expected: true,
		},

		// False positive cases - these should NOT be API routes
		{
			name:     "api v1something (false positive case)",
			path:     "/api/v1something",
			expected: false,
		},
		{
			name:     "api v1-other",
			path:     "/api/v1-other",
			expected: false,
		},
		{
			name:     "api v1_other",
			path:     "/api/v1_other",
			expected: false,
		},
		{
			name:     "api v1other",
			path:     "/api/v1other",
			expected: false,
		},
		{
			name:     "api v1.",
			path:     "/api/v1.",
			expected: false,
		},
		{
			name:     "api v1/",
			path:     "/api/v1/",
			expected: true, // This should be true as it has the trailing slash
		},

		// SPA and static asset paths - should NOT be API routes
		{
			name:     "dashboard route",
			path:     "/dashboard",
			expected: false,
		},
		{
			name:     "dashboard with subpath",
			path:     "/dashboard/settings",
			expected: false,
		},
		{
			name:     "assets css",
			path:     "/assets/css/style.css",
			expected: false,
		},
		{
			name:     "assets js",
			path:     "/assets/js/app.js",
			expected: false,
		},
		{
			name:     "images",
			path:     "/images/logo.png",
			expected: false,
		},
		{
			name:     "root path",
			path:     "/",
			expected: false,
		},
		{
			name:     "index html",
			path:     "/index.html",
			expected: false,
		},
		{
			name:     "favicon",
			path:     "/favicon.ico",
			expected: false,
		},

		// Edge cases
		{
			name:     "empty path",
			path:     "",
			expected: false,
		},
		{
			name:     "path without leading slash",
			path:     "api/v1/config",
			expected: false,
		},
		{
			name:     "path with query params",
			path:     "/api/v1/config?param=value",
			expected: true, // The function should match the path portion before query params
		},
		{
			name:     "path with fragments",
			path:     "/api/v1/config#section",
			expected: true, // The function should match the path portion before fragments
		},

		// Llama-stack false positive cases
		{
			name:     "llama-stack-other",
			path:     "/llama-stack-other",
			expected: false,
		},
		{
			name:     "llama-stack_other",
			path:     "/llama-stack_other",
			expected: false,
		},
		{
			name:     "llama-stackother",
			path:     "/llama-stackother",
			expected: false,
		},
		{
			name:     "llama-stack.",
			path:     "/llama-stack.",
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := app.isAPIRoute(tt.path)
			assert.Equal(t, tt.expected, result,
				"Path: %s, Expected: %v, Got: %v", tt.path, tt.expected, result)
		})
	}
}

// TestIsAPIRouteEdgeCases tests additional edge cases and boundary conditions
func TestIsAPIRouteEdgeCases(t *testing.T) {
	// Create a test app
	cfg := config.EnvConfig{}
	app := &App{
		config: cfg,
		logger: slog.Default(),
	}
	tests := []struct {
		name     string
		path     string
		expected bool
	}{
		// Boundary testing for API v1 prefix
		{
			name:     "api v1 with single character after",
			path:     "/api/v1a",
			expected: false,
		},
		{
			name:     "api v1 with number after",
			path:     "/api/v12",
			expected: false,
		},
		{
			name:     "api v1 with special character after",
			path:     "/api/v1@",
			expected: false,
		},
		{
			name:     "api v1 with space after",
			path:     "/api/v1 ",
			expected: false,
		},

		// Boundary testing for llama-stack prefix
		{
			name:     "llama-stack with single character after",
			path:     "/llama-stacka",
			expected: false,
		},
		{
			name:     "llama-stack with number after",
			path:     "/llama-stack2",
			expected: false,
		},
		{
			name:     "llama-stack with special character after",
			path:     "/llama-stack@",
			expected: false,
		},
		{
			name:     "llama-stack with space after",
			path:     "/llama-stack ",
			expected: false,
		},

		// Case sensitivity tests
		{
			name:     "API v1 uppercase",
			path:     "/API/V1/config",
			expected: false,
		},
		{
			name:     "llama-stack uppercase",
			path:     "/LLAMA-STACK/models",
			expected: false,
		},
		{
			name:     "mixed case api v1",
			path:     "/Api/V1/config",
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := app.isAPIRoute(tt.path)
			assert.Equal(t, tt.expected, result,
				"Path: %s, Expected: %v, Got: %v", tt.path, tt.expected, result)
		})
	}
}

// TestIsAPIRoutePerformance tests that the function handles various path lengths efficiently
func TestIsAPIRoutePerformance(t *testing.T) {
	// Create a test app
	cfg := config.EnvConfig{}
	app := &App{
		config: cfg,
		logger: slog.Default(),
	}

	// Test with very long paths to ensure no performance issues
	longPath := "/api/v1/" + string(make([]byte, 1000))
	result := app.isAPIRoute(longPath)
	assert.True(t, result, "Long API path should still be recognized as API route")

	// Test with very long non-API paths
	longNonAPIPath := "/dashboard/" + string(make([]byte, 1000))
	result = app.isAPIRoute(longNonAPIPath)
	assert.False(t, result, "Long non-API path should not be recognized as API route")
}

// TestGetCurrentUserHandler tests the GetCurrentUserHandler endpoint
func TestGetCurrentUserHandler(t *testing.T) {
	// Create a test app
	cfg := config.EnvConfig{}
	app := &App{
		config:       cfg,
		logger:       slog.Default(),
		repositories: repositories.NewRepositories(lsmocks.NewMockLlamaStackClient()),
	}

	tests := []struct {
		name           string
		requestContext func() context.Context
		expectedUser   string
	}{
		{
			name: "no identity in context",
			requestContext: func() context.Context {
				return context.Background()
			},
			expectedUser: "",
		},
		{
			name: "nil identity in context",
			requestContext: func() context.Context {
				return context.WithValue(context.Background(), constants.RequestIdentityKey, nil)
			},
			expectedUser: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req, err := http.NewRequestWithContext(tt.requestContext(), http.MethodGet, constants.UserPath, nil)
			assert.NoError(t, err)

			rr := httptest.NewRecorder()
			app.GetCurrentUserHandler(rr, req, nil)

			assert.Equal(t, http.StatusOK, rr.Code)

			body, err := io.ReadAll(rr.Result().Body)
			assert.NoError(t, err)
			defer rr.Result().Body.Close()

			var userResponse models.UserModel
			err = json.Unmarshal(body, &userResponse)
			assert.NoError(t, err)

			assert.Equal(t, tt.expectedUser, userResponse.UserID)
		})
	}
}
