package api

import (
	"context"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"

	"github.com/opendatahub-io/gen-ai/internal/config"
	"github.com/opendatahub-io/gen-ai/internal/constants"
	"github.com/opendatahub-io/gen-ai/internal/integrations"
	"github.com/opendatahub-io/gen-ai/internal/integrations/kubernetes/k8smocks"
	"github.com/opendatahub-io/gen-ai/internal/integrations/mcp"
	"github.com/opendatahub-io/gen-ai/internal/integrations/mcp/mcpmocks"
	"github.com/opendatahub-io/gen-ai/internal/models/genaiassets"
	"github.com/opendatahub-io/gen-ai/internal/repositories"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestParseMCPEndpointParams(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, &slog.HandlerOptions{Level: slog.LevelDebug}))
	app := &App{
		logger: logger,
	}

	testCases := []struct {
		name               string
		queryParams        map[string]string
		requireServerURL   bool
		expectedNamespace  string
		expectedServerURL  string
		expectedDecodedURL string
		expectError        bool
		expectedErrorMsg   string
	}{
		{
			name: "valid parameters with server URL required",
			queryParams: map[string]string{
				"namespace":  "test-namespace",
				"server_url": "http%3A//localhost%3A9090/sse",
			},
			requireServerURL:   true,
			expectedNamespace:  "test-namespace",
			expectedServerURL:  "http%3A//localhost%3A9090/sse",
			expectedDecodedURL: "http://localhost:9090/sse",
			expectError:        false,
		},
		{
			name: "valid parameters without server URL required",
			queryParams: map[string]string{
				"namespace": "test-namespace",
			},
			requireServerURL:   false,
			expectedNamespace:  "test-namespace",
			expectedServerURL:  "",
			expectedDecodedURL: "",
			expectError:        false,
		},
		{
			name: "missing namespace parameter",
			queryParams: map[string]string{
				"server_url": "http%3A//localhost%3A9090/sse",
			},
			requireServerURL: true,
			expectError:      true,
			expectedErrorMsg: "namespace parameter is required",
		},
		{
			name: "missing server URL when required",
			queryParams: map[string]string{
				"namespace": "test-namespace",
			},
			requireServerURL: true,
			expectError:      true,
			expectedErrorMsg: "server_url parameter is required",
		},
		{
			name: "invalid server URL encoding",
			queryParams: map[string]string{
				"namespace":  "test-namespace",
				"server_url": "http://localhost%ZZ",
			},
			requireServerURL: true,
			expectError:      true,
			expectedErrorMsg: "invalid server_url parameter",
		},
		{
			name: "empty namespace parameter",
			queryParams: map[string]string{
				"namespace":  "",
				"server_url": "http%3A//localhost%3A9090/sse",
			},
			requireServerURL: true,
			expectError:      true,
			expectedErrorMsg: "namespace parameter is required",
		},
		{
			name: "empty server URL when required",
			queryParams: map[string]string{
				"namespace":  "test-namespace",
				"server_url": "",
			},
			requireServerURL: true,
			expectError:      true,
			expectedErrorMsg: "server_url parameter is required",
		},
		{
			name: "complex URL with special characters",
			queryParams: map[string]string{
				"namespace":  "production",
				"server_url": url.QueryEscape("https://api.example.com:8443/mcp/v1?token=abc123&env=prod"),
			},
			requireServerURL:   true,
			expectedNamespace:  "production",
			expectedServerURL:  url.QueryEscape("https://api.example.com:8443/mcp/v1?token=abc123&env=prod"),
			expectedDecodedURL: "https://api.example.com:8443/mcp/v1?token=abc123&env=prod",
			expectError:        false,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			// Build URL with query parameters
			baseURL := "http://example.com/test"
			u, err := url.Parse(baseURL)
			require.NoError(t, err)

			q := u.Query()
			for key, value := range tc.queryParams {
				q.Set(key, value)
			}
			u.RawQuery = q.Encode()

			req, err := http.NewRequest("GET", u.String(), nil)
			require.NoError(t, err)

			namespace, serverURL, decodedURL, err := app.parseMCPEndpointParams(req, tc.requireServerURL)

			if tc.expectError {
				assert.Error(t, err)
				assert.Contains(t, err.Error(), tc.expectedErrorMsg)
			} else {
				assert.NoError(t, err)
				assert.Equal(t, tc.expectedNamespace, namespace)
				assert.Equal(t, tc.expectedServerURL, serverURL)
				assert.Equal(t, tc.expectedDecodedURL, decodedURL)
			}
		})
	}
}

