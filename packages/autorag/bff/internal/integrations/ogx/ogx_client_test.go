package ogx

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/opendatahub-io/autorag-library/bff/internal/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func newTestServer(handler http.HandlerFunc) (*httptest.Server, *OGXClient) {
	ts := httptest.NewServer(handler)
	return ts, NewOGXClient(ts.Client())
}

func jsonResponse(t *testing.T, w http.ResponseWriter, v any) {
	t.Helper()
	w.Header().Set("Content-Type", "application/json")
	require.NoError(t, json.NewEncoder(w).Encode(v))
}

// --- ListModels ---

func TestOGXClient_ListModels(t *testing.T) {
	t.Run("parses envelope format with data wrapper", func(t *testing.T) {
		ts, c := newTestServer(func(w http.ResponseWriter, r *http.Request) {
			assert.Equal(t, "/v1/models", r.URL.Path)
			assert.Equal(t, "application/json", r.Header.Get("Accept"))
			jsonResponse(t, w, map[string]any{
				"data": []models.OGXNativeModel{
					{ID: "llama3.2:3b", CustomMetadata: &models.OGXCustomMetadata{ModelType: "llm"}},
				},
			})
		})
		defer ts.Close()

		got, err := c.ListModels(context.Background(), ts.URL, "")
		require.NoError(t, err)
		require.Len(t, got, 1)
		assert.Equal(t, "llama3.2:3b", got[0].ID)
	})

	t.Run("falls back to bare array format", func(t *testing.T) {
		ts, c := newTestServer(func(w http.ResponseWriter, r *http.Request) {
			jsonResponse(t, w, []models.OGXNativeModel{
				{ID: "mistral-7b"},
			})
		})
		defer ts.Close()

		got, err := c.ListModels(context.Background(), ts.URL, "")
		require.NoError(t, err)
		require.Len(t, got, 1)
		assert.Equal(t, "mistral-7b", got[0].ID)
	})

	t.Run("attaches bearer token when apiKey is set", func(t *testing.T) {
		var gotAuth string
		ts, c := newTestServer(func(w http.ResponseWriter, r *http.Request) {
			gotAuth = r.Header.Get("Authorization")
			jsonResponse(t, w, map[string]any{"data": []models.OGXNativeModel{}})
		})
		defer ts.Close()

		_, err := c.ListModels(context.Background(), ts.URL, "secret-token")
		require.NoError(t, err)
		assert.Equal(t, "Bearer secret-token", gotAuth)
	})

	t.Run("maps non-200 status codes to typed errors", func(t *testing.T) {
		tests := []struct {
			name       string
			statusCode int
			wantCode   string
		}{
			{"bad request", http.StatusBadRequest, ErrCodeInvalidRequest},
			{"unauthorized", http.StatusUnauthorized, ErrCodeUnauthorized},
			{"not found", http.StatusNotFound, ErrCodeNotFound},
			{"timeout", http.StatusGatewayTimeout, ErrCodeTimeout},
			{"service unavailable", http.StatusServiceUnavailable, ErrCodeServerUnavailable},
			{"unexpected status", http.StatusTeapot, ErrCodeInternalError},
		}
		for _, tt := range tests {
			t.Run(tt.name, func(t *testing.T) {
				ts, c := newTestServer(func(w http.ResponseWriter, r *http.Request) {
					w.WriteHeader(tt.statusCode)
					_, _ = w.Write([]byte(`{"error": "boom"}`))
				})
				defer ts.Close()

				_, err := c.ListModels(context.Background(), ts.URL, "")
				require.Error(t, err)
				var ogxErr *OGXError
				require.ErrorAs(t, err, &ogxErr)
				assert.Equal(t, tt.wantCode, ogxErr.Code)
			})
		}
	})

	t.Run("returns an internal error on malformed JSON", func(t *testing.T) {
		ts, c := newTestServer(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "application/json")
			_, _ = w.Write([]byte(`{not json`))
		})
		defer ts.Close()

		_, err := c.ListModels(context.Background(), ts.URL, "")
		require.Error(t, err)
		var ogxErr *OGXError
		require.ErrorAs(t, err, &ogxErr)
		assert.Equal(t, ErrCodeInternalError, ogxErr.Code)
	})

	t.Run("truncates oversized response bodies instead of buffering them fully", func(t *testing.T) {
		// A single well-formed JSON element repeated enough times to exceed the
		// 2 MiB read cap. If the cap were not enforced, this would still be valid
		// JSON and parse successfully; because it's read-truncated mid-array, the
		// decoder must fail — proving the size limit is actually applied.
		const oversizeTarget = 3 << 20 // 3 MiB, above the 2 MiB models cap
		var buf bytes.Buffer
		buf.WriteString(`{"data":[`)
		element := `{"id":"` + strings.Repeat("x", 1024) + `"},`
		for buf.Len() < oversizeTarget {
			buf.WriteString(element)
		}
		buf.WriteString(`{"id":"last"}]}`)

		ts, c := newTestServer(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "application/json")
			_, _ = w.Write(buf.Bytes())
		})
		defer ts.Close()

		_, err := c.ListModels(context.Background(), ts.URL, "")
		require.Error(t, err)
		var ogxErr *OGXError
		require.ErrorAs(t, err, &ogxErr)
		assert.Equal(t, ErrCodeInternalError, ogxErr.Code)
	})

	t.Run("wraps connection failures", func(t *testing.T) {
		ts, c := newTestServer(func(w http.ResponseWriter, r *http.Request) {})
		ts.Close() // server is already closed, so the request cannot connect

		_, err := c.ListModels(context.Background(), ts.URL, "")
		require.Error(t, err)
		var ogxErr *OGXError
		require.ErrorAs(t, err, &ogxErr)
		assert.Equal(t, ErrCodeConnectionFailed, ogxErr.Code)
	})
}

