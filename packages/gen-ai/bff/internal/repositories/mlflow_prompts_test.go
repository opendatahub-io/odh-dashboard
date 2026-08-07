package repositories

import (
	"bytes"
	"log/slog"
	"testing"
	"time"

	"github.com/opendatahub-io/mlflow-go/mlflow/promptregistry"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestToMLflowModelConfigWithValidConfig(t *testing.T) {
	temp := 0.7
	maxTok := 1024
	cfg := &promptregistry.PromptModelConfig{
		Provider:    "openai",
		ModelName:   "gpt-4",
		Temperature: &temp,
		MaxTokens:   &maxTok,
	}

	result := toMLflowModelConfig(cfg)

	require.NotNil(t, result)
	assert.Equal(t, "openai", result.Provider)
	assert.Equal(t, "gpt-4", result.ModelName)
	assert.Equal(t, &temp, result.Temperature)
	assert.Equal(t, &maxTok, result.MaxTokens)
}

func TestToMLflowModelConfigWithNilConfig(t *testing.T) {
	result := toMLflowModelConfig(nil)
	assert.Nil(t, result)
}

func TestToMLflowModelConfigWithPartialConfig(t *testing.T) {
	cfg := &promptregistry.PromptModelConfig{
		ModelName: "llama-3",
	}

	result := toMLflowModelConfig(cfg)

	require.NotNil(t, result)
	assert.Empty(t, result.Provider)
	assert.Equal(t, "llama-3", result.ModelName)
	assert.Nil(t, result.Temperature)
	assert.Nil(t, result.MaxTokens)
}

func TestToMLflowPromptVersionWithValidModelConfig(t *testing.T) {
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

	result := toMLflowPromptVersion(pv, "default")

	require.NotNil(t, result)
	require.NotNil(t, result.ModelConfig)
	assert.Equal(t, "gpt-4", result.ModelConfig.ModelName)
	assert.Equal(t, &temp, result.ModelConfig.Temperature)
}

func TestToMLflowPromptVersionWithNoModelConfig(t *testing.T) {
	pv := &promptregistry.PromptVersion{
		Name:    "test-prompt",
		Version: 1,
		Tags:    map[string]string{},
	}

	result := toMLflowPromptVersion(pv, "default")

	require.NotNil(t, result)
	assert.Nil(t, result.ModelConfig)
}

func TestGenAIWarnMalformedModelConfigLogsWarning(t *testing.T) {
	var buf bytes.Buffer
	testLogger := slog.New(slog.NewTextHandler(&buf, &slog.HandlerOptions{Level: slog.LevelWarn}))
	slog.SetDefault(testLogger)
	t.Cleanup(func() { slog.SetDefault(slog.Default()) })

	tags := map[string]string{tagModelConfig: "not valid json"}
	warnMalformedModelConfig("bad-prompt", tags, nil)

	assert.Contains(t, buf.String(), "malformed model config tag")
	assert.Contains(t, buf.String(), "bad-prompt")
}

func TestGenAIWarnMalformedModelConfigNoWarningWhenTagAbsent(t *testing.T) {
	var buf bytes.Buffer
	testLogger := slog.New(slog.NewTextHandler(&buf, &slog.HandlerOptions{Level: slog.LevelWarn}))
	slog.SetDefault(testLogger)
	t.Cleanup(func() { slog.SetDefault(slog.Default()) })

	tags := map[string]string{}
	warnMalformedModelConfig("clean-prompt", tags, nil)

	assert.Empty(t, buf.String())
}

func TestGenAIWarnMalformedModelConfigNoWarningWhenConfigPresent(t *testing.T) {
	var buf bytes.Buffer
	testLogger := slog.New(slog.NewTextHandler(&buf, &slog.HandlerOptions{Level: slog.LevelWarn}))
	slog.SetDefault(testLogger)
	t.Cleanup(func() { slog.SetDefault(slog.Default()) })

	tags := map[string]string{tagModelConfig: `{"model_name":"gpt-4"}`}
	cfg := &promptregistry.PromptModelConfig{ModelName: "gpt-4"}
	warnMalformedModelConfig("good-prompt", tags, cfg)

	assert.Empty(t, buf.String())
}