func TestSetupMCPEndpoint(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, &slog.HandlerOptions{Level: slog.LevelDebug}))

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	testEnv := k8smocks.TestEnvInput{
		Users:  k8smocks.DefaultTestUsers,
		Logger: logger,
		Ctx:    ctx,
		Cancel: cancel,
	}

	testEnvironment, ctrlClient, err := k8smocks.SetupEnvTest(testEnv)
	require.NoError(t, err)

	mockK8sFactory, err := k8smocks.NewMockedKubernetesClientFactory(ctrlClient, testEnvironment, config.EnvConfig{
		AuthMethod: "user_token",
	}, logger)
	require.NoError(t, err)

	mockMCPFactory := mcpmocks.NewMockedMCPClientFactory(
		config.EnvConfig{MockK8sClient: true},
		logger,
	)

	testCases := []struct {
		name                  string
		contextSetup          func(ctx context.Context) context.Context
		repositories          *repositories.Repositories
		expectError           bool
		expectedErrorMsg      string
		shouldReturnIdentity  bool
		shouldReturnK8sClient bool
	}{
		{
			name: "valid setup with request identity",
			contextSetup: func(ctx context.Context) context.Context {
				return context.WithValue(ctx, constants.RequestIdentityKey, &integrations.RequestIdentity{
					Token: "FAKE_BEARER_TOKEN",
				})
			},
			repositories:          repositories.NewRepositoriesWithMCP(mockMCPFactory, logger),
			expectError:           false,
			shouldReturnIdentity:  true,
			shouldReturnK8sClient: true,
		},
		{
			name: "missing request identity in context",
			contextSetup: func(ctx context.Context) context.Context {
				return ctx // Don't add RequestIdentity
			},
			repositories:     repositories.NewRepositoriesWithMCP(mockMCPFactory, logger),
			expectError:      true,
			expectedErrorMsg: "missing RequestIdentity in context",
		},
		{
			name: "nil request identity in context",
			contextSetup: func(ctx context.Context) context.Context {
				return context.WithValue(ctx, constants.RequestIdentityKey, (*integrations.RequestIdentity)(nil))
			},
			repositories:     repositories.NewRepositoriesWithMCP(mockMCPFactory, logger),
			expectError:      true,
			expectedErrorMsg: "missing RequestIdentity in context",
		},
		{
			name: "wrong type in context",
			contextSetup: func(ctx context.Context) context.Context {
				return context.WithValue(ctx, constants.RequestIdentityKey, "wrong-type")
			},
			repositories:     repositories.NewRepositoriesWithMCP(mockMCPFactory, logger),
			expectError:      true,
			expectedErrorMsg: "missing RequestIdentity in context",
		},
		{
			name: "nil MCP client repository",
			contextSetup: func(ctx context.Context) context.Context {
				return context.WithValue(ctx, constants.RequestIdentityKey, &integrations.RequestIdentity{
					Token: "FAKE_BEARER_TOKEN",
				})
			},
			repositories:     repositories.NewRepositories(), // No MCP client
			expectError:      true,
			expectedErrorMsg: "MCP client not initialized",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			app := &App{
				logger:                  logger,
				kubernetesClientFactory: mockK8sFactory,
				repositories:            tc.repositories,
			}

			testCtx := tc.contextSetup(ctx)
			identity, k8sClient, err := app.setupMCPEndpoint(testCtx)

			if tc.expectError {
				assert.Error(t, err)
				assert.Contains(t, err.Error(), tc.expectedErrorMsg)
				assert.Nil(t, identity)
				assert.Nil(t, k8sClient)
			} else {
				assert.NoError(t, err)
				if tc.shouldReturnIdentity {
					assert.NotNil(t, identity)
					assert.Equal(t, "FAKE_BEARER_TOKEN", identity.Token)
				}
				if tc.shouldReturnK8sClient {
					assert.NotNil(t, k8sClient)
				}
			}
		})
	}
}

// Note: TestSetupMCPEndpointWithTokenValidation is skipped because the mock MCP factory
// doesn't fully implement token extraction. This function is tested in integration tests
// where real implementations are used.

