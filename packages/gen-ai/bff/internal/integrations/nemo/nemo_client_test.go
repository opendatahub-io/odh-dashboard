package nemo

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestCheckGuardrails_Success(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, http.MethodPost, r.Method)
		assert.Equal(t, GuardrailChecksPath, r.URL.Path)
		assert.Equal(t, "application/json", r.Header.Get("Content-Type"))
		assert.Equal(t, "Bearer test-token", r.Header.Get("Authorization"))

		var req GuardrailCheckRequest
		err := json.NewDecoder(r.Body).Decode(&req)
		require.NoError(t, err)
		assert.Equal(t, "test-config", req.Guardrails.ConfigID)
		assert.Equal(t, "hello world", req.Messages[0].Content)

		resp := GuardrailCheckResponse{Status: StatusSuccess}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(resp)
	}))
	defer server.Close()

	client := NewNemoGuardrailsClient(server.URL, "test-token", true, nil)
	resp, err := client.CheckGuardrails(context.Background(), "hello world", "test-config")

	require.NoError(t, err)
	assert.Equal(t, StatusSuccess, resp.Status)
}

func TestCheckGuardrails_Blocked(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		resp := GuardrailCheckResponse{
			Status: StatusBlocked,
			RailsStatus: map[string]RailStatus{
				"self_check_input": {Status: StatusBlocked},
			},
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(resp)
	}))
	defer server.Close()

	client := NewNemoGuardrailsClient(server.URL, "test-token", true, nil)
	resp, err := client.CheckGuardrails(context.Background(), "malicious input", "test-config")

	require.NoError(t, err)
	assert.Equal(t, StatusBlocked, resp.Status)
	assert.Equal(t, StatusBlocked, resp.RailsStatus["self_check_input"].Status)
}

func TestCheckGuardrails_EmptyInput(t *testing.T) {
	client := NewNemoGuardrailsClient("http://unused", "", true, nil)
	_, err := client.CheckGuardrails(context.Background(), "", "test-config")
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "input is required")
}

func TestCheckGuardrails_EmptyConfigID(t *testing.T) {
	client := NewNemoGuardrailsClient("http://unused", "", true, nil)
	_, err := client.CheckGuardrails(context.Background(), "hello", "")
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "config_id is required")
}

func TestCheckGuardrails_ServerError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(`{"error":"internal server error"}`))
	}))
	defer server.Close()

	client := NewNemoGuardrailsClient(server.URL, "test-token", true, nil)
	_, err := client.CheckGuardrails(context.Background(), "hello", "test-config")
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "status 500")
}

func TestCheckGuardrails_InvalidJSON(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`not-json`))
	}))
	defer server.Close()

	client := NewNemoGuardrailsClient(server.URL, "test-token", true, nil)
	_, err := client.CheckGuardrails(context.Background(), "hello", "test-config")
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "failed to parse response")
}

func TestCheckGuardrails_ConnectionRefused(t *testing.T) {
	client := NewNemoGuardrailsClient("http://localhost:1", "test-token", true, nil)
	_, err := client.CheckGuardrails(context.Background(), "hello", "test-config")
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "guardrail check request failed")
}

func TestCheckGuardrails_NoAuthToken(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Empty(t, r.Header.Get("Authorization"))
		resp := GuardrailCheckResponse{Status: StatusSuccess}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(resp)
	}))
	defer server.Close()

	client := NewNemoGuardrailsClient(server.URL, "", true, nil)
	resp, err := client.CheckGuardrails(context.Background(), "hello", "test-config")
	require.NoError(t, err)
	assert.Equal(t, StatusSuccess, resp.Status)
}

func TestCheckGuardrails_CancelledContext(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		resp := GuardrailCheckResponse{Status: StatusSuccess}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(resp)
	}))
	defer server.Close()

	ctx, cancel := context.WithCancel(context.Background())
	cancel()

	client := NewNemoGuardrailsClient(server.URL, "test-token", true, nil)
	_, err := client.CheckGuardrails(ctx, "hello", "test-config")
	assert.Error(t, err)
}
