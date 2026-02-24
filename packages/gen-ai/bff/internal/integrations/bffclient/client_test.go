package bffclient

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestHTTPBFFClient_Call_Success(t *testing.T) {
	// Create a test server
	expectedResponse := map[string]interface{}{
		"token":     "test-token-123",
		"expiresAt": float64(time.Now().Add(4 * time.Hour).Unix()),
	}

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Verify request
		assert.Equal(t, "POST", r.Method)
		assert.Equal(t, "/api/v1/tokens", r.URL.Path)
		assert.Equal(t, "application/json", r.Header.Get("Content-Type"))
		assert.Equal(t, "Bearer test-auth-token", r.Header.Get("Authorization"))

		// Return response
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(expectedResponse)
	}))
	defer server.Close()

	// Create client
	client := NewHTTPBFFClient(server.URL+"/api/v1", BFFTargetMaaS, "test-auth-token", true, nil)

	// Make request
	requestBody := map[string]string{"expiration": "4h"}
	var response map[string]interface{}
	err := client.Call(context.Background(), "POST", "/tokens", requestBody, &response)

	// Verify
	require.NoError(t, err)
	assert.Equal(t, "test-token-123", response["token"])
}

func TestHTTPBFFClient_Call_NoBody(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "GET", r.Method)
		assert.Equal(t, "/api/v1/models", r.URL.Path)

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"object": "list",
			"data":   []interface{}{},
		})
	}))
	defer server.Close()

	client := NewHTTPBFFClient(server.URL+"/api/v1", BFFTargetMaaS, "test-token", true, nil)

	var response map[string]interface{}
	err := client.Call(context.Background(), "GET", "/models", nil, &response)

	require.NoError(t, err)
	assert.Equal(t, "list", response["object"])
}

func TestHTTPBFFClient_Call_ErrorResponses(t *testing.T) {
	tests := []struct {
		name           string
		statusCode     int
		expectedErrCode string
	}{
		{"BadRequest", http.StatusBadRequest, ErrCodeBadRequest},
		{"Unauthorized", http.StatusUnauthorized, ErrCodeUnauthorized},
		{"Forbidden", http.StatusForbidden, ErrCodeForbidden},
		{"NotFound", http.StatusNotFound, ErrCodeNotFound},
		{"ServiceUnavailable", http.StatusServiceUnavailable, ErrCodeServerUnavailable},
		{"InternalServerError", http.StatusInternalServerError, ErrCodeServerUnavailable},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				w.WriteHeader(tt.statusCode)
				w.Write([]byte("error message"))
			}))
			defer server.Close()

			client := NewHTTPBFFClient(server.URL+"/api/v1", BFFTargetMaaS, "token", true, nil)
			err := client.Call(context.Background(), "GET", "/test", nil, nil)

			require.Error(t, err)
			bffErr, ok := err.(*BFFClientError)
			require.True(t, ok)
			assert.Equal(t, tt.expectedErrCode, bffErr.Code)
			assert.Equal(t, BFFTargetMaaS, bffErr.Target)
		})
	}
}

func TestHTTPBFFClient_Call_ConnectionError(t *testing.T) {
	// Use an invalid URL to simulate connection error
	client := NewHTTPBFFClient("http://localhost:1", BFFTargetMaaS, "token", true, nil)

	err := client.Call(context.Background(), "GET", "/test", nil, nil)

	require.Error(t, err)
	bffErr, ok := err.(*BFFClientError)
	require.True(t, ok)
	assert.Equal(t, ErrCodeConnectionFailed, bffErr.Code)
	assert.Equal(t, BFFTargetMaaS, bffErr.Target)
}

func TestHTTPBFFClient_IsAvailable(t *testing.T) {
	t.Run("Available", func(t *testing.T) {
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.URL.Path == "/api/v1/healthcheck" {
				w.WriteHeader(http.StatusOK)
				return
			}
			w.WriteHeader(http.StatusNotFound)
		}))
		defer server.Close()

		client := NewHTTPBFFClient(server.URL+"/api/v1", BFFTargetMaaS, "", true, nil)
		assert.True(t, client.IsAvailable(context.Background()))
	})

	t.Run("Unavailable", func(t *testing.T) {
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusServiceUnavailable)
		}))
		defer server.Close()

		client := NewHTTPBFFClient(server.URL+"/api/v1", BFFTargetMaaS, "", true, nil)
		assert.False(t, client.IsAvailable(context.Background()))
	})

	t.Run("ConnectionRefused", func(t *testing.T) {
		client := NewHTTPBFFClient("http://localhost:1/api/v1", BFFTargetMaaS, "", true, nil)
		assert.False(t, client.IsAvailable(context.Background()))
	})
}

func TestHTTPBFFClient_GetBaseURL(t *testing.T) {
	client := NewHTTPBFFClient("http://test.svc:8080/api/v1", BFFTargetMaaS, "token", true, nil)
	assert.Equal(t, "http://test.svc:8080/api/v1", client.GetBaseURL())
}

func TestHTTPBFFClient_GetTarget(t *testing.T) {
	client := NewHTTPBFFClient("http://test.svc:8080/api/v1", BFFTargetMaaS, "token", true, nil)
	assert.Equal(t, BFFTargetMaaS, client.GetTarget())
}
