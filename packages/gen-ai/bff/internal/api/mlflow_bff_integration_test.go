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
	"github.com/opendatahub-io/gen-ai/internal/integrations/bffclient"
	"github.com/opendatahub-io/gen-ai/internal/integrations/bffclient/bffmocks"
	"github.com/opendatahub-io/gen-ai/internal/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestMLflowBFFIntegration_ListPromptsGracefulDegradation verifies that when
// MLflow BFF is unavailable (not configured), the middleware attaches a nil client
// and the handler gracefully degrades by returning empty prompts with a warning header.
func TestMLflowBFFIntegration_ListPromptsGracefulDegradation(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelDebug}))

	// Create BFF client config with MLflow target NOT configured
	// (by not including MLflow in the ServiceConfigs map)
	bffConfig := &bffclient.BFFClientConfig{
		MockBFFClients: true,
		ServiceConfigs: map[bffclient.BFFTarget]*bffclient.BFFServiceConfig{
			// Intentionally exclude BFFTargetMLflow to simulate unconfigured target
		},
	}

	mockFactory := bffmocks.NewMockClientFactoryWithConfig(bffConfig, nil, false, logger)

	app := &App{
		config: config.EnvConfig{
			Port: 8143,
		},
		logger:           logger,
		bffClientFactory: mockFactory,
	}

	req, err := http.NewRequest(http.MethodGet, "/api/v1/mlflow/prompts?namespace=test-ns", nil)
	require.NoError(t, err)

	// Set up context with namespace and trace logger (required by middleware)
	ctx := context.WithValue(req.Context(), constants.NamespaceQueryParameterKey, "test-ns")
	ctx = context.WithValue(ctx, constants.TraceLoggerKey, logger)
	req = req.WithContext(ctx)

	rr := httptest.NewRecorder()

	// Exercise the full middleware → handler path
	handler := app.AttachBFFMLflowClient(app.MLflowListPromptsHandler)
	handler(rr, req, nil)

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

	// Create BFF client config with MLflow target NOT configured
	// (by not including MLflow in the ServiceConfigs map)
	bffConfig := &bffclient.BFFClientConfig{
		MockBFFClients: true,
		ServiceConfigs: map[bffclient.BFFTarget]*bffclient.BFFServiceConfig{
			// Intentionally exclude BFFTargetMLflow to simulate unconfigured target
		},
	}

	mockFactory := bffmocks.NewMockClientFactoryWithConfig(bffConfig, nil, false, logger)

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

	// Use middleware wrapper to properly test graceful degradation
	handler := app.AttachBFFMLflowClient(app.MLflowRegisterPromptHandler)
	handler(rr, req, nil)

	assert.Equal(t, http.StatusServiceUnavailable, rr.Code,
		"should return 503 for write operations when MLflow BFF unavailable")
}
