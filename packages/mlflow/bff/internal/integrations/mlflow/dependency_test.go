package mlflow

import (
	"testing"

	"github.com/opendatahub-io/mlflow-go/mlflow/promptregistry"
	"github.com/stretchr/testify/assert"
)

func TestPromptModelConfigFieldExists(t *testing.T) {
	t.Run("nil by default", func(t *testing.T) {
		p := promptregistry.Prompt{}
		assert.Nil(t, p.ModelConfig)

		pv := promptregistry.PromptVersion{}
		assert.Nil(t, pv.ModelConfig)
	})

	t.Run("populated on Prompt", func(t *testing.T) {
		cfg := &promptregistry.PromptModelConfig{
			Provider:  "openai",
			ModelName: "gpt-4",
		}
		p := promptregistry.Prompt{ModelConfig: cfg}
		assert.NotNil(t, p.ModelConfig)
		assert.Equal(t, "openai", p.ModelConfig.Provider)
		assert.Equal(t, "gpt-4", p.ModelConfig.ModelName)
	})

	t.Run("populated on PromptVersion", func(t *testing.T) {
		cfg := &promptregistry.PromptModelConfig{
			Provider:  "openai",
			ModelName: "gpt-4",
		}
		pv := promptregistry.PromptVersion{ModelConfig: cfg}
		assert.NotNil(t, pv.ModelConfig)
		assert.Equal(t, "openai", pv.ModelConfig.Provider)
		assert.Equal(t, "gpt-4", pv.ModelConfig.ModelName)
	})
}
