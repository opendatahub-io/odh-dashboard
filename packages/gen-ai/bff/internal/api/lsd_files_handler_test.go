package api

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	"github.com/opendatahub-io/gen-ai/internal/config"
	"github.com/opendatahub-io/gen-ai/internal/constants"
	"github.com/opendatahub-io/gen-ai/internal/integrations/llamastack/lsmocks"
	"github.com/opendatahub-io/gen-ai/internal/repositories"
	"github.com/opendatahub-io/gen-ai/internal/testutil"
	"github.com/stretchr/testify/assert"
)

func TestLlamaStackUploadFileHandler(t *testing.T) {
	// Save current working directory
	originalWd, err := os.Getwd()
	assert.NoError(t, err)

	// Change to project root directory so OpenAPI handler can find the YAML file
	projectRoot := filepath.Join(originalWd, "..", "..")
	err = os.Chdir(projectRoot)
	assert.NoError(t, err)

	// Restore original working directory at the end
	defer func() {
		err := os.Chdir(originalWd)
		assert.NoError(t, err)
	}()

	// Create test app with full configuration and middleware chain
	cfg := config.EnvConfig{
		Port:            4000,
		APIPathPrefix:   "/api/v1",
		AuthMethod:      config.AuthMethodUser,         // Use user token auth
		AuthTokenHeader: config.DefaultAuthTokenHeader, // "Authorization"
		AuthTokenPrefix: config.DefaultAuthTokenPrefix, // "Bearer "
		MockLSClient:    true,                          // Use mock LlamaStack client
		LlamaStackURL:   testutil.TestLlamaStackURL,    // Mock LlamaStack URL
		MockK8sClient:   true,                          // Use mock K8s client
	}

	// Create test logger
	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelError}))
	app, err := NewApp(cfg, logger)
	assert.NoError(t, err)

	// Create test server with full middleware chain
	server := httptest.NewServer(app.Routes())
	defer server.Close()

	// Helper function to create multipart form data
	createMultipartFormData := func(filename, content, vectorStoreID, purpose, chunkingType string) ([]byte, string, error) {
		var err error
		var body bytes.Buffer
		writer := multipart.NewWriter(&body)

		// Add file
		if filename != "" {
			fileWriter, err := writer.CreateFormFile("file", filename)
			if err != nil {
				return nil, "", err
			}
			_, err = fileWriter.Write([]byte(content))
			if err != nil {
				return nil, "", err
			}
		}

		// Add form fields
		if vectorStoreID != "" {
			err = writer.WriteField("vector_store_id", vectorStoreID)
			if err != nil {
				return nil, "", err
			}
		}
		if purpose != "" {
			err = writer.WriteField("purpose", purpose)
			if err != nil {
				return nil, "", err
			}
		}
		if chunkingType != "" {
			err = writer.WriteField("chunking_type", chunkingType)
			if err != nil {
				return nil, "", err
			}
		}

		writer.Close()

		return body.Bytes(), writer.FormDataContentType(), nil
	}

	t.Run("should upload file successfully with required parameters", func(t *testing.T) {
		body, contentType, err := createMultipartFormData("test.txt", "Test file content", "vs_test123", "", "")
		assert.NoError(t, err)

		req, err := http.NewRequest(http.MethodPost, "/gen-ai/api/v1/files/upload?namespace=test-namespace", bytes.NewReader(body))
		assert.NoError(t, err)
		req.Header.Set("Content-Type", contentType)

		// Simulate AttachNamespace and AttachLlamaStackClient middleware
		ctx := context.WithValue(req.Context(), constants.NamespaceQueryParameterKey, "default")
		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.TestLlamaStackURL)
		ctx = context.WithValue(ctx, constants.LlamaStackClientKey, llamaStackClient)
		req = req.WithContext(ctx)
		rr := httptest.NewRecorder()
		app.LlamaStackUploadFileHandler(rr, req, nil)

		assert.Equal(t, http.StatusCreated, rr.Code)

		respBody, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()

		var response map[string]interface{}
		err = json.Unmarshal(respBody, &response)
		assert.NoError(t, err)

		// Verify envelope structure
		assert.Contains(t, response, "data")
		data := response["data"].(map[string]interface{})

		// Verify mock response structure
		assert.Contains(t, data, "file_id")
		assert.Equal(t, "file-mock123abc456def", data["file_id"])
		assert.Contains(t, data, "vector_store_file")
	})

	t.Run("should upload file with optional parameters", func(t *testing.T) {
		body, contentType, err := createMultipartFormData("test.txt", "Test file content", "vs_test123", "assistants", "auto")
		assert.NoError(t, err)

		req, err := http.NewRequest(http.MethodPost, "/gen-ai/api/v1/files/upload?namespace=test-namespace", bytes.NewReader(body))
		assert.NoError(t, err)
		req.Header.Set("Content-Type", contentType)

		// Simulate AttachNamespace and AttachLlamaStackClient middleware
		ctx := context.WithValue(req.Context(), constants.NamespaceQueryParameterKey, "default")
		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.TestLlamaStackURL)
		ctx = context.WithValue(ctx, constants.LlamaStackClientKey, llamaStackClient)
		req = req.WithContext(ctx)
		rr := httptest.NewRecorder()
		app.LlamaStackUploadFileHandler(rr, req, nil)

		assert.Equal(t, http.StatusCreated, rr.Code)

		respBody, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()

		var response map[string]interface{}
		err = json.Unmarshal(respBody, &response)
		assert.NoError(t, err)

		// Verify envelope structure
		assert.Contains(t, response, "data")
		data := response["data"].(map[string]interface{})
		assert.Equal(t, "file-mock123abc456def", data["file_id"])

		// Verify vector store file details
		vectorStoreFile := data["vector_store_file"].(map[string]interface{})
		assert.Equal(t, "vs_test123", vectorStoreFile["vector_store_id"])
		assert.Equal(t, "completed", vectorStoreFile["status"])
	})

	t.Run("should return error when file is missing", func(t *testing.T) {
		body, contentType, err := createMultipartFormData("", "", "vs_test123", "", "")
		assert.NoError(t, err)

		req, err := http.NewRequest(http.MethodPost, "/gen-ai/api/v1/files/upload?namespace=test-namespace", bytes.NewReader(body))
		assert.NoError(t, err)
		req.Header.Set("Content-Type", contentType)

		// Simulate AttachNamespace and AttachLlamaStackClient middleware
		ctx := context.WithValue(req.Context(), constants.NamespaceQueryParameterKey, "default")
		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.TestLlamaStackURL)
		ctx = context.WithValue(ctx, constants.LlamaStackClientKey, llamaStackClient)
		req = req.WithContext(ctx)
		rr := httptest.NewRecorder()
		app.LlamaStackUploadFileHandler(rr, req, nil)

		assert.Equal(t, http.StatusBadRequest, rr.Code)

		respBody, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()

		var response map[string]interface{}
		err = json.Unmarshal(respBody, &response)
		assert.NoError(t, err)

		errorObj := response["error"].(map[string]interface{})
		assert.Contains(t, errorObj["message"], "file is required")
	})

	t.Run("should return error when vector_store_id is missing", func(t *testing.T) {
		body, contentType, err := createMultipartFormData("test.txt", "Test content", "", "", "")
		assert.NoError(t, err)

		req, err := http.NewRequest(http.MethodPost, "/gen-ai/api/v1/files/upload?namespace=test-namespace", bytes.NewReader(body))
		assert.NoError(t, err)
		req.Header.Set("Content-Type", contentType)

		// Simulate AttachNamespace and AttachLlamaStackClient middleware
		ctx := context.WithValue(req.Context(), constants.NamespaceQueryParameterKey, "default")
		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.TestLlamaStackURL)
		ctx = context.WithValue(ctx, constants.LlamaStackClientKey, llamaStackClient)
		req = req.WithContext(ctx)
		rr := httptest.NewRecorder()
		app.LlamaStackUploadFileHandler(rr, req, nil)

		assert.Equal(t, http.StatusBadRequest, rr.Code)

		respBody, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()

		var response map[string]interface{}
		err = json.Unmarshal(respBody, &response)
		assert.NoError(t, err)

		errorObj := response["error"].(map[string]interface{})
		assert.Contains(t, errorObj["message"], "vector_store_id is required")
	})

	t.Run("should use unified repository pattern", func(t *testing.T) {
		assert.NotNil(t, app.repositories)
		assert.NotNil(t, app.repositories.Files)

		body, contentType, err := createMultipartFormData("test.txt", "Test content", "vs_test123", "assistants", "")
		assert.NoError(t, err)

		req, err := http.NewRequest(http.MethodPost, "/gen-ai/api/v1/files/upload?namespace=test-namespace", bytes.NewReader(body))
		assert.NoError(t, err)
		req.Header.Set("Content-Type", contentType)

		// Simulate AttachNamespace and AttachLlamaStackClient middleware
		ctx := context.WithValue(req.Context(), constants.NamespaceQueryParameterKey, "default")
		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.TestLlamaStackURL)
		ctx = context.WithValue(ctx, constants.LlamaStackClientKey, llamaStackClient)
		req = req.WithContext(ctx)
		rr := httptest.NewRecorder()
		app.LlamaStackUploadFileHandler(rr, req, nil)

		assert.Equal(t, http.StatusCreated, rr.Code)

		// Verify response structure matches FileUploadResult
		var response map[string]interface{}
		respBody, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()

		err = json.Unmarshal(respBody, &response)
		assert.NoError(t, err)

		// Verify envelope structure
		assert.Contains(t, response, "data")
		data := response["data"].(map[string]interface{})

		// Should have FileUploadResult structure
		assert.Contains(t, data, "file_id")
		assert.Contains(t, data, "vector_store_file")

		// Verify mock file ID
		assert.Equal(t, "file-mock123abc456def", data["file_id"])
	})

	t.Run("should handle static chunking parameters", func(t *testing.T) {
		var body bytes.Buffer
		writer := multipart.NewWriter(&body)

		fileWriter, err := writer.CreateFormFile("file", "test.txt")
		assert.NoError(t, err)
		_, err = fileWriter.Write([]byte("Test content"))
		assert.NoError(t, err)

		err = writer.WriteField("vector_store_id", "vs_test123")
		assert.NoError(t, err)
		err = writer.WriteField("chunking_type", "static")
		assert.NoError(t, err)
		err = writer.WriteField("max_chunk_size_tokens", "512")
		assert.NoError(t, err)
		err = writer.WriteField("chunk_overlap_tokens", "50")
		assert.NoError(t, err)
		writer.Close()

		req, err := http.NewRequest(http.MethodPost, "/gen-ai/api/v1/files/upload?namespace=test-namespace", &body)
		assert.NoError(t, err)
		req.Header.Set("Content-Type", writer.FormDataContentType())

		// Simulate AttachNamespace and AttachLlamaStackClient middleware
		ctx := context.WithValue(req.Context(), constants.NamespaceQueryParameterKey, "default")
		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.TestLlamaStackURL)
		ctx = context.WithValue(ctx, constants.LlamaStackClientKey, llamaStackClient)
		req = req.WithContext(ctx)
		rr := httptest.NewRecorder()
		app.LlamaStackUploadFileHandler(rr, req, nil)

		assert.Equal(t, http.StatusCreated, rr.Code)

		responseBody, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()

		var response map[string]interface{}
		err = json.Unmarshal(responseBody, &response)
		assert.NoError(t, err)

		// Verify envelope structure
		assert.Contains(t, response, "data")
		data := response["data"].(map[string]interface{})
		assert.Equal(t, "file-mock123abc456def", data["file_id"])
	})
}

