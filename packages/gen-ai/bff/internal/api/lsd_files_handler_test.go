package api

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	"github.com/openai/openai-go/v2"
	"github.com/opendatahub-io/gen-ai/internal/cache"
	"github.com/opendatahub-io/gen-ai/internal/config"
	"github.com/opendatahub-io/gen-ai/internal/constants"
	"github.com/opendatahub-io/gen-ai/internal/integrations/kubernetes/k8smocks"
	"github.com/opendatahub-io/gen-ai/internal/integrations/llamastack"
	"github.com/opendatahub-io/gen-ai/internal/integrations/llamastack/lsmocks"
	"github.com/opendatahub-io/gen-ai/internal/integrations/maas/maasmocks"
	"github.com/opendatahub-io/gen-ai/internal/integrations/mcp/mcpmocks"
	"github.com/opendatahub-io/gen-ai/internal/repositories"
	"github.com/opendatahub-io/gen-ai/internal/services"
	"github.com/opendatahub-io/gen-ai/internal/testutil"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestLlamaStackUploadFileHandler(t *testing.T) {
	// Save current working directory
	originalWd, err := os.Getwd()
	require.NoError(t, err)

	// Change to project root directory so OpenAPI handler can find the YAML file
	projectRoot := filepath.Join(originalWd, "..", "..")
	err = os.Chdir(projectRoot)
	require.NoError(t, err)

	// Restore original working directory at the end
	defer func() {
		err := os.Chdir(originalWd)
		require.NoError(t, err)
	}()

	// Create test app with full configuration and middleware chain
	cfg := config.EnvConfig{
		Port:            4000,
		APIPathPrefix:   "/api/v1",
		StaticAssetsDir: "static",                      // Set static assets directory
		AuthMethod:      config.AuthMethodUser,         // Use user token auth
		AuthTokenHeader: config.DefaultAuthTokenHeader, // "Authorization"
		AuthTokenPrefix: config.DefaultAuthTokenPrefix, // "Bearer "
		MockLSClient:    true,                          // Use mock LlamaStack client
		LlamaStackURL:   testutil.TestLlamaStackURL,    // Mock LlamaStack URL
		MockK8sClient:   false,                         // Use shared envtest from TestMain
	}

	// Create test logger
	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelError}))

	// Create k8s factory using shared test environment
	k8sFactory, err := k8smocks.NewTokenClientFactory(testK8sClient, testCfg, logger)
	require.NoError(t, err)

	// Initialize OpenAPI handler
	openAPIHandler, err := NewOpenAPIHandler(logger)
	require.NoError(t, err)

	// Initialize shared memory store
	memStore := cache.NewMemoryStore()

	// Initialize file upload job tracker
	fileUploadJobTracker := services.NewFileUploadJobTracker(memStore, logger)

	// Create app manually using shared envtest
	app := &App{
		config:                  cfg,
		logger:                  logger,
		repositories:            repositories.NewRepositories(),
		openAPI:                 openAPIHandler,
		kubernetesClientFactory: k8sFactory,
		llamaStackClientFactory: lsmocks.NewMockClientFactory(),
		maasClientFactory:       maasmocks.NewMockClientFactory(),
		mcpClientFactory:        mcpmocks.NewMockedMCPClientFactory(cfg, logger),
		dashboardNamespace:      "opendatahub",
		memoryStore:             memStore,
		rootCAs:                 nil,
		clusterDomain:           "",
		fileUploadJobTracker:    fileUploadJobTracker,
		testEnvState:            nil, // Not using per-app envtest
	}

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
		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.TestLlamaStackURL, "token-mock123abc456def", false, nil, "/v1")
		ctx = context.WithValue(ctx, constants.LlamaStackClientKey, llamaStackClient)
		req = req.WithContext(ctx)
		rr := httptest.NewRecorder()
		app.LlamaStackUploadFileHandler(rr, req, nil)

		// Async upload returns 202 Accepted with job_id
		assert.Equal(t, http.StatusAccepted, rr.Code)

		respBody, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()

		var response map[string]interface{}
		err = json.Unmarshal(respBody, &response)
		assert.NoError(t, err)

		// Verify envelope structure
		assert.Contains(t, response, "data")
		data := response["data"].(map[string]interface{})

		// Verify async job response structure
		assert.Contains(t, data, "job_id")
		assert.Contains(t, data, "status")
		assert.Equal(t, "pending", data["status"])
		assert.NotEmpty(t, data["job_id"])
	})

	t.Run("should upload file with optional parameters", func(t *testing.T) {
		body, contentType, err := createMultipartFormData("test.txt", "Test file content", "vs_test123", "assistants", "auto")
		assert.NoError(t, err)

		req, err := http.NewRequest(http.MethodPost, "/gen-ai/api/v1/files/upload?namespace=test-namespace", bytes.NewReader(body))
		assert.NoError(t, err)
		req.Header.Set("Content-Type", contentType)

		// Simulate AttachNamespace and AttachLlamaStackClient middleware
		ctx := context.WithValue(req.Context(), constants.NamespaceQueryParameterKey, "default")
		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.TestLlamaStackURL, "token-mock123abc456def", false, nil, "/v1")
		ctx = context.WithValue(ctx, constants.LlamaStackClientKey, llamaStackClient)
		req = req.WithContext(ctx)
		rr := httptest.NewRecorder()
		app.LlamaStackUploadFileHandler(rr, req, nil)

		// Async upload returns 202 Accepted
		assert.Equal(t, http.StatusAccepted, rr.Code)

		respBody, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()

		var response map[string]interface{}
		err = json.Unmarshal(respBody, &response)
		assert.NoError(t, err)

		// Verify envelope structure
		assert.Contains(t, response, "data")
		data := response["data"].(map[string]interface{})

		// Verify async job response
		assert.Contains(t, data, "job_id")
		assert.Contains(t, data, "status")
		assert.Equal(t, "pending", data["status"])
	})

	t.Run("should return error when file is missing", func(t *testing.T) {
		body, contentType, err := createMultipartFormData("", "", "vs_test123", "", "")
		assert.NoError(t, err)

		req, err := http.NewRequest(http.MethodPost, "/gen-ai/api/v1/files/upload?namespace=test-namespace", bytes.NewReader(body))
		assert.NoError(t, err)
		req.Header.Set("Content-Type", contentType)

		// Simulate AttachNamespace and AttachLlamaStackClient middleware
		ctx := context.WithValue(req.Context(), constants.NamespaceQueryParameterKey, "default")
		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.TestLlamaStackURL, "token-mock123abc456def", false, nil, "/v1")
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
		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.TestLlamaStackURL, "token-mock123abc456def", false, nil, "/v1")
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
		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.TestLlamaStackURL, "token-mock123abc456def", false, nil, "/v1")
		ctx = context.WithValue(ctx, constants.LlamaStackClientKey, llamaStackClient)
		req = req.WithContext(ctx)
		rr := httptest.NewRecorder()
		app.LlamaStackUploadFileHandler(rr, req, nil)

		// Async upload returns 202 Accepted
		assert.Equal(t, http.StatusAccepted, rr.Code)

		// Verify response structure matches async job response
		var response map[string]interface{}
		respBody, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()

		err = json.Unmarshal(respBody, &response)
		assert.NoError(t, err)

		// Verify envelope structure
		assert.Contains(t, response, "data")
		data := response["data"].(map[string]interface{})

		// Should have async job response structure
		assert.Contains(t, data, "job_id")
		assert.Contains(t, data, "status")
		assert.Equal(t, "pending", data["status"])
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
		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.TestLlamaStackURL, "token-mock", false, nil, "/v1")
		ctx = context.WithValue(ctx, constants.LlamaStackClientKey, llamaStackClient)
		req = req.WithContext(ctx)
		rr := httptest.NewRecorder()
		app.LlamaStackUploadFileHandler(rr, req, nil)

		// Async upload returns 202 Accepted
		assert.Equal(t, http.StatusAccepted, rr.Code)

		responseBody, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()

		var response map[string]interface{}
		err = json.Unmarshal(responseBody, &response)
		assert.NoError(t, err)

		// Verify envelope structure
		assert.Contains(t, response, "data")
		data := response["data"].(map[string]interface{})

		// Verify async job response
		assert.Contains(t, data, "job_id")
		assert.Contains(t, data, "status")
		assert.Equal(t, "pending", data["status"])
	})

	t.Run("should return error when namespace is missing from context", func(t *testing.T) {
		body, contentType, err := createMultipartFormData("test.txt", "Test content", "vs_test123", "", "")
		assert.NoError(t, err)

		req, err := http.NewRequest(http.MethodPost, "/gen-ai/api/v1/files/upload?namespace=test-namespace", bytes.NewReader(body))
		assert.NoError(t, err)
		req.Header.Set("Content-Type", contentType)

		// Do NOT add namespace to context (simulate middleware failure)
		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.TestLlamaStackURL, "token-mock", false, nil, "/v1")
		ctx := context.WithValue(req.Context(), constants.LlamaStackClientKey, llamaStackClient)
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()
		app.LlamaStackUploadFileHandler(rr, req, nil)

		assert.Equal(t, http.StatusInternalServerError, rr.Code)

		respBody, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()

		var response map[string]interface{}
		err = json.Unmarshal(respBody, &response)
		assert.NoError(t, err)

		// The error response uses a generic message for server errors
		errorObj := response["error"].(map[string]interface{})
		assert.Contains(t, errorObj["message"], "server encountered a problem")
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
		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.TestLlamaStackURL, "token-mock", false, nil, "/v1")
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
		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.TestLlamaStackURL, "token-mock", false, nil, "/v1")
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
		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.TestLlamaStackURL, "token-mock", false, nil, "/v1")
		ctx = context.WithValue(ctx, constants.LlamaStackClientKey, llamaStackClient)
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()
		app.LlamaStackListFilesHandler(rr, req, nil)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
	})
}

