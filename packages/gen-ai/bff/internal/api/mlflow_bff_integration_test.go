package api

import (
	"bytes"
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/opendatahub-io/gen-ai/internal/config"
	"github.com/opendatahub-io/gen-ai/internal/constants"
	"github.com/opendatahub-io/gen-ai/internal/integrations/bffclient/bffmocks"
	"github.com/opendatahub-io/gen-ai/internal/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestMLflowBFFIntegration_ListPromptsGracefulDegradation verifies that when
// MLflow BFF is unavailable, the handler returns empty prompts with a warning header
// instead of failing the entire request.
func TestMLflowBFFIntegration_ListPromptsGracefulDegradation(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelDebug}))

	// Create mock BFF client factory with MLflow BFF unavailable (returns nil client)
	mockFactory := bffmocks.NewMockClientFactory(logger)

	app := &App{
		config: config.EnvConfig{
			Port: 8143,
		},
		logger:           logger,
		bffClientFactory: mockFactory,
	}

	req, err := http.NewRequest(http.MethodGet, "/api/v1/mlflow/prompts?namespace=test-ns", nil)
	require.NoError(t, err)

	ctx := context.WithValue(req.Context(), constants.NamespaceQueryParameterKey, "test-ns")
	req = req.WithContext(ctx)

	rr := httptest.NewRecorder()

	app.MLflowListPromptsHandler(rr, req, nil)

	assert.Equal(t, http.StatusOK, rr.Code, "should return 200 even when MLflow BFF unavailable")
	assert.Equal(t, "true", rr.Header().Get("X-MLflow-BFF-Unavailable"), "should set warning header")

	var envelope MLflowPromptsEnvelope
	err = json.Unmarshal(rr.Body.Bytes(), &envelope)
	require.NoError(t, err, "response should be valid JSON")

	assert.Empty(t, envelope.Data.Prompts, "should return empty prompts list")
	assert.Equal(t, 0, envelope.Data.TotalCount, "should have zero total count")
}

// TestMLflowBFFIntegration_RegisterPromptUnavailable verifies that when
// MLflow BFF is unavailable for write operations, the handler returns 503.
func TestMLflowBFFIntegration_RegisterPromptUnavailable(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelDebug}))

	mockFactory := bffmocks.NewMockClientFactory(logger)

	app := &App{
		config: config.EnvConfig{
			Port: 8143,
		},
		logger:           logger,
		bffClientFactory: mockFactory,
	}

	promptReq := models.MLflowRegisterPromptRequest{
		Name:     "test-prompt",
		Template: "Hello {{name}}",
	}
	reqBody, err := json.Marshal(promptReq)
	require.NoError(t, err)

	req, err := http.NewRequest(http.MethodPost, "/api/v1/mlflow/prompts?namespace=test-ns", bytes.NewReader(reqBody))
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")

	ctx := context.WithValue(req.Context(), constants.NamespaceQueryParameterKey, "test-ns")
	req = req.WithContext(ctx)

	rr := httptest.NewRecorder()

	app.MLflowRegisterPromptHandler(rr, req, nil)

	assert.Equal(t, http.StatusServiceUnavailable, rr.Code,
		"should return 503 for write operations when MLflow BFF unavailable")
}
