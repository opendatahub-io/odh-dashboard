package repositories

import (
	"testing"

	"github.com/opendatahub-io/autorag-library/bff/internal/models"
	"github.com/stretchr/testify/assert"
)

func TestTranslateLlamaStackModel(t *testing.T) {
	t.Run("should translate a fully populated model", func(t *testing.T) {
		native := models.LlamaStackNativeModel{
			ID: "llama3.2:3b",
			CustomMetadata: &models.LlamaStackCustomMetadata{
				ModelType:          "llm",
				ProviderID:         "ollama",
				ProviderResourceID: "ollama://models/llama3.2:3b",
			},
		}

		result, ok := translateLlamaStackModel(native)

		assert.True(t, ok)
		assert.Equal(t, "llama3.2:3b", result.ID)
		assert.Equal(t, "llm", result.Type)
		assert.Equal(t, "ollama", result.Provider)
		assert.Equal(t, "ollama://models/llama3.2:3b", result.ResourcePath)
	})

	t.Run("should translate an embedding model", func(t *testing.T) {
		native := models.LlamaStackNativeModel{
			ID: "all-minilm:l6-v2",
			CustomMetadata: &models.LlamaStackCustomMetadata{
				ModelType:          "embedding",
				ProviderID:         "ollama",
				ProviderResourceID: "ollama://models/all-minilm:l6-v2",
			},
		}

		result, ok := translateLlamaStackModel(native)

		assert.True(t, ok)
		assert.Equal(t, "embedding", result.Type)
	})

	t.Run("should skip model with empty ID", func(t *testing.T) {
		native := models.LlamaStackNativeModel{
			ID: "",
			CustomMetadata: &models.LlamaStackCustomMetadata{
				ModelType: "llm",
			},
		}

		_, ok := translateLlamaStackModel(native)

		assert.False(t, ok)
	})

	t.Run("should default type to unknown when custom_metadata is nil", func(t *testing.T) {
		native := models.LlamaStackNativeModel{
			ID:             "some-model",
			CustomMetadata: nil,
		}

		result, ok := translateLlamaStackModel(native)

		assert.True(t, ok)
		assert.Equal(t, "some-model", result.ID)
		assert.Equal(t, "unknown", result.Type)
		assert.Empty(t, result.Provider)
		assert.Empty(t, result.ResourcePath)
	})

	t.Run("should default type to unknown when model_type is empty", func(t *testing.T) {
		native := models.LlamaStackNativeModel{
			ID: "some-model",
			CustomMetadata: &models.LlamaStackCustomMetadata{
				ModelType:  "",
				ProviderID: "ollama",
			},
		}

		result, ok := translateLlamaStackModel(native)

		assert.True(t, ok)
		assert.Equal(t, "unknown", result.Type)
		assert.Equal(t, "ollama", result.Provider)
	})

	t.Run("should accept unexpected model_type values gracefully", func(t *testing.T) {
		native := models.LlamaStackNativeModel{
			ID: "some-model",
			CustomMetadata: &models.LlamaStackCustomMetadata{
				ModelType:  "safety",
				ProviderID: "meta-reference",
			},
		}

		result, ok := translateLlamaStackModel(native)

		assert.True(t, ok)
		assert.Equal(t, "safety", result.Type)
	})

	t.Run("should handle missing optional fields", func(t *testing.T) {
		native := models.LlamaStackNativeModel{
			ID: "minimal-model",
			CustomMetadata: &models.LlamaStackCustomMetadata{
				ModelType: "llm",
				// ProviderID and ProviderResourceID intentionally omitted
			},
		}

		result, ok := translateLlamaStackModel(native)

		assert.True(t, ok)
		assert.Equal(t, "llm", result.Type)
		assert.Empty(t, result.Provider)
		assert.Empty(t, result.ResourcePath)
	})
}