func TestFindMCPServerConfig(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, &slog.HandlerOptions{Level: slog.LevelDebug}))

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	testEnv := k8smocks.TestEnvInput{
		Users:  k8smocks.DefaultTestUsers,
		Logger: logger,
		Ctx:    ctx,
		Cancel: cancel,
	}

	testEnvironment, ctrlClient, err := k8smocks.SetupEnvTest(testEnv)
	require.NoError(t, err)

	mockK8sFactory, err := k8smocks.NewMockedKubernetesClientFactory(ctrlClient, testEnvironment, config.EnvConfig{
		AuthMethod: "user_token",
	}, logger)
	require.NoError(t, err)

	mockMCPFactory := mcpmocks.NewMockedMCPClientFactory(
		config.EnvConfig{MockK8sClient: true},
		logger,
	)

	app := &App{
		logger:                  logger,
		kubernetesClientFactory: mockK8sFactory,
		repositories:            repositories.NewRepositoriesWithMCP(mockMCPFactory, logger),
	}

	identity := &integrations.RequestIdentity{
		Token: "FAKE_BEARER_TOKEN",
	}

	// Add request identity to context for k8s client
	testCtx := context.WithValue(ctx, constants.RequestIdentityKey, identity)
	k8sClient, err := mockK8sFactory.GetClient(testCtx)
	require.NoError(t, err)

	testCases := []struct {
		name               string
		decodedURL         string
		expectError        bool
		expectedErrorMsg   string
		expectedServerName string
	}{
		{
			name:               "find existing brave search server",
			decodedURL:         "http://localhost:9090/sse",
			expectError:        false,
			expectedServerName: "brave-search-mcp-server",
		},
		{
			name:               "find existing kubernetes server",
			decodedURL:         "http://localhost:9091/mcp",
			expectError:        false,
			expectedServerName: "kubernetes-mcp-server",
		},
		{
			name:             "server not found",
			decodedURL:       "https://nonexistent-server.com/mcp",
			expectError:      true,
			expectedErrorMsg: "MCP server not found for URL",
		},
		{
			name:               "find server with complex URL",
			decodedURL:         "https://api.githubcopilot.com/mcp",
			expectError:        false,
			expectedServerName: "generic-mcp-server",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			config, err := app.findMCPServerConfig(testCtx, k8sClient, identity, tc.decodedURL, "test-dashboard-namespace")

			if tc.expectError {
				assert.Error(t, err)
				assert.Contains(t, err.Error(), tc.expectedErrorMsg)
				assert.Equal(t, genaiassets.MCPServerConfig{}, config)
			} else {
				assert.NoError(t, err)
				assert.NotEqual(t, genaiassets.MCPServerConfig{}, config)
				assert.Equal(t, tc.decodedURL, config.URL)
			}
		})
	}
}

func TestHandleMCPClientError(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, &slog.HandlerOptions{Level: slog.LevelDebug}))
	app := &App{
		logger: logger,
	}

	testCases := []struct {
		name                 string
		inputError           error
		expectedStatusCode   int
		expectedContentType  string
		expectedBodyContains string
	}{
		{
			name: "NonSSEResponseError",
			inputError: &mcp.NonSSEResponseError{
				StatusCode: http.StatusBadRequest,
				Body:       `{"error": "invalid request"}`,
				Headers:    http.Header{"Content-Type": []string{"application/json"}},
			},
			expectedStatusCode:   http.StatusBadRequest,
			expectedContentType:  "application/json",
			expectedBodyContains: "invalid request",
		},
		{
			name: "MCPError with status code",
			inputError: &mcp.MCPError{
				Code:       mcp.ErrCodeUnauthorized,
				Message:    "Authentication failed",
				StatusCode: http.StatusUnauthorized,
			},
			expectedStatusCode:   http.StatusUnauthorized,
			expectedBodyContains: "unauthorized",
		},
		{
			name: "MCPError without status code - connection failed",
			inputError: &mcp.MCPError{
				Code:    mcp.ErrCodeConnectionFailed,
				Message: "Cannot connect to server",
			},
			expectedStatusCode:   http.StatusServiceUnavailable,
			expectedBodyContains: "service_unavailable",
		},
		{
			name: "MCPError without status code - timeout",
			inputError: &mcp.MCPError{
				Code:    mcp.ErrCodeTimeout,
				Message: "Request timed out",
			},
			expectedStatusCode:   http.StatusServiceUnavailable,
			expectedBodyContains: "service_unavailable",
		},
		{
			name: "MCPError without status code - invalid response",
			inputError: &mcp.MCPError{
				Code:    mcp.ErrCodeInvalidResponse,
				Message: "Invalid server response",
			},
			expectedStatusCode:   http.StatusBadGateway,
			expectedBodyContains: "bad_gateway",
		},
		{
			name: "MCPError without status code - server unavailable",
			inputError: &mcp.MCPError{
				Code:    mcp.ErrCodeServerUnavailable,
				Message: "Server is down",
			},
			expectedStatusCode:   http.StatusServiceUnavailable,
			expectedBodyContains: "service_unavailable",
		},
		{
			name: "MCPError without status code - unknown error",
			inputError: &mcp.MCPError{
				Code:    "UNKNOWN_ERROR",
				Message: "Something went wrong",
			},
			expectedStatusCode:   http.StatusInternalServerError,
			expectedBodyContains: "internal_server_error",
		},
		{
			name:                 "Generic error",
			inputError:           errors.New("generic error message"),
			expectedStatusCode:   http.StatusInternalServerError,
			expectedBodyContains: "the server encountered a problem",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			rr := httptest.NewRecorder()
			req := httptest.NewRequest("GET", "/test", nil)

			app.handleMCPClientError(rr, req, tc.inputError)

			assert.Equal(t, tc.expectedStatusCode, rr.Code)

			if tc.expectedContentType != "" {
				assert.Equal(t, tc.expectedContentType, rr.Header().Get("Content-Type"))
			}

			body := rr.Body.String()
			assert.Contains(t, body, tc.expectedBodyContains)
		})
	}
}

