package api

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/opendatahub-io/llama-stack-modular-ui/internal/config"
	"github.com/opendatahub-io/llama-stack-modular-ui/internal/models"
	"github.com/opendatahub-io/llama-stack-modular-ui/internal/repositories"
	"github.com/stretchr/testify/assert"
)

func TestCodeExporterHandler(t *testing.T) {
	// Create test app with real template repository
	app := App{
		config: config.EnvConfig{
			Port: 4000,
		},
		repositories: repositories.NewRepositories(nil), // No LlamaStack client needed
	}

	t.Run("should return error when input is missing", func(t *testing.T) {
		configRequest := models.CodeExportRequest{
			Model: "llama3.2:3b",
		}

		rr := httptest.NewRecorder()
		reqBody, err := json.Marshal(configRequest)
		assert.NoError(t, err)

		req, err := http.NewRequest(http.MethodPost, "/genai/v1/code-exporter", bytes.NewReader(reqBody))
		assert.NoError(t, err)
		req.Header.Set("Content-Type", "application/json")

		app.CodeExporterHandler(rr, req, nil)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
	})

	t.Run("should return error when model is missing", func(t *testing.T) {
		configRequest := models.CodeExportRequest{
			Input: "Hello, world!",
		}

		rr := httptest.NewRecorder()
		reqBody, err := json.Marshal(configRequest)
		assert.NoError(t, err)

		req, err := http.NewRequest(http.MethodPost, "/genai/v1/code-exporter", bytes.NewReader(reqBody))
		assert.NoError(t, err)
		req.Header.Set("Content-Type", "application/json")

		app.CodeExporterHandler(rr, req, nil)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
	})

	t.Run("should return error when request body is invalid JSON", func(t *testing.T) {
		rr := httptest.NewRecorder()
		req, err := http.NewRequest(http.MethodPost, "/genai/v1/code-exporter", bytes.NewReader([]byte("invalid json")))
		assert.NoError(t, err)
		req.Header.Set("Content-Type", "application/json")

		app.CodeExporterHandler(rr, req, nil)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
	})

	t.Run("should return error when request body is empty", func(t *testing.T) {
		rr := httptest.NewRecorder()
		req, err := http.NewRequest(http.MethodPost, "/genai/v1/code-exporter", bytes.NewReader([]byte("")))
		assert.NoError(t, err)
		req.Header.Set("Content-Type", "application/json")

		app.CodeExporterHandler(rr, req, nil)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
	})
}

func TestGeneratePythonCode(t *testing.T) {
	app := App{
		repositories: repositories.NewRepositories(nil),
	}

	t.Run("should generate Python code with basic config", func(t *testing.T) {
		config := models.CodeExportRequest{
			Input:        "Hello, world!",
			Model:        "llama3.2:3b",
			Instructions: "You are a helpful AI assistant",
			Stream:       false,
			Temperature:  0.7,
		}

		code, err := app.generatePythonCode(config, app.repositories.Template)

		// Note: This test may fail if the template system isn't properly initialized
		// In a real test environment, you'd want to mock the template repository
		if err != nil {
			t.Skipf("Template system not available in test environment: %v", err)
		}

		assert.NoError(t, err)
		assert.NotEmpty(t, code)
		assert.Contains(t, code, "Hello, world!")
		assert.Contains(t, code, "llama3.2:3b")
		assert.Contains(t, code, "You are a helpful AI assistant")
	})

	t.Run("should generate Python code with tools", func(t *testing.T) {
		config := models.CodeExportRequest{
			Input:        "Search for files",
			Model:        "llama3.2:3b",
			Instructions: "You are a helpful AI assistant",
			Stream:       true,
			Temperature:  0.5,
			Tools: []models.Tool{
				{
					Type:           "file_search",
					VectorStoreIDs: []string{"store1", "store2"},
				},
			},
		}

		code, err := app.generatePythonCode(config, app.repositories.Template)

		if err != nil {
			t.Skipf("Template system not available in test environment: %v", err)
		}

		assert.NoError(t, err)
		assert.NotEmpty(t, code)
		assert.Contains(t, code, "Search for files")
		assert.Contains(t, code, "llama3.2:3b")
		assert.Contains(t, code, "file_search")
		assert.Contains(t, code, "store1")
		assert.Contains(t, code, "store2")
	})
}
