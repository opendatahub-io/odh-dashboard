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

// minimalInlineConfig returns the smallest valid inline config for use in tests.
func minimalInlineConfig() GuardrailsOptions {
	return GuardrailsOptions{
		Config: &InlineGuardrailConfig{
			Models: []InlineGuardrailModel{
				{
					Type:   "main",
					Engine: "openai",
					Parameters: map[string]interface{}{
						"openai_api_base": "http://llama-guard.svc/v1",
						"model_name":      "llama-guard-3",
						"api_key":         "test-key",
					},
				},
			},
			Rails: InlineGuardrailRails{
				Input: &InlineGuardrailRailFlows{Flows: []string{FlowSelfCheckInput}},
			},
		},
	}
}

func TestCheckGuardrails_Success(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, http.MethodPost, r.Method)
		assert.Equal(t, GuardrailChecksPath, r.URL.Path)
		assert.Equal(t, "application/json", r.Header.Get("Content-Type"))
		assert.Equal(t, "Bearer test-token", r.Header.Get("Authorization"))

		var req GuardrailCheckRequest
		err := json.NewDecoder(r.Body).Decode(&req)
		require.NoError(t, err)
		assert.NotNil(t, req.Guardrails.Config, "inline config must be present")
		assert.Equal(t, RoleUser, req.Messages[0].Role)
		assert.Equal(t, "hello world", req.Messages[0].Content)

		resp := GuardrailCheckResponse{Status: StatusSuccess}
		w.Header().Set("Content-Type", "application/json")
		require.NoError(t, json.NewEncoder(w).Encode(resp))
	}))
	defer server.Close()

	client := NewNemoGuardrailsClient(server.URL, "test-token", true, nil)
	resp, err := client.CheckGuardrails(context.Background(), "hello world", minimalInlineConfig(), RoleUser)

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
		require.NoError(t, json.NewEncoder(w).Encode(resp))
	}))
	defer server.Close()

	client := NewNemoGuardrailsClient(server.URL, "test-token", true, nil)
	resp, err := client.CheckGuardrails(context.Background(), "malicious input", minimalInlineConfig(), RoleUser)

	require.NoError(t, err)
	assert.Equal(t, StatusBlocked, resp.Status)
	assert.Equal(t, StatusBlocked, resp.RailsStatus["self_check_input"].Status)
}

func TestCheckGuardrails_InlineConfig(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var req GuardrailCheckRequest
		err := json.NewDecoder(r.Body).Decode(&req)
		require.NoError(t, err)

		require.NotNil(t, req.Guardrails.Config, "inline config must be present")
		assert.Len(t, req.Guardrails.Config.Models, 1)
		assert.Equal(t, "main", req.Guardrails.Config.Models[0].Type)
		assert.Equal(t, RoleAssistant, req.Messages[0].Role)

		resp := GuardrailCheckResponse{Status: StatusSuccess}
		w.Header().Set("Content-Type", "application/json")
		require.NoError(t, json.NewEncoder(w).Encode(resp))
	}))
	defer server.Close()

	opts := GuardrailsOptions{
		Config: &InlineGuardrailConfig{
			Models: []InlineGuardrailModel{
				{
					Type:   "main",
					Engine: "openai",
					Parameters: map[string]interface{}{
						"openai_api_base": "http://llama-guard.svc/v1",
						"model_name":      "llama-guard-3",
						"api_key":         "test-key",
					},
				},
			},
			Rails: InlineGuardrailRails{
				Output: &InlineGuardrailRailFlows{Flows: []string{FlowSelfCheckOutput}},
			},
		},
	}

	client := NewNemoGuardrailsClient(server.URL, "test-token", true, nil)
	resp, err := client.CheckGuardrails(context.Background(), "assistant response text", opts, RoleAssistant)

	require.NoError(t, err)
	assert.Equal(t, StatusSuccess, resp.Status)
}

func TestCheckGuardrails_EmptyInput(t *testing.T) {
	client := NewNemoGuardrailsClient("http://unused", "", true, nil)
	_, err := client.CheckGuardrails(context.Background(), "", minimalInlineConfig(), RoleUser)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "input is required")
}

func TestCheckGuardrails_NilConfig(t *testing.T) {
	client := NewNemoGuardrailsClient("http://unused", "", true, nil)
	_, err := client.CheckGuardrails(context.Background(), "hello", GuardrailsOptions{Config: nil}, RoleUser)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "inline guardrail config")
}

func TestCheckGuardrails_EmptyModels(t *testing.T) {
	client := NewNemoGuardrailsClient("http://unused", "", true, nil)
	opts := GuardrailsOptions{Config: &InlineGuardrailConfig{}} // no models
	_, err := client.CheckGuardrails(context.Background(), "hello", opts, RoleUser)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "inline guardrail config")
}

func TestCheckGuardrails_ServerError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
		_, _ = w.Write([]byte(`{"error":"internal server error"}`))
	}))
	defer server.Close()

	client := NewNemoGuardrailsClient(server.URL, "test-token", true, nil)
	_, err := client.CheckGuardrails(context.Background(), "hello", minimalInlineConfig(), RoleUser)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "status 500")
}

func TestCheckGuardrails_InvalidJSON(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`not-json`))
	}))
	defer server.Close()

	client := NewNemoGuardrailsClient(server.URL, "test-token", true, nil)
	_, err := client.CheckGuardrails(context.Background(), "hello", minimalInlineConfig(), RoleUser)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "failed to parse response")
}

func TestCheckGuardrails_ConnectionRefused(t *testing.T) {
	client := NewNemoGuardrailsClient("http://localhost:1", "test-token", true, nil)
	_, err := client.CheckGuardrails(context.Background(), "hello", minimalInlineConfig(), RoleUser)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "guardrail check request failed")
}

func TestCheckGuardrails_NoAuthToken(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Empty(t, r.Header.Get("Authorization"))
		resp := GuardrailCheckResponse{Status: StatusSuccess}
		w.Header().Set("Content-Type", "application/json")
		require.NoError(t, json.NewEncoder(w).Encode(resp))
	}))
	defer server.Close()

	client := NewNemoGuardrailsClient(server.URL, "", true, nil)
	resp, err := client.CheckGuardrails(context.Background(), "hello", minimalInlineConfig(), RoleUser)
	require.NoError(t, err)
	assert.Equal(t, StatusSuccess, resp.Status)
}

func TestCheckGuardrails_CancelledContext(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		resp := GuardrailCheckResponse{Status: StatusSuccess}
		w.Header().Set("Content-Type", "application/json")
		require.NoError(t, json.NewEncoder(w).Encode(resp))
	}))
	defer server.Close()

	ctx, cancel := context.WithCancel(context.Background())
	cancel()

	client := NewNemoGuardrailsClient(server.URL, "test-token", true, nil)
	_, err := client.CheckGuardrails(ctx, "hello", minimalInlineConfig(), RoleUser)
	assert.Error(t, err)
}