// --- ListProviders ---

func TestOGXClient_ListProviders(t *testing.T) {
	t.Run("parses envelope format with data wrapper", func(t *testing.T) {
		ts, c := newTestServer(func(w http.ResponseWriter, r *http.Request) {
			assert.Equal(t, "/v1/providers", r.URL.Path)
			jsonResponse(t, w, map[string]any{
				"data": []models.OGXProvider{
					{API: "inference", ProviderID: "ollama", ProviderType: "remote::ollama"},
				},
			})
		})
		defer ts.Close()

		got, err := c.ListProviders(context.Background(), ts.URL, "")
		require.NoError(t, err)
		require.Len(t, got, 1)
		assert.Equal(t, "ollama", got[0].ProviderID)
	})

	t.Run("falls back to bare array format", func(t *testing.T) {
		ts, c := newTestServer(func(w http.ResponseWriter, r *http.Request) {
			jsonResponse(t, w, []models.OGXProvider{
				{API: "vector_io", ProviderID: "milvus", ProviderType: "remote::milvus"},
			})
		})
		defer ts.Close()

		got, err := c.ListProviders(context.Background(), ts.URL, "")
		require.NoError(t, err)
		require.Len(t, got, 1)
		assert.Equal(t, "milvus", got[0].ProviderID)
	})

	t.Run("maps non-200 status to a typed error", func(t *testing.T) {
		ts, c := newTestServer(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusInternalServerError)
		})
		defer ts.Close()

		_, err := c.ListProviders(context.Background(), ts.URL, "")
		require.Error(t, err)
		var ogxErr *OGXError
		require.ErrorAs(t, err, &ogxErr)
		assert.Equal(t, ErrCodeInternalError, ogxErr.Code)
	})

	t.Run("truncates oversized response bodies instead of buffering them fully", func(t *testing.T) {
		const oversizeTarget = 2 << 20 // 2 MiB, above the 1 MiB providers cap
		var buf bytes.Buffer
		buf.WriteString(`{"data":[`)
		element := `{"provider_id":"` + strings.Repeat("y", 1024) + `"},`
		for buf.Len() < oversizeTarget {
			buf.WriteString(element)
		}
		buf.WriteString(`{"provider_id":"last"}]}`)

		ts, c := newTestServer(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "application/json")
			_, _ = w.Write(buf.Bytes())
		})
		defer ts.Close()

		_, err := c.ListProviders(context.Background(), ts.URL, "")
		require.Error(t, err)
		var ogxErr *OGXError
		require.ErrorAs(t, err, &ogxErr)
		assert.Equal(t, ErrCodeInternalError, ogxErr.Code)
	})
}

// --- setAuthHeader ---

func TestSetAuthHeader(t *testing.T) {
	tests := []struct {
		name       string
		apiKey     string
		url        string
		wantHeader string
	}{
		{"https host gets bearer token", "tok", "https://ogx.example.com/v1/models", "Bearer tok"},
		{"localhost over http gets bearer token", "tok", "http://localhost:8080/v1/models", "Bearer tok"},
		{"127.0.0.1 over http gets bearer token", "tok", "http://127.0.0.1:8080/v1/models", "Bearer tok"},
		{"plain http to a remote host omits the token", "tok", "http://ogx.internal.svc:8080/v1/models", ""},
		{"empty apiKey never sets a header", "", "https://ogx.example.com/v1/models", ""},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req, err := http.NewRequestWithContext(context.Background(), http.MethodGet, tt.url, nil)
			require.NoError(t, err)

			setAuthHeader(req, tt.apiKey)

			assert.Equal(t, tt.wantHeader, req.Header.Get("Authorization"))
		})
	}
}
