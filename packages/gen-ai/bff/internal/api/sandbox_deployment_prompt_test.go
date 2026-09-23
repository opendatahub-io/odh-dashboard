package api

import (
	"context"
	"encoding/json"
	"testing"

	"github.com/opendatahub-io/gen-ai/internal/constants"
	"github.com/opendatahub-io/gen-ai/internal/integrations/bffclient"
	"github.com/opendatahub-io/gen-ai/internal/integrations/bffclient/bffmocks"
	"github.com/opendatahub-io/gen-ai/internal/models"
	"github.com/stretchr/testify/require"
)

func TestResolveSandboxSystemPromptLoadsAndRendersMLflowSystemMessage(t *testing.T) {
	mlflowClient := bffmocks.NewMockBFFClient(bffclient.BFFTargetMLflow)
	mlflowClient.CallHandler = func(_ context.Context, method, path string, _ interface{}, response interface{}) error {
		require.Equal(t, "GET", method)
		require.Equal(t, "/prompts/support-agent?workspace=test-namespace&version=1", path)
		return json.Unmarshal([]byte(`{
			"data": {
				"name": "support-agent",
				"version": 1,
				"messages": [{"role": "system", "content": "You help {{ audience }}."}]
			}
		}`), response)
	}
	ctx := context.WithValue(
		context.Background(),
		constants.BFFClientKey(constants.BFFTarget(bffclient.BFFTargetMLflow)),
		mlflowClient,
	)
	app := &App{}

	prompt, err := app.resolveSandboxSystemPrompt(ctx, "test-namespace", &models.SystemPromptReference{
		Name:    "support-agent",
		Source:  "mlflow",
		Version: "1",
		Variables: map[string]models.PromptVariable{
			"audience": {Text: "platform administrators"},
		},
	})

	require.NoError(t, err)
	require.Contains(t, prompt, "platform administrators")
}

func TestResolveSandboxSystemPromptRejectsPromptWithoutSystemMessage(t *testing.T) {
	mlflowClient := bffmocks.NewMockBFFClient(bffclient.BFFTargetMLflow)
	mlflowClient.CallHandler = func(_ context.Context, _, _ string, _ interface{}, response interface{}) error {
		response.(*struct {
			Data models.MLflowPromptVersion `json:"data"`
		}).Data = models.MLflowPromptVersion{
			Name:     "no-system-message",
			Version:  1,
			Messages: []models.MLflowMessage{{Role: "user", Content: "Hello"}},
		}
		return nil
	}
	ctx := context.WithValue(
		context.Background(),
		constants.BFFClientKey(constants.BFFTarget(bffclient.BFFTargetMLflow)),
		mlflowClient,
	)

	_, err := (&App{}).resolveSandboxSystemPrompt(ctx, "test-namespace", &models.SystemPromptReference{
		Name: "no-system-message", Source: "mlflow",
	})

	require.ErrorContains(t, err, "has no system message")
}
