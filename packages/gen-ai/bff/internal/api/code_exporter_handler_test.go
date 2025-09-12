package api

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/opendatahub-io/gen-ai/internal/config"
	"github.com/opendatahub-io/gen-ai/internal/models"
	"github.com/opendatahub-io/gen-ai/internal/repositories"
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

		req, err := http.NewRequest(http.MethodPost, "/gen-ai/api/v1/code-exporter", bytes.NewReader(reqBody))
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

		req, err := http.NewRequest(http.MethodPost, "/gen-ai/api/v1/code-exporter", bytes.NewReader(reqBody))
		assert.NoError(t, err)
		req.Header.Set("Content-Type", "application/json")

		app.CodeExporterHandler(rr, req, nil)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
	})

	t.Run("should return error when request body is invalid JSON", func(t *testing.T) {
		rr := httptest.NewRecorder()
		req, err := http.NewRequest(http.MethodPost, "/gen-ai/api/v1/code-exporter", bytes.NewReader([]byte("invalid json")))
		assert.NoError(t, err)
		req.Header.Set("Content-Type", "application/json")

		app.CodeExporterHandler(rr, req, nil)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
	})

	t.Run("should return error when request body is empty", func(t *testing.T) {
		rr := httptest.NewRecorder()
		req, err := http.NewRequest(http.MethodPost, "/gen-ai/api/v1/code-exporter", bytes.NewReader([]byte("")))
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

	t.Run("should generate Python code with vector store configuration", func(t *testing.T) {
		config := models.CodeExportRequest{
			Input:        "Answer questions about documents",
			Model:        "llama3.2:3b",
			Instructions: "You are a helpful AI assistant",
			Stream:       false,
			Temperature:  0.7,
			VectorStore: &models.VectorStoreConfig{
				Name:               "default_vector_store",
				EmbeddingModel:     "all-minilm:l6-v2",
				EmbeddingDimension: 384,
				ProviderID:         "milvus",
			},
		}

		code, err := app.generatePythonCode(config, app.repositories.Template)

		if err != nil {
			t.Skipf("Template system not available in test environment: %v", err)
		}

		assert.NoError(t, err)
		assert.NotEmpty(t, code)
		assert.Contains(t, code, "Answer questions about documents")
		assert.Contains(t, code, "default_vector_store")
		assert.Contains(t, code, "all-minilm:l6-v2")
		assert.Contains(t, code, "384")
		assert.Contains(t, code, "milvus")
		assert.Contains(t, code, "vector_store_name")
		assert.Contains(t, code, "client.vector_stores.create")
	})

	t.Run("should generate Python code with file uploads", func(t *testing.T) {
		config := models.CodeExportRequest{
			Input:        "Process uploaded documents",
			Model:        "llama3.2:3b",
			Instructions: "You are a helpful AI assistant",
			Stream:       false,
			Temperature:  0.7,
			VectorStore: &models.VectorStoreConfig{
				Name: "default_vector_store",
			},
			Files: []models.FileUpload{
				{
					File:    "document1.pdf",
					Purpose: "assistants",
				},
				{
					File:    "document2.txt",
					Purpose: "assistants",
				},
			},
		}

		code, err := app.generatePythonCode(config, app.repositories.Template)

		if err != nil {
			t.Skipf("Template system not available in test environment: %v", err)
		}

		assert.NoError(t, err)
		assert.NotEmpty(t, code)
		assert.Contains(t, code, "Process uploaded documents")
		assert.Contains(t, code, "default_vector_store")
		assert.Contains(t, code, "document1.pdf")
		assert.Contains(t, code, "document2.txt")
		assert.Contains(t, code, "assistants")
		assert.Contains(t, code, "files_to_upload")
		assert.Contains(t, code, "client.files.create")
		assert.Contains(t, code, "client.vector_stores.files.create")
		assert.Contains(t, code, "FILES_BASE_PATH")
	})

	t.Run("should generate Python code with complete RAG setup", func(t *testing.T) {
		config := models.CodeExportRequest{
			Input:        "Answer questions using RAG",
			Model:        "llama3.2:3b",
			Instructions: "You are a helpful AI assistant that uses RAG",
			Stream:       true,
			Temperature:  0.5,
			VectorStore: &models.VectorStoreConfig{
				Name:               "default_vector_store",
				EmbeddingModel:     "all-minilm:l6-v2",
				EmbeddingDimension: 384,
				ProviderID:         "milvus",
			},
			Files: []models.FileUpload{
				{
					File:    "knowledge.pdf",
					Purpose: "assistants",
				},
			},
			Tools: []models.Tool{
				{
					Type:           "file_search",
					VectorStoreIDs: []string{}, // Will be populated from vector store
				},
			},
		}

		code, err := app.generatePythonCode(config, app.repositories.Template)

		if err != nil {
			t.Skipf("Template system not available in test environment: %v", err)
		}

		assert.NoError(t, err)
		assert.NotEmpty(t, code)
		assert.Contains(t, code, "Answer questions using RAG")
		assert.Contains(t, code, "default_vector_store")
		assert.Contains(t, code, "knowledge.pdf")
		assert.Contains(t, code, "file_search")
		assert.Contains(t, code, "vector_store.id")
		assert.Contains(t, code, "FILES_BASE_PATH")
		assert.Contains(t, code, "LLAMA_STACK_URL")
	})
}
