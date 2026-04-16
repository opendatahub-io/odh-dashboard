package llamastack

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// newTestClient creates a LlamaStackClient pointing at the given test server.
func newTestClient(serverURL string) *LlamaStackClient {
	return NewLlamaStackClient(serverURL, "", false, nil)
}

// writeJSON encodes v as JSON into the response writer, failing the test on error.
func writeJSON(t *testing.T, w http.ResponseWriter, v any) {
	t.Helper()
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(v); err != nil {
		t.Fatalf("failed to encode JSON response: %v", err)
	}
}

func TestListModels(t *testing.T) {
	t.Run("should parse envelope format with data wrapper", func(t *testing.T) {
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			assert.Equal(t, "/v1/models", r.URL.Path)
			assert.Equal(t, "application/json", r.Header.Get("Accept"))

			resp := map[string]any{
				"data": []map[string]any{
					{
						"id": "llama3.2:3b",
						"custom_metadata": map[string]any{
							"model_type":           "llm",
							"provider_id":          "ollama",
							"provider_resource_id": "ollama://models/llama3.2:3b",
						},
					},
					{
						"id": "all-minilm:l6-v2",
						"custom_metadata": map[string]any{
							"model_type":           "embedding",
							"provider_id":          "ollama",
							"provider_resource_id": "ollama://models/all-minilm:l6-v2",
						},
					},
				},
			}
			writeJSON(t, w, resp)
		}))
		defer server.Close()

		client := newTestClient(server.URL)
		result, err := client.ListModels(context.Background())

		require.NoError(t, err)
		require.Len(t, result, 2)
		assert.Equal(t, "llama3.2:3b", result[0].ID)
		assert.Equal(t, "llm", result[0].CustomMetadata.ModelType)
		assert.Equal(t, "all-minilm:l6-v2", result[1].ID)
		assert.Equal(t, "embedding", result[1].CustomMetadata.ModelType)
	})

	t.Run("should fall back to bare array format", func(t *testing.T) {
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
			// Return a bare array instead of { "data": [...] }
			resp := []map[string]any{
				{
					"id": "bare-model",
					"custom_metadata": map[string]any{
						"model_type":  "llm",
						"provider_id": "vllm",
					},
				},
			}
			writeJSON(t, w, resp)
		}))
		defer server.Close()

		client := newTestClient(server.URL)
		result, err := client.ListModels(context.Background())

		require.NoError(t, err)
		require.Len(t, result, 1)
		assert.Equal(t, "bare-model", result[0].ID)
	})

	t.Run("should return error for invalid JSON", func(t *testing.T) {
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
			w.Header().Set("Content-Type", "application/json")
			_, err := w.Write([]byte(`not valid json`))
			require.NoError(t, err)
		}))
		defer server.Close()

		client := newTestClient(server.URL)
		_, err := client.ListModels(context.Background())

		require.Error(t, err)
		var lsErr *LlamaStackError
		require.ErrorAs(t, err, &lsErr)
		assert.Equal(t, ErrCodeInternalError, lsErr.Code)
		assert.Contains(t, lsErr.Message, "failed to parse LlamaStack models response")
	})

	t.Run("should handle empty data array", func(t *testing.T) {
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
			writeJSON(t, w, map[string]any{"data": []any{}})
		}))
		defer server.Close()

		client := newTestClient(server.URL)
		result, err := client.ListModels(context.Background())

		require.NoError(t, err)
		assert.Empty(t, result)
	})

	t.Run("should handle models with nil custom_metadata", func(t *testing.T) {
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
			resp := map[string]any{
				"data": []map[string]any{
					{"id": "no-metadata-model"},
				},
			}
			writeJSON(t, w, resp)
		}))
		defer server.Close()

		client := newTestClient(server.URL)
		result, err := client.ListModels(context.Background())

		require.NoError(t, err)
		require.Len(t, result, 1)
		assert.Equal(t, "no-metadata-model", result[0].ID)
		assert.Nil(t, result[0].CustomMetadata)
	})

	t.Run("should not send auth token over HTTP", func(t *testing.T) {
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// httptest.NewServer uses http://, so token should NOT be sent
			assert.Empty(t, r.Header.Get("Authorization"), "auth token should not be sent over HTTP")
			writeJSON(t, w, map[string]any{"data": []any{}})
		}))
		defer server.Close()

		client := NewLlamaStackClient(server.URL, "secret-token", false, nil)
		_, err := client.ListModels(context.Background())

		require.NoError(t, err)
	})

	t.Run("should send auth token over HTTPS", func(t *testing.T) {
		server := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			assert.Equal(t, "Bearer secret-token", r.Header.Get("Authorization"))
			writeJSON(t, w, map[string]any{"data": []any{}})
		}))
		defer server.Close()

		// Use the test server's TLS client to trust the self-signed cert
		client := &LlamaStackClient{
			httpClient: server.Client(),
			baseURL:    server.URL,
			authToken:  "secret-token",
		}
		_, err := client.ListModels(context.Background())

		require.NoError(t, err)
	})
}