func TestGetDefaultStatusCodeForMCPError(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, &slog.HandlerOptions{Level: slog.LevelDebug}))
	app := &App{
		logger: logger,
	}

	testCases := []struct {
		errorCode          string
		expectedStatusCode int
	}{
		{mcp.ErrCodeUnauthorized, http.StatusUnauthorized},
		{mcp.ErrCodeConnectionFailed, http.StatusServiceUnavailable},
		{mcp.ErrCodeTimeout, http.StatusServiceUnavailable},
		{mcp.ErrCodeServerUnavailable, http.StatusServiceUnavailable},
		{mcp.ErrCodeInvalidResponse, http.StatusBadGateway},
		{"UNKNOWN_ERROR", http.StatusInternalServerError},
		{"", http.StatusInternalServerError},
	}

	for _, tc := range testCases {
		t.Run(fmt.Sprintf("error_code_%s", tc.errorCode), func(t *testing.T) {
			statusCode := app.getDefaultStatusCodeForMCPError(tc.errorCode)
			assert.Equal(t, tc.expectedStatusCode, statusCode)
		})
	}
}

func TestMapMCPErrorToHTTPError(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, &slog.HandlerOptions{Level: slog.LevelDebug}))
	app := &App{
		logger: logger,
	}

	testCases := []struct {
		name               string
		mcpError           *mcp.MCPError
		statusCode         int
		expectedCode       string
		expectedStatusCode int
		expectedMessage    string
	}{
		{
			name: "unauthorized error",
			mcpError: &mcp.MCPError{
				Code:    mcp.ErrCodeUnauthorized,
				Message: "Invalid credentials",
			},
			statusCode:         http.StatusUnauthorized,
			expectedCode:       "unauthorized",
			expectedStatusCode: http.StatusUnauthorized,
			expectedMessage:    "Invalid credentials",
		},
		{
			name: "forbidden error",
			mcpError: &mcp.MCPError{
				Code:    "FORBIDDEN",
				Message: "Access denied",
			},
			statusCode:         http.StatusForbidden,
			expectedCode:       "forbidden",
			expectedStatusCode: http.StatusForbidden,
			expectedMessage:    "Access denied",
		},
		{
			name: "service unavailable error",
			mcpError: &mcp.MCPError{
				Code:    mcp.ErrCodeServerUnavailable,
				Message: "Server is down",
			},
			statusCode:         http.StatusServiceUnavailable,
			expectedCode:       "service_unavailable",
			expectedStatusCode: http.StatusServiceUnavailable,
			expectedMessage:    "Server is down",
		},
		{
			name: "bad gateway error",
			mcpError: &mcp.MCPError{
				Code:    mcp.ErrCodeInvalidResponse,
				Message: "Invalid server response",
			},
			statusCode:         http.StatusBadGateway,
			expectedCode:       "bad_gateway",
			expectedStatusCode: http.StatusBadGateway,
			expectedMessage:    "Invalid response from MCP server: Invalid server response",
		},
		{
			name: "internal server error",
			mcpError: &mcp.MCPError{
				Code:    mcp.ErrCodeInternalError,
				Message: "Internal error occurred",
			},
			statusCode:         http.StatusInternalServerError,
			expectedCode:       "internal_server_error",
			expectedStatusCode: http.StatusInternalServerError,
			expectedMessage:    "Internal error occurred",
		},
		{
			name: "unknown status code",
			mcpError: &mcp.MCPError{
				Code:    "CUSTOM_ERROR",
				Message: "Custom error message",
			},
			statusCode:         http.StatusTeapot, // Unusual status code
			expectedCode:       "mcp_error",
			expectedStatusCode: http.StatusBadGateway, // Should be mapped to bad gateway
			expectedMessage:    "MCP server error (HTTP 418): Custom error message",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			httpError := app.mapMCPErrorToHTTPError(tc.mcpError, tc.statusCode)

			assert.Equal(t, tc.expectedStatusCode, httpError.StatusCode)
			assert.Equal(t, tc.expectedCode, httpError.Code)
			assert.Equal(t, tc.expectedMessage, httpError.Message)
		})
	}
}