func TestLlamaStackListFilesHandler(t *testing.T) {
	// Create test app with mock client (lightweight approach)
	llamaStackClientFactory := lsmocks.NewMockClientFactory()
	app := App{
		config: config.EnvConfig{
			Port: 4000,
		},
		llamaStackClientFactory: llamaStackClientFactory,
		repositories:            repositories.NewRepositories(),
	}

	t.Run("successful list files", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, constants.FilesListPath+"?namespace=default", nil)

		// Simulate AttachNamespace and AttachLlamaStackClient middleware
		ctx := context.WithValue(req.Context(), constants.NamespaceQueryParameterKey, "default")
		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.TestLlamaStackURL)
		ctx = context.WithValue(ctx, constants.LlamaStackClientKey, llamaStackClient)
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()
		app.LlamaStackListFilesHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)

		responseBody, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()

		var response map[string]interface{}
		err = json.Unmarshal(responseBody, &response)
		assert.NoError(t, err)

		// Verify envelope structure
		assert.Contains(t, response, "data")
		data := response["data"].([]interface{})
		assert.Len(t, data, 2) // Mock returns 2 files

		// Verify first file structure
		firstFile := data[0].(map[string]interface{})
		assert.Equal(t, "file-mock123abc456def", firstFile["id"])
		assert.Equal(t, "file", firstFile["object"])
		assert.Equal(t, "mock_document.txt", firstFile["filename"])
	})

	t.Run("list files with query parameters", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, constants.FilesListPath+"?namespace=default&limit=10&order=desc&purpose=assistants", nil)

		// Simulate AttachNamespace and AttachLlamaStackClient middleware
		ctx := context.WithValue(req.Context(), constants.NamespaceQueryParameterKey, "default")
		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.TestLlamaStackURL)
		ctx = context.WithValue(ctx, constants.LlamaStackClientKey, llamaStackClient)
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()
		app.LlamaStackListFilesHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)

		responseBody, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()

		var response map[string]interface{}
		err = json.Unmarshal(responseBody, &response)
		assert.NoError(t, err)

		// Verify envelope structure
		assert.Contains(t, response, "data")
		data := response["data"].([]interface{})
		assert.Len(t, data, 2) // Mock returns 2 files regardless of parameters
	})

	t.Run("invalid limit parameter", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, constants.FilesListPath+"?namespace=default&limit=invalid", nil)
		// Simulate AttachNamespace and AttachLlamaStackClient middleware
		ctx := context.WithValue(req.Context(), constants.NamespaceQueryParameterKey, "default")
		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.TestLlamaStackURL)
		ctx = context.WithValue(ctx, constants.LlamaStackClientKey, llamaStackClient)
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()
		app.LlamaStackListFilesHandler(rr, req, nil)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
	})
}