func TestListModelsHTTPErrors(t *testing.T) {
	tests := []struct {
		name           string
		statusCode     int
		body           string
		expectedCode   string
		expectedStatus int
	}{
		{
			name:           "should return InvalidRequest for 400",
			statusCode:     http.StatusBadRequest,
			body:           "bad request body",
			expectedCode:   ErrCodeInvalidRequest,
			expectedStatus: 400,
		},
		{
			name:           "should return Unauthorized for 401",
			statusCode:     http.StatusUnauthorized,
			body:           "unauthorized",
			expectedCode:   ErrCodeUnauthorized,
			expectedStatus: 401,
		},
		{
			name:           "should return NotFound for 404",
			statusCode:     http.StatusNotFound,
			body:           "not found",
			expectedCode:   ErrCodeNotFound,
			expectedStatus: 404,
		},
		{
			name:           "should return ServerUnavailable for 503",
			statusCode:     http.StatusServiceUnavailable,
			body:           "service unavailable",
			expectedCode:   ErrCodeServerUnavailable,
			expectedStatus: 503,
		},
		{
			name:           "should return ServerUnavailable for 504",
			statusCode:     http.StatusGatewayTimeout,
			body:           "gateway timeout",
			expectedCode:   ErrCodeServerUnavailable,
			expectedStatus: 503,
		},
		{
			name:           "should return InternalError for unexpected status",
			statusCode:     http.StatusConflict,
			body:           "conflict",
			expectedCode:   ErrCodeInternalError,
			expectedStatus: http.StatusConflict,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
				w.WriteHeader(tt.statusCode)
				_, err := w.Write([]byte(tt.body))
				require.NoError(t, err)
			}))
			defer server.Close()

			client := newTestClient(server.URL)
			_, err := client.ListModels(context.Background())

			require.Error(t, err)
			var lsErr *LlamaStackError
			require.ErrorAs(t, err, &lsErr)
			assert.Equal(t, tt.expectedCode, lsErr.Code)
			assert.Equal(t, tt.expectedStatus, lsErr.StatusCode)
		})
	}
}

func TestListModelsConnectionError(t *testing.T) {
	t.Run("should wrap connection errors", func(t *testing.T) {
		// Point at a non-existent server
		client := newTestClient("http://127.0.0.1:1")
		_, err := client.ListModels(context.Background())

		require.Error(t, err)
		var lsErr *LlamaStackError
		require.ErrorAs(t, err, &lsErr)
		assert.Equal(t, ErrCodeConnectionFailed, lsErr.Code)
	})
}

func TestMapHTTPStatusToError(t *testing.T) {
	tests := []struct {
		name         string
		statusCode   int
		body         []byte
		resource     string
		expectedCode string
	}{
		{"400 maps to InvalidRequest", http.StatusBadRequest, []byte("bad"), "models", ErrCodeInvalidRequest},
		{"401 maps to Unauthorized", http.StatusUnauthorized, nil, "providers", ErrCodeUnauthorized},
		{"404 maps to NotFound", http.StatusNotFound, nil, "models", ErrCodeNotFound},
		{"408 maps to ServerUnavailable", http.StatusRequestTimeout, nil, "models", ErrCodeServerUnavailable},
		{"503 maps to ServerUnavailable", http.StatusServiceUnavailable, nil, "models", ErrCodeServerUnavailable},
		{"504 maps to ServerUnavailable", http.StatusGatewayTimeout, nil, "providers", ErrCodeServerUnavailable},
		{"500 maps to InternalError", http.StatusInternalServerError, []byte("oops"), "models", ErrCodeInternalError},
		{"418 maps to InternalError", 418, []byte("teapot"), "models", ErrCodeInternalError},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := mapHTTPStatusToError(tt.statusCode, tt.body, tt.resource)

			require.NotNil(t, err)
			assert.Equal(t, tt.expectedCode, err.Code)
			assert.Contains(t, err.Message, tt.resource)
		})
	}
}