// Integration test combining multiple helper functions
func TestMCPHelpersIntegration(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, &slog.HandlerOptions{Level: slog.LevelDebug}))

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	testEnv := k8smocks.TestEnvInput{
		Users:  k8smocks.DefaultTestUsers,
		Logger: logger,
		Ctx:    ctx,
		Cancel: cancel,
	}

	testEnvironment, ctrlClient, err := k8smocks.SetupEnvTest(testEnv)
	require.NoError(t, err)

	mockK8sFactory, err := k8smocks.NewMockedKubernetesClientFactory(ctrlClient, testEnvironment, config.EnvConfig{
		AuthMethod: "user_token",
	}, logger)
	require.NoError(t, err)

	mockMCPFactory := mcpmocks.NewMockedMCPClientFactory(
		config.EnvConfig{MockK8sClient: true},
		logger,
	)

	app := &App{
		logger:                  logger,
		kubernetesClientFactory: mockK8sFactory,
		repositories:            repositories.NewRepositoriesWithMCP(mockMCPFactory, logger),
		mcpClientFactory:        mockMCPFactory,
	}

	t.Run("complete flow with valid parameters", func(t *testing.T) {
		// Step 1: Parse parameters
		serverURL := "http://localhost:9090/sse"
		encodedURL := url.QueryEscape(serverURL)
		requestURL := fmt.Sprintf("/test?namespace=demo&server_url=%s", encodedURL)

		req := httptest.NewRequest("GET", requestURL, nil)
		req.Header.Set("Authorization", "Bearer mcp-token-123")

		namespace, _, decodedURL, err := app.parseMCPEndpointParams(req, true)
		require.NoError(t, err)
		assert.Equal(t, "demo", namespace)
		assert.Equal(t, serverURL, decodedURL)

		// Step 2: Setup endpoint (without token validation since mock doesn't support it fully)
		testCtx := context.WithValue(ctx, constants.RequestIdentityKey, &integrations.RequestIdentity{
			Token: "FAKE_BEARER_TOKEN",
		})

		identity, k8sClient, err := app.setupMCPEndpoint(testCtx)
		require.NoError(t, err)
		assert.NotNil(t, identity)
		assert.NotNil(t, k8sClient)
		assert.Equal(t, "FAKE_BEARER_TOKEN", identity.Token)

		// Step 3: Find server config
		config, err := app.findMCPServerConfig(testCtx, k8sClient, identity, decodedURL, "test-dashboard-namespace")
		require.NoError(t, err)
		assert.Equal(t, serverURL, config.URL)
	})

	t.Run("error handling flow", func(t *testing.T) {
		// Test error handling with invalid parameters
		req := httptest.NewRequest("GET", "/test?namespace=demo", nil) // Missing server_url

		_, _, _, err := app.parseMCPEndpointParams(req, true)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "server_url parameter is required")

		// Test error handling with ResponseWriter
		rr := httptest.NewRecorder()
		mcpErr := &mcp.MCPError{
			Code:    mcp.ErrCodeUnauthorized,
			Message: "Authentication failed",
		}

		app.handleMCPClientError(rr, req, mcpErr)
		assert.Equal(t, http.StatusUnauthorized, rr.Code)
	})
}
