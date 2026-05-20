package repositories

import (
	"testing"

	"github.com/opendatahub-io/autorag-library/bff/internal/models"
	"github.com/stretchr/testify/assert"
)

func TestTranslateOGXModel(t *testing.T) {
	t.Run("should translate a fully populated model", func(t *testing.T) {
		native := models.OGXNativeModel{
			ID: "llama3.2:3b",
			CustomMetadata: &models.OGXCustomMetadata{
				ModelType:          "llm",
				ProviderID:         "ollama",
				ProviderResourceID: "ollama://models/llama3.2:3b",
			},
		}

		result, ok := translateOGXModel(native)

		assert.True(t, ok)
		assert.Equal(t, "llama3.2:3b", result.ID)
		assert.Equal(t, "llm", result.Type)
		assert.Equal(t, "ollama", result.Provider)
		assert.Equal(t, "ollama://models/llama3.2:3b", result.ResourcePath)
	})

	t.Run("should translate an embedding model", func(t *testing.T) {
		native := models.OGXNativeModel{
			ID: "all-minilm:l6-v2",
			CustomMetadata: &models.OGXCustomMetadata{
				ModelType:          "embedding",
				ProviderID:         "ollama",
				ProviderResourceID: "ollama://models/all-minilm:l6-v2",
			},
		}

		result, ok := translateOGXModel(native)

		assert.True(t, ok)
		assert.Equal(t, "embedding", result.Type)
	})

	t.Run("should skip model with empty ID", func(t *testing.T) {
		native := models.OGXNativeModel{
			ID: "",
			CustomMetadata: &models.OGXCustomMetadata{
				ModelType: "llm",
			},
		}

		_, ok := translateOGXModel(native)

		assert.False(t, ok)
	})

	t.Run("should default type to unknown when custom_metadata is nil", func(t *testing.T) {
		native := models.OGXNativeModel{
			ID:             "some-model",
			CustomMetadata: nil,
		}

		result, ok := translateOGXModel(native)

		assert.True(t, ok)
		assert.Equal(t, "some-model", result.ID)
		assert.Equal(t, "unknown", result.Type)
		assert.Empty(t, result.Provider)
		assert.Empty(t, result.ResourcePath)
	})

	t.Run("should default type to unknown when model_type is empty", func(t *testing.T) {
		native := models.OGXNativeModel{
			ID: "some-model",
			CustomMetadata: &models.OGXCustomMetadata{
				ModelType:  "",
				ProviderID: "ollama",
			},
		}

		result, ok := translateOGXModel(native)

		assert.True(t, ok)
		assert.Equal(t, "unknown", result.Type)
		assert.Equal(t, "ollama", result.Provider)
	})

	t.Run("should accept unexpected model_type values gracefully", func(t *testing.T) {
		native := models.OGXNativeModel{
			ID: "some-model",
			CustomMetadata: &models.OGXCustomMetadata{
				ModelType:  "safety",
				ProviderID: "meta-reference",
			},
		}

		result, ok := translateOGXModel(native)

		assert.True(t, ok)
		assert.Equal(t, "safety", result.Type)
	})

	t.Run("should handle missing optional fields", func(t *testing.T) {
		native := models.OGXNativeModel{
			ID: "minimal-model",
			CustomMetadata: &models.OGXCustomMetadata{
				ModelType: "llm",
				// ProviderID and ProviderResourceID intentionally omitted
			},
		}

		result, ok := translateOGXModel(native)

		assert.True(t, ok)
		assert.Equal(t, "llm", result.Type)
		assert.Empty(t, result.Provider)
		assert.Empty(t, result.ResourcePath)
	})
}
