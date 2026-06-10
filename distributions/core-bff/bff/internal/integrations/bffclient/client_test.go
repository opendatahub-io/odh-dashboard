package bffclient

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestHTTPBFFClient_Call_Success(t *testing.T) {
	expected := map[string]string{"status": "ok"}
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "application/json", r.Header.Get("Accept"))
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(expected)
	}))
	defer server.Close()

	client := NewHTTPBFFClient(server.URL, BFFTargetMaaS, "", false, nil)

	var result map[string]string
	err := client.Call(context.Background(), http.MethodGet, "/test", nil, &result)

	require.NoError(t, err)
	assert.Equal(t, "ok", result["status"])
}

func TestHTTPBFFClient_Call_WithBody(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "application/json", r.Header.Get("Content-Type"))
		var body map[string]string
		_ = json.NewDecoder(r.Body).Decode(&body)
		assert.Equal(t, "test-value", body["key"])
		w.WriteHeader(http.StatusCreated)
		_ = json.NewEncoder(w).Encode(map[string]string{"created": "true"})
	}))
	defer server.Close()

	client := NewHTTPBFFClient(server.URL, BFFTargetMaaS, "", false, nil)

	var result map[string]string
	err := client.Call(context.Background(), http.MethodPost, "/create", map[string]string{"key": "test-value"}, &result)

	require.NoError(t, err)
	assert.Equal(t, "true", result["created"])
}

func TestHTTPBFFClient_Call_AuthTokenForwarding(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "test-token", r.Header.Get("x-forwarded-access-token"))
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	client := NewHTTPBFFClient(server.URL, BFFTargetMaaS, "test-token", false, nil)
	err := client.Call(context.Background(), http.MethodGet, "/test", nil, nil)

	require.NoError(t, err)
}

func TestHTTPBFFClient_Call_CustomAuthHeader(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "Bearer my-token", r.Header.Get("Authorization"))
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	client := newHTTPBFFClient(clientConfig{
		BaseURL:         server.URL,
		Target:          BFFTargetMaaS,
		AuthToken:       "my-token",
		AuthTokenHeader: "Authorization",
		AuthTokenPrefix: "Bearer ",
	})
	err := client.Call(context.Background(), http.MethodGet, "/test", nil, nil)

	require.NoError(t, err)
}

func TestHTTPBFFClient_Call_CustomHeaders(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "user@example.com", r.Header.Get("x-custom-user"))
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	headers := map[string]string{"x-custom-user": "user@example.com"}
	client := NewHTTPBFFClientWithHeaders(server.URL, BFFTargetMaaS, "", headers, false, nil)
	err := client.Call(context.Background(), http.MethodGet, "/test", nil, nil)

	require.NoError(t, err)
}

func TestHTTPBFFClient_Call_ErrorCodes(t *testing.T) {
	tests := []struct {
		name       string
		statusCode int
		wantCode   string
	}{
		{"bad request", http.StatusBadRequest, ErrCodeBadRequest},
		{"unauthorized", http.StatusUnauthorized, ErrCodeUnauthorized},
		{"forbidden", http.StatusForbidden, ErrCodeForbidden},
		{"not found", http.StatusNotFound, ErrCodeNotFound},
		{"service unavailable", http.StatusServiceUnavailable, ErrCodeServerUnavailable},
		{"internal server error", http.StatusInternalServerError, ErrCodeServerUnavailable},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				w.WriteHeader(tt.statusCode)
				_, _ = w.Write([]byte("error message"))
			}))
			defer server.Close()

			client := NewHTTPBFFClient(server.URL, BFFTargetMaaS, "", false, nil)
			err := client.Call(context.Background(), http.MethodGet, "/test", nil, nil)

			require.Error(t, err)
			var bffErr *BFFClientError
			require.ErrorAs(t, err, &bffErr)
			assert.Equal(t, tt.wantCode, bffErr.Code)
			assert.Equal(t, BFFTargetMaaS, bffErr.Target)
		})
	}
}

func TestHTTPBFFClient_Call_ConnectionError(t *testing.T) {
	// Use a server that is immediately closed
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {}))
	server.Close()

	client := NewHTTPBFFClient(server.URL, BFFTargetMaaS, "", false, nil)
	err := client.Call(context.Background(), http.MethodGet, "/test", nil, nil)

	require.Error(t, err)
	var bffErr *BFFClientError
	require.ErrorAs(t, err, &bffErr)
	assert.Equal(t, ErrCodeConnectionFailed, bffErr.Code)
}

func TestHTTPBFFClient_Call_ContextCanceled(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Slow handler
		<-r.Context().Done()
	}))
	defer server.Close()

	client := NewHTTPBFFClient(server.URL, BFFTargetMaaS, "", false, nil)

	ctx, cancel := context.WithCancel(context.Background())
	cancel() // Cancel immediately

	err := client.Call(ctx, http.MethodGet, "/test", nil, nil)
	require.Error(t, err)
}