func TestLlamaStackFileUploadStatusHandler(t *testing.T) {
	// Save current working directory
	originalWd, err := os.Getwd()
	require.NoError(t, err)

	// Change to project root directory
	projectRoot := filepath.Join(originalWd, "..", "..")
	err = os.Chdir(projectRoot)
	require.NoError(t, err)

	defer func() {
		err := os.Chdir(originalWd)
		require.NoError(t, err)
	}()

	// Create test app with full configuration
	cfg := config.EnvConfig{
		Port:            4000,
		APIPathPrefix:   "/api/v1",
		StaticAssetsDir: "static",
		AuthMethod:      config.AuthMethodUser,
		AuthTokenHeader: config.DefaultAuthTokenHeader,
		AuthTokenPrefix: config.DefaultAuthTokenPrefix,
		MockLSClient:    true,
		LlamaStackURL:   testutil.TestLlamaStackURL,
		MockK8sClient:   false, // Use shared envtest from TestMain
	}

	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelError}))

	// Create k8s factory using shared test environment
	k8sFactory, err := k8smocks.NewTokenClientFactory(testK8sClient, testCfg, logger)
	require.NoError(t, err)

	// Initialize OpenAPI handler
	openAPIHandler, err := NewOpenAPIHandler(logger)
	require.NoError(t, err)

	// Initialize shared memory store
	memStore := cache.NewMemoryStore()

	// Initialize file upload job tracker
	fileUploadJobTracker := services.NewFileUploadJobTracker(memStore, logger)

	// Create app manually using shared envtest
	app := &App{
		config:                  cfg,
		logger:                  logger,
		repositories:            repositories.NewRepositories(),
		openAPI:                 openAPIHandler,
		kubernetesClientFactory: k8sFactory,
		llamaStackClientFactory: lsmocks.NewMockClientFactory(),
		maasClientFactory:       maasmocks.NewMockClientFactory(),
		mcpClientFactory:        mcpmocks.NewMockedMCPClientFactory(cfg, logger),
		dashboardNamespace:      "opendatahub",
		memoryStore:             memStore,
		rootCAs:                 nil,
		clusterDomain:           "",
		fileUploadJobTracker:    fileUploadJobTracker,
		testEnvState:            nil, // Not using per-app envtest
	}

	t.Run("should return pending status for newly created job", func(t *testing.T) {
		// Create a job first
		namespace := "test-namespace"
		jobID, err := app.fileUploadJobTracker.CreateJob(namespace)
		assert.NoError(t, err)

		req := httptest.NewRequest(http.MethodGet, constants.FilesUploadStatusPath+"?namespace="+namespace+"&job_id="+jobID, nil)
		ctx := context.WithValue(req.Context(), constants.NamespaceQueryParameterKey, namespace)
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()
		app.LlamaStackFileUploadStatusHandler(rr, req, nil)

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

		// Verify status response
		assert.Equal(t, jobID, data["job_id"])
		assert.Equal(t, "pending", data["status"])
		assert.Contains(t, data, "created_at")
		assert.Contains(t, data, "updated_at")
	})

	t.Run("should return processing status", func(t *testing.T) {
		namespace := "test-namespace"
		jobID, err := app.fileUploadJobTracker.CreateJob(namespace)
		assert.NoError(t, err)
		err = app.fileUploadJobTracker.UpdateJobStatus(namespace, jobID, "processing")
		assert.NoError(t, err)

		req := httptest.NewRequest(http.MethodGet, constants.FilesUploadStatusPath+"?namespace="+namespace+"&job_id="+jobID, nil)
		ctx := context.WithValue(req.Context(), constants.NamespaceQueryParameterKey, namespace)
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()
		app.LlamaStackFileUploadStatusHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)

		responseBody, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()

		var response map[string]interface{}
		err = json.Unmarshal(responseBody, &response)
		assert.NoError(t, err)

		data := response["data"].(map[string]interface{})
		assert.Equal(t, "processing", data["status"])
	})

	t.Run("should return completed status with result", func(t *testing.T) {
		namespace := "test-namespace"
		jobID, err := app.fileUploadJobTracker.CreateJob(namespace)
		assert.NoError(t, err)

		// Set job result
		completedStatus := openai.VectorStoreFileStatusCompleted
		result := &llamastack.FileUploadResult{
			FileID: "file-test-123",
			VectorStoreFile: &openai.VectorStoreFile{
				ID:            "vsf-test-456",
				VectorStoreID: "vs-test-789",
				Status:        completedStatus,
			},
		}
		err = app.fileUploadJobTracker.SetJobResult(namespace, jobID, result)
		assert.NoError(t, err)

		req := httptest.NewRequest(http.MethodGet, constants.FilesUploadStatusPath+"?namespace="+namespace+"&job_id="+jobID, nil)
		ctx := context.WithValue(req.Context(), constants.NamespaceQueryParameterKey, namespace)
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()
		app.LlamaStackFileUploadStatusHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)

		responseBody, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()

		var response map[string]interface{}
		err = json.Unmarshal(responseBody, &response)
		assert.NoError(t, err)

		data := response["data"].(map[string]interface{})
		assert.Equal(t, "completed", data["status"])
		assert.Contains(t, data, "result")

		resultData := data["result"].(map[string]interface{})
		assert.Equal(t, "file-test-123", resultData["file_id"])
	})

	t.Run("should return failed status with error", func(t *testing.T) {
		namespace := "test-namespace"
		jobID, err := app.fileUploadJobTracker.CreateJob(namespace)
		assert.NoError(t, err)

		// Set job error
		err = app.fileUploadJobTracker.SetJobError(namespace, jobID, errors.New("upload failed: network timeout"))
		assert.NoError(t, err)

		req := httptest.NewRequest(http.MethodGet, constants.FilesUploadStatusPath+"?namespace="+namespace+"&job_id="+jobID, nil)
		ctx := context.WithValue(req.Context(), constants.NamespaceQueryParameterKey, namespace)
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()
		app.LlamaStackFileUploadStatusHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)

		responseBody, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()

		var response map[string]interface{}
		err = json.Unmarshal(responseBody, &response)
		assert.NoError(t, err)

		data := response["data"].(map[string]interface{})
		assert.Equal(t, "failed", data["status"])
		assert.Equal(t, "upload failed: network timeout", data["error"])
	})

	t.Run("should return error when job_id is missing", func(t *testing.T) {
		namespace := "test-namespace"
		req := httptest.NewRequest(http.MethodGet, constants.FilesUploadStatusPath+"?namespace="+namespace, nil)
		ctx := context.WithValue(req.Context(), constants.NamespaceQueryParameterKey, namespace)
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()
		app.LlamaStackFileUploadStatusHandler(rr, req, nil)

		assert.Equal(t, http.StatusBadRequest, rr.Code)

		responseBody, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()

		var response map[string]interface{}
		err = json.Unmarshal(responseBody, &response)
		assert.NoError(t, err)

		errorObj := response["error"].(map[string]interface{})
		assert.Contains(t, errorObj["message"], "job_id query parameter is required")
	})

	t.Run("should return 404 when job does not exist", func(t *testing.T) {
		namespace := "test-namespace"
		req := httptest.NewRequest(http.MethodGet, constants.FilesUploadStatusPath+"?namespace="+namespace+"&job_id=non-existent-job", nil)
		ctx := context.WithValue(req.Context(), constants.NamespaceQueryParameterKey, namespace)
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()
		app.LlamaStackFileUploadStatusHandler(rr, req, nil)

		assert.Equal(t, http.StatusNotFound, rr.Code)
	})

	t.Run("should isolate jobs by namespace", func(t *testing.T) {
		namespace1 := "namespace-1"
		namespace2 := "namespace-2"

		// Create job in namespace1
		jobID, err := app.fileUploadJobTracker.CreateJob(namespace1)
		assert.NoError(t, err)

		// Try to access from namespace2
		req := httptest.NewRequest(http.MethodGet, constants.FilesUploadStatusPath+"?namespace="+namespace2+"&job_id="+jobID, nil)
		ctx := context.WithValue(req.Context(), constants.NamespaceQueryParameterKey, namespace2)
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()
		app.LlamaStackFileUploadStatusHandler(rr, req, nil)

		// Should not find job in different namespace
		assert.Equal(t, http.StatusNotFound, rr.Code)
	})

	t.Run("should return error when namespace is missing from context", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, constants.FilesUploadStatusPath+"?job_id=test-job", nil)
		// Do not add namespace to context

		rr := httptest.NewRecorder()
		app.LlamaStackFileUploadStatusHandler(rr, req, nil)

		assert.Equal(t, http.StatusInternalServerError, rr.Code)

		responseBody, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()

		var response map[string]interface{}
		err = json.Unmarshal(responseBody, &response)
		assert.NoError(t, err)

		// The error response uses a generic message for server errors
		errorObj := response["error"].(map[string]interface{})
		assert.Contains(t, errorObj["message"], "server encountered a problem")
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
		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.TestLlamaStackURL, "token-mock", false, nil, "/v1")
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
		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.TestLlamaStackURL, "token-mock", false, nil, "/v1")
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
