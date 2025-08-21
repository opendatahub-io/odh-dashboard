package api

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/opendatahub-io/llama-stack-modular-ui/internal/config"
	"github.com/opendatahub-io/llama-stack-modular-ui/internal/integrations/llamastack/lsmocks"
	"github.com/opendatahub-io/llama-stack-modular-ui/internal/models"
	"github.com/opendatahub-io/llama-stack-modular-ui/internal/repositories"
	"github.com/stretchr/testify/assert"
)

func TestCodeExporterHandler(t *testing.T) {
	// Create test app with mock client and mock template repository
	app := App{
		config: config.EnvConfig{
			Port:         4000,
			MockLSClient: true,
		},
		repositories: repositories.NewRepositories(lsmocks.NewMockLlamaStackClient()),
	}

	t.Run("should return Python code for basic config successfully", func(t *testing.T) {
		configRequest := models.CodeExportRequest{
			Input: "Hello, world!",
			Model: "llama3.2:3b",
		}

		rr := httptest.NewRecorder()
		reqBody, err := json.Marshal(configRequest)
		assert.NoError(t, err)

		req, err := http.NewRequest(http.MethodPost, "/genai/v1/code-exporter", bytes.NewReader(reqBody))
		assert.NoError(t, err)
		req.Header.Set("Content-Type", "application/json")

		app.CodeExporterHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)
		assert.Equal(t, "text/plain; charset=utf-8", rr.Header().Get("Content-Type"))

		body, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()

		bodyStr := string(body)
		assert.NotEmpty(t, bodyStr)
		assert.Contains(t, bodyStr, "Hello, this is a mock response")
		assert.Contains(t, bodyStr, "llama3.2:3b")
		assert.Contains(t, bodyStr, "# Llama Stack Quickstart Script")
	})

	t.Run("should return Python code for complex config with all fields", func(t *testing.T) {
		configRequest := models.CodeExportRequest{
			Input:        "Complex input",
			Model:        "advanced-model",
			Instructions: "System instructions",
			Stream:       true,
			Temperature:  0.8,
			Tools: []models.Tool{
				{
					Type:           "file_search",
					VectorStoreIDs: []string{"store1", "store2"},
				},
			},
		}

		rr := httptest.NewRecorder()
		reqBody, err := json.Marshal(configRequest)
		assert.NoError(t, err)

		req, err := http.NewRequest(http.MethodPost, "/genai/v1/code-exporter", bytes.NewReader(reqBody))
		assert.NoError(t, err)
		req.Header.Set("Content-Type", "application/json")

		app.CodeExporterHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)
		assert.Equal(t, "text/plain; charset=utf-8", rr.Header().Get("Content-Type"))

		body, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()

		bodyStr := string(body)
		assert.NotEmpty(t, bodyStr)
		assert.Contains(t, bodyStr, "Hello, this is a mock response")
		assert.Contains(t, bodyStr, "llama3.2:3b")
		assert.Contains(t, bodyStr, "You are a helpful AI assistant. This is a mock response")
		assert.Contains(t, bodyStr, "file_search")
		assert.Contains(t, bodyStr, "mock_store_1")
		assert.Contains(t, bodyStr, "mock_store_2")
	})
}