func TestHTTPBFFClient_Call_InvalidResponseJSON(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte("not-json"))
	}))
	defer server.Close()

	client := NewHTTPBFFClient(server.URL, BFFTargetMaaS, "", false, nil)

	var result map[string]string
	err := client.Call(context.Background(), http.MethodGet, "/test", nil, &result)

	require.Error(t, err)
	var bffErr *BFFClientError
	require.ErrorAs(t, err, &bffErr)
	assert.Equal(t, ErrCodeInvalidResponse, bffErr.Code)
}

func TestHTTPBFFClient_IsAvailable(t *testing.T) {
	t.Run("available", func(t *testing.T) {
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			assert.Equal(t, "/healthcheck", r.URL.Path)
			w.WriteHeader(http.StatusOK)
		}))
		defer server.Close()

		client := NewHTTPBFFClient(server.URL, BFFTargetMaaS, "", false, nil)
		assert.True(t, client.IsAvailable(context.Background()))
	})

	t.Run("unavailable", func(t *testing.T) {
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusServiceUnavailable)
		}))
		defer server.Close()

		client := NewHTTPBFFClient(server.URL, BFFTargetMaaS, "", false, nil)
		assert.False(t, client.IsAvailable(context.Background()))
	})

	t.Run("connection refused", func(t *testing.T) {
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {}))
		server.Close()

		client := NewHTTPBFFClient(server.URL, BFFTargetMaaS, "", false, nil)
		assert.False(t, client.IsAvailable(context.Background()))
	})
}

func TestHTTPBFFClient_GetBaseURL(t *testing.T) {
	client := NewHTTPBFFClient("http://test:8080/api/v1", BFFTargetMaaS, "", false, nil)
	assert.Equal(t, "http://test:8080/api/v1", client.GetBaseURL())
}

func TestHTTPBFFClient_GetTarget(t *testing.T) {
	client := NewHTTPBFFClient("http://test:8080", BFFTargetGenAI, "", false, nil)
	assert.Equal(t, BFFTargetGenAI, client.GetTarget())
}

func TestHTTPBFFClient_Call_NoResponsePointer(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	}))
	defer server.Close()

	client := NewHTTPBFFClient(server.URL, BFFTargetMaaS, "", false, nil)
	err := client.Call(context.Background(), http.MethodDelete, "/test", nil, nil)

	require.NoError(t, err)
}

func TestHTTPBFFClient_Call_CustomHeaderCannotOverrideAuth(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		tokenValues := r.Header.Values("x-forwarded-access-token")
		assert.Len(t, tokenValues, 1, "auth header must appear exactly once")
		assert.Equal(t, "real-token", tokenValues[0], "auth header must not be overwritten by custom headers")
		assert.Empty(t, r.Header.Values("Authorization"), "Authorization custom header must be skipped")
		assert.Equal(t, "allowed-value", r.Header.Get("x-custom"), "non-conflicting custom headers should pass through")
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	client := newHTTPBFFClient(clientConfig{
		BaseURL:   server.URL,
		Target:    BFFTargetMaaS,
		AuthToken: "real-token",
		CustomHeaders: map[string]string{
			"x-forwarded-access-token": "evil-override",
			"Authorization":            "evil-override",
			"x-custom":                 "allowed-value",
		},
	})
	err := client.Call(context.Background(), http.MethodGet, "/test", nil, nil)
	require.NoError(t, err)
}

func TestHTTPBFFClient_Call_CustomHeaderCannotOverrideAuthEvenWithoutToken(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Empty(t, r.Header.Values("x-forwarded-access-token"), "auth header name must be blocked even when no token is set")
		assert.Empty(t, r.Header.Values("Authorization"), "Authorization custom header must be skipped")
		assert.Equal(t, "allowed-value", r.Header.Get("x-custom"), "non-conflicting custom headers should pass through")
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	client := newHTTPBFFClient(clientConfig{
		BaseURL: server.URL,
		Target:  BFFTargetMaaS,
		CustomHeaders: map[string]string{
			"x-forwarded-access-token": "injected-via-custom",
			"x-custom":                 "allowed-value",
		},
	})
	err := client.Call(context.Background(), http.MethodGet, "/test", nil, nil)
	require.NoError(t, err)
}

func TestHTTPBFFClient_Call_EmptyErrorBody(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusBadRequest)
	}))
	defer server.Close()

	client := NewHTTPBFFClient(server.URL, BFFTargetMaaS, "", false, nil)
	err := client.Call(context.Background(), http.MethodGet, "/test", nil, nil)

	require.Error(t, err)
	var bffErr *BFFClientError
	require.ErrorAs(t, err, &bffErr)
	assert.Equal(t, ErrCodeBadRequest, bffErr.Code)
	// Empty body should fall back to http.StatusText
	assert.Equal(t, "Bad Request", bffErr.Message)
}
