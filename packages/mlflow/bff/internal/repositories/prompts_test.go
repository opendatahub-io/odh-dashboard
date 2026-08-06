package repositories

import (
	"bytes"
	"log/slog"
	"testing"
	"time"

	"github.com/opendatahub-io/mlflow-go/mlflow/promptregistry"
	mlflowpkg "github.com/opendatahub-io/mlflow/bff/internal/integrations/mlflow"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	tmock "github.com/stretchr/testify/mock"
)

func TestToModelConfigWithValidConfig(t *testing.T) {
	temp := 0.7
	maxTok := 1024
	cfg := &promptregistry.PromptModelConfig{
		Provider:    "openai",
		ModelName:   "gpt-4",
		Temperature: &temp,
		MaxTokens:   &maxTok,
	}

	result := toModelConfig(cfg)

	require.NotNil(t, result)
	assert.Equal(t, "openai", result.Provider)
	assert.Equal(t, "gpt-4", result.ModelName)
	assert.Equal(t, &temp, result.Temperature)
	assert.Equal(t, &maxTok, result.MaxTokens)
}

func TestToModelConfigWithNilConfig(t *testing.T) {
	result := toModelConfig(nil)
	assert.Nil(t, result)
}

func TestToModelConfigWithPartialConfig(t *testing.T) {
	cfg := &promptregistry.PromptModelConfig{
		ModelName: "llama-3",
	}

	result := toModelConfig(cfg)

	require.NotNil(t, result)
	assert.Empty(t, result.Provider)
	assert.Equal(t, "llama-3", result.ModelName)
	assert.Nil(t, result.Temperature)
	assert.Nil(t, result.MaxTokens)
}

func TestToPromptVersionWithValidModelConfig(t *testing.T) {
	temp := 0.5
	pv := &promptregistry.PromptVersion{
		Name:    "test-prompt",
		Version: 1,
		Tags:    map[string]string{tagModelConfig: `{"model_name":"gpt-4"}`},
		ModelConfig: &promptregistry.PromptModelConfig{
			ModelName:   "gpt-4",
			Temperature: &temp,
		},
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	result := toPromptVersion(pv)

	require.NotNil(t, result)
	require.NotNil(t, result.ModelConfig)
	assert.Equal(t, "gpt-4", result.ModelConfig.ModelName)
	assert.Equal(t, &temp, result.ModelConfig.Temperature)
}

func TestToPromptVersionWithNoModelConfig(t *testing.T) {
	pv := &promptregistry.PromptVersion{
		Name:    "test-prompt",
		Version: 1,
		Tags:    map[string]string{},
	}

	result := toPromptVersion(pv)

	require.NotNil(t, result)
	assert.Nil(t, result.ModelConfig)
}

func TestToPromptVersionWithNilInput(t *testing.T) {
	result := toPromptVersion(nil)
	assert.Nil(t, result)
}

func TestWarnMalformedModelConfigLogsWarning(t *testing.T) {
	var buf bytes.Buffer
	testLogger := slog.New(slog.NewTextHandler(&buf, &slog.HandlerOptions{Level: slog.LevelWarn}))
	slog.SetDefault(testLogger)
	t.Cleanup(func() { slog.SetDefault(slog.Default()) })

	tags := map[string]string{tagModelConfig: "not valid json"}
	warnMalformedModelConfig("bad-prompt", tags, nil)

	assert.Contains(t, buf.String(), "malformed model config tag")
	assert.Contains(t, buf.String(), "bad-prompt")
}

func TestWarnMalformedModelConfigNoWarningWhenTagAbsent(t *testing.T) {
	var buf bytes.Buffer
	testLogger := slog.New(slog.NewTextHandler(&buf, &slog.HandlerOptions{Level: slog.LevelWarn}))
	slog.SetDefault(testLogger)
	t.Cleanup(func() { slog.SetDefault(slog.Default()) })

	tags := map[string]string{}
	warnMalformedModelConfig("clean-prompt", tags, nil)

	assert.Empty(t, buf.String())
}

func TestWarnMalformedModelConfigNoWarningWhenConfigPresent(t *testing.T) {
	var buf bytes.Buffer
	testLogger := slog.New(slog.NewTextHandler(&buf, &slog.HandlerOptions{Level: slog.LevelWarn}))
	slog.SetDefault(testLogger)
	t.Cleanup(func() { slog.SetDefault(slog.Default()) })

	tags := map[string]string{tagModelConfig: `{"model_name":"gpt-4"}`}
	cfg := &promptregistry.PromptModelConfig{ModelName: "gpt-4"}
	warnMalformedModelConfig("good-prompt", tags, cfg)

	assert.Empty(t, buf.String())
}

func TestListPromptsWithMalformedModelConfigTag(t *testing.T) {
	var buf bytes.Buffer
	testLogger := slog.New(slog.NewTextHandler(&buf, &slog.HandlerOptions{Level: slog.LevelWarn}))
	slog.SetDefault(testLogger)
	t.Cleanup(func() { slog.SetDefault(slog.Default()) })

	mockClient := &mlflowpkg.MockClient{}
	mockClient.On("ListPrompts", tmock.Anything, tmock.Anything).Return(&promptregistry.PromptList{
		Prompts: []promptregistry.Prompt{
			{
				Name:          "bad-config-prompt",
				LatestVersion: 1,
				Tags:          map[string]string{tagModelConfig: "{invalid json"},
				ModelConfig:   nil,
			},
		},
	}, nil)

	repo := NewPromptsRepository()
	ctx := contextWithMockClient(mockClient)

	result, err := repo.ListPromptsWithClient(ctx, mockClient, "", "", "")

	require.NoError(t, err)
	require.Len(t, result.Prompts, 1)
	assert.Nil(t, result.Prompts[0].ModelConfig)
	assert.Contains(t, buf.String(), "malformed model config tag")
	assert.Contains(t, buf.String(), "bad-config-prompt")
}

func TestListPromptsWithValidModelConfig(t *testing.T) {
	var buf bytes.Buffer
	testLogger := slog.New(slog.NewTextHandler(&buf, &slog.HandlerOptions{Level: slog.LevelWarn}))
	slog.SetDefault(testLogger)
	t.Cleanup(func() { slog.SetDefault(slog.Default()) })

	temp := 0.7
	mockClient := &mlflowpkg.MockClient{}
	mockClient.On("ListPrompts", tmock.Anything, tmock.Anything).Return(&promptregistry.PromptList{
		Prompts: []promptregistry.Prompt{
			{
				Name:          "good-prompt",
				LatestVersion: 1,
				Tags:          map[string]string{tagModelConfig: `{"model_name":"gpt-4"}`},
				ModelConfig: &promptregistry.PromptModelConfig{
					ModelName:   "gpt-4",
					Temperature: &temp,
				},
			},
		},
	}, nil)

	repo := NewPromptsRepository()
	ctx := contextWithMockClient(mockClient)

	result, err := repo.ListPromptsWithClient(ctx, mockClient, "", "", "")

	require.NoError(t, err)
	require.Len(t, result.Prompts, 1)
	require.NotNil(t, result.Prompts[0].ModelConfig)
	assert.Equal(t, "gpt-4", result.Prompts[0].ModelConfig.ModelName)
	assert.Empty(t, buf.String())
}