func TestLlamaStackDeleteFileHandler(t *testing.T) {
	// Create test app with mock client (lightweight approach)
	llamaStackClientFactory := lsmocks.NewMockClientFactory()
	app := App{
		config: config.EnvConfig{
			Port: 4000,
		},
		llamaStackClientFactory: llamaStackClientFactory,
		repositories:            repositories.NewRepositories(),
	}

	t.Run("successful delete file", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodDelete, constants.FilesDeletePath+"?namespace=default&file_id=file-test123", nil)
		// Simulate AttachNamespace and AttachLlamaStackClient middleware
		ctx := context.WithValue(req.Context(), constants.NamespaceQueryParameterKey, "default")
		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.TestLlamaStackURL)
		ctx = context.WithValue(ctx, constants.LlamaStackClientKey, llamaStackClient)
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()
		app.LlamaStackDeleteFileHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)

		responseBody, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()

		var response map[string]interface{}
		err = json.Unmarshal(responseBody, &response)
		assert.NoError(t, err)

		// Verify envelope structure
		assert.Contains(t, response, "data")
		data := response["data"].(map[string]interface{})
		assert.Equal(t, "file-test123", data["id"])
		assert.Equal(t, "file", data["object"])
		assert.Equal(t, true, data["deleted"])
	})

	t.Run("missing file_id parameter", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodDelete, constants.FilesDeletePath+"?namespace=default", nil)
		// Simulate AttachNamespace and AttachLlamaStackClient middleware
		ctx := context.WithValue(req.Context(), constants.NamespaceQueryParameterKey, "default")
		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.TestLlamaStackURL)
		ctx = context.WithValue(ctx, constants.LlamaStackClientKey, llamaStackClient)
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()
		app.LlamaStackDeleteFileHandler(rr, req, nil)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
	})

	t.Run("missing LlamaStack client in context", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodDelete, constants.FilesDeletePath+"?namespace=default&file_id=file-test123", nil)
		// Simulate AttachNamespace middleware but skip AttachLlamaStackClient
		ctx := context.WithValue(req.Context(), constants.NamespaceQueryParameterKey, "default")
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()
		app.LlamaStackDeleteFileHandler(rr, req, nil)

		assert.Equal(t, http.StatusInternalServerError, rr.Code)
	})
}
