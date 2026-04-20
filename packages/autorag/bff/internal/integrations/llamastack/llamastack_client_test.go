package llamastack

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
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

	t.Run("should send auth token over HTTP to localhost", func(t *testing.T) {
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// httptest.NewServer uses http://127.0.0.1, token should be sent for localhost
			assert.Equal(t, "Bearer secret-token", r.Header.Get("Authorization"), "auth token should be sent over HTTP to localhost")
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
			name:           "should return Timeout for 504",
			statusCode:     http.StatusGatewayTimeout,
			body:           "gateway timeout",
			expectedCode:   ErrCodeTimeout,
			expectedStatus: http.StatusGatewayTimeout,
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
		{"408 maps to Timeout", http.StatusRequestTimeout, nil, "models", ErrCodeTimeout},
		{"503 maps to ServerUnavailable", http.StatusServiceUnavailable, nil, "models", ErrCodeServerUnavailable},
		{"504 maps to Timeout", http.StatusGatewayTimeout, nil, "providers", ErrCodeTimeout},
		{"500 maps to InternalError", http.StatusInternalServerError, []byte("oops"), "models", ErrCodeInternalError},
		{"418 maps to InternalError", 418, []byte("teapot"), "models", ErrCodeInternalError},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := mapHTTPStatusToError(tt.statusCode, tt.body, tt.resource)

			require.NotNil(t, err)
			assert.Equal(t, tt.expectedCode, err.Code)
			assert.Contains(t, err.Message, tt.resource)

			// Upstream body must NOT leak into client-facing error messages
			if len(tt.body) > 0 {
				assert.NotContains(t, err.Message, string(tt.body),
					"raw upstream body should not appear in error message")
			}
		})
	}
}

// TestListModelsFixture verifies that the full parse pipeline handles a real
// LlamaStack OpenAI-compatible response (the format served at /v1/models).
// When upgrading LlamaStack, capture the new response as a fixture to catch
// regressions immediately.
func TestListModelsFixture(t *testing.T) {
	fixtureBytes, err := os.ReadFile("testdata/llamastack_openai_models.json")
	require.NoError(t, err, "fixture file must exist — run tests from the llamastack package directory")

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, writeErr := w.Write(fixtureBytes)
		require.NoError(t, writeErr)
	}))
	defer server.Close()

	client := newTestClient(server.URL)
	result, err := client.ListModels(context.Background())

	require.NoError(t, err)
	require.Len(t, result, 4, "fixture contains 4 models")

	// Verify LLM vs embedding breakdown
	llmCount := 0
	embeddingCount := 0
	for _, m := range result {
		assert.NotEmpty(t, m.ID)
		require.NotNil(t, m.CustomMetadata, "model %q should have custom_metadata", m.ID)
		switch m.CustomMetadata.ModelType {
		case "llm":
			llmCount++
		case "embedding":
			embeddingCount++
		default:
			t.Errorf("unexpected model_type %q for model %q", m.CustomMetadata.ModelType, m.ID)
		}
		assert.NotEmpty(t, m.CustomMetadata.ProviderID, "model %q should have provider_id", m.ID)
	}
	assert.Equal(t, 1, llmCount, "fixture should contain 1 LLM model")
	assert.Equal(t, 3, embeddingCount, "fixture should contain 3 embedding models")
}

func TestListProviders(t *testing.T) {
	t.Run("should parse envelope format", func(t *testing.T) {
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			assert.Equal(t, "/v1/providers", r.URL.Path)
			resp := map[string]any{
				"data": []map[string]any{
					{"provider_id": "ollama", "provider_type": "remote::ollama", "api": "inference"},
					{"provider_id": "pgvector", "provider_type": "remote::pgvector", "api": "vector_io"},
				},
			}
			writeJSON(t, w, resp)
		}))
		defer server.Close()

		client := newTestClient(server.URL)
		result, err := client.ListProviders(context.Background())

		require.NoError(t, err)
		require.Len(t, result, 2)
		assert.Equal(t, "ollama", result[0].ProviderID)
		assert.Equal(t, "pgvector", result[1].ProviderID)
	})

	t.Run("should fall back to bare array format", func(t *testing.T) {
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
			resp := []map[string]any{
				{"provider_id": "bare-provider", "provider_type": "inline", "api": "inference"},
			}
			writeJSON(t, w, resp)
		}))
		defer server.Close()

		client := newTestClient(server.URL)
		result, err := client.ListProviders(context.Background())

		require.NoError(t, err)
		require.Len(t, result, 1)
		assert.Equal(t, "bare-provider", result[0].ProviderID)
	})

	t.Run("should return error for invalid JSON", func(t *testing.T) {
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
			w.Header().Set("Content-Type", "application/json")
			_, writeErr := w.Write([]byte(`{invalid`))
			require.NoError(t, writeErr)
		}))
		defer server.Close()

		client := newTestClient(server.URL)
		_, err := client.ListProviders(context.Background())

		require.Error(t, err)
		var lsErr *LlamaStackError
		require.ErrorAs(t, err, &lsErr)
		assert.Equal(t, ErrCodeInternalError, lsErr.Code)
	})

	t.Run("should return error for non-200 status", func(t *testing.T) {
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
			w.WriteHeader(http.StatusServiceUnavailable)
			_, writeErr := w.Write([]byte("unavailable"))
			require.NoError(t, writeErr)
		}))
		defer server.Close()

		client := newTestClient(server.URL)
		_, err := client.ListProviders(context.Background())

		require.Error(t, err)
		var lsErr *LlamaStackError
		require.ErrorAs(t, err, &lsErr)
		assert.Equal(t, ErrCodeServerUnavailable, lsErr.Code)
	})
}
