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

	. "github.com/onsi/ginkgo/v2"
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

var _ = Describe("LlamaStackUploadFileHandler", func() {
	var app *App
	var createMultipartFormData func(filename, content, vectorStoreID, purpose, chunkingType string) ([]byte, string, error)

	BeforeEach(func() {
		originalWd, err := os.Getwd()
		require.NoError(GinkgoT(), err)

		// Change to project root so OpenAPI handler can find the YAML file
		projectRoot := filepath.Join(originalWd, "..", "..")
		err = os.Chdir(projectRoot)
		require.NoError(GinkgoT(), err)

		DeferCleanup(func() {
			err := os.Chdir(originalWd)
			require.NoError(GinkgoT(), err)
		})

		cfg := config.EnvConfig{
			Port:            4000,
			APIPathPrefix:   "/api/v1",
			StaticAssetsDir: "static",
			AuthMethod:      config.AuthMethodUser,
			AuthTokenHeader: config.DefaultAuthTokenHeader,
			AuthTokenPrefix: config.DefaultAuthTokenPrefix,
			MockLSClient:    true,
			LlamaStackURL:   testutil.TestLlamaStackURL,
			MockK8sClient:   false, // Use shared envtest from BeforeSuite
		}

		logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelError}))

		k8sFactory, err := k8smocks.NewTokenClientFactory(testK8sClient, testCfg, logger)
		require.NoError(GinkgoT(), err)

		openAPIHandler, err := NewOpenAPIHandler(logger)
		require.NoError(GinkgoT(), err)

		memStore := cache.NewMemoryStore()

		fileUploadJobTracker := services.NewFileUploadJobTracker(memStore, logger)

		app = &App{
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

		createMultipartFormData = func(filename, content, vectorStoreID, purpose, chunkingType string) ([]byte, string, error) {
			var err error
			var body bytes.Buffer
			writer := multipart.NewWriter(&body)

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
	})

	It("should upload file successfully with required parameters", func() {
		t := GinkgoT()
		body, contentType, err := createMultipartFormData("test.txt", "Test file content", "vs_test123", "", "")
		assert.NoError(t, err)

		req, err := http.NewRequest(http.MethodPost, "/gen-ai/api/v1/files/upload?namespace=test-namespace", bytes.NewReader(body))
		assert.NoError(t, err)
		req.Header.Set("Content-Type", contentType)

		ctx := context.WithValue(req.Context(), constants.NamespaceQueryParameterKey, "default")
		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.TestLlamaStackURL, "token-mock123abc456def", false, nil, "/v1")
		ctx = context.WithValue(ctx, constants.LlamaStackClientKey, llamaStackClient)
		req = req.WithContext(ctx)
		rr := httptest.NewRecorder()
		app.LlamaStackUploadFileHandler(rr, req, nil)

		assert.Equal(t, http.StatusAccepted, rr.Code)

		respBody, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()

		var response map[string]interface{}
		err = json.Unmarshal(respBody, &response)
		assert.NoError(t, err)

		assert.Contains(t, response, "data")
		data := response["data"].(map[string]interface{})

		assert.Contains(t, data, "job_id")
		assert.Contains(t, data, "status")
		assert.Equal(t, "pending", data["status"])
		assert.NotEmpty(t, data["job_id"])
	})

	It("should upload file with optional parameters", func() {
		t := GinkgoT()
		body, contentType, err := createMultipartFormData("test.txt", "Test file content", "vs_test123", "assistants", "auto")
		assert.NoError(t, err)

		req, err := http.NewRequest(http.MethodPost, "/gen-ai/api/v1/files/upload?namespace=test-namespace", bytes.NewReader(body))
		assert.NoError(t, err)
		req.Header.Set("Content-Type", contentType)

		ctx := context.WithValue(req.Context(), constants.NamespaceQueryParameterKey, "default")
		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.TestLlamaStackURL, "token-mock123abc456def", false, nil, "/v1")
		ctx = context.WithValue(ctx, constants.LlamaStackClientKey, llamaStackClient)
		req = req.WithContext(ctx)
		rr := httptest.NewRecorder()
		app.LlamaStackUploadFileHandler(rr, req, nil)

		assert.Equal(t, http.StatusAccepted, rr.Code)

		respBody, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()

		var response map[string]interface{}
		err = json.Unmarshal(respBody, &response)
		assert.NoError(t, err)

		assert.Contains(t, response, "data")
		data := response["data"].(map[string]interface{})

		assert.Contains(t, data, "job_id")
		assert.Contains(t, data, "status")
		assert.Equal(t, "pending", data["status"])
	})

	It("should return error when file is missing", func() {
		t := GinkgoT()
		body, contentType, err := createMultipartFormData("", "", "vs_test123", "", "")
		assert.NoError(t, err)

		req, err := http.NewRequest(http.MethodPost, "/gen-ai/api/v1/files/upload?namespace=test-namespace", bytes.NewReader(body))
		assert.NoError(t, err)
		req.Header.Set("Content-Type", contentType)

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

	It("should return error when vector_store_id is missing", func() {
		t := GinkgoT()
		body, contentType, err := createMultipartFormData("test.txt", "Test content", "", "", "")
		assert.NoError(t, err)

		req, err := http.NewRequest(http.MethodPost, "/gen-ai/api/v1/files/upload?namespace=test-namespace", bytes.NewReader(body))
		assert.NoError(t, err)
		req.Header.Set("Content-Type", contentType)

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

	It("should use unified repository pattern", func() {
		t := GinkgoT()
		assert.NotNil(t, app.repositories)
		assert.NotNil(t, app.repositories.Files)

		body, contentType, err := createMultipartFormData("test.txt", "Test content", "vs_test123", "assistants", "")
		assert.NoError(t, err)

		req, err := http.NewRequest(http.MethodPost, "/gen-ai/api/v1/files/upload?namespace=test-namespace", bytes.NewReader(body))
		assert.NoError(t, err)
		req.Header.Set("Content-Type", contentType)

		ctx := context.WithValue(req.Context(), constants.NamespaceQueryParameterKey, "default")
		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.TestLlamaStackURL, "token-mock123abc456def", false, nil, "/v1")
		ctx = context.WithValue(ctx, constants.LlamaStackClientKey, llamaStackClient)
		req = req.WithContext(ctx)
		rr := httptest.NewRecorder()
		app.LlamaStackUploadFileHandler(rr, req, nil)

		assert.Equal(t, http.StatusAccepted, rr.Code)

		var response map[string]interface{}
		respBody, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()

		err = json.Unmarshal(respBody, &response)
		assert.NoError(t, err)

		assert.Contains(t, response, "data")
		data := response["data"].(map[string]interface{})

		assert.Contains(t, data, "job_id")
		assert.Contains(t, data, "status")
		assert.Equal(t, "pending", data["status"])
	})

	It("should handle static chunking parameters", func() {
		t := GinkgoT()
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

		ctx := context.WithValue(req.Context(), constants.NamespaceQueryParameterKey, "default")
		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.TestLlamaStackURL, "token-mock", false, nil, "/v1")
		ctx = context.WithValue(ctx, constants.LlamaStackClientKey, llamaStackClient)
		req = req.WithContext(ctx)
		rr := httptest.NewRecorder()
		app.LlamaStackUploadFileHandler(rr, req, nil)

		assert.Equal(t, http.StatusAccepted, rr.Code)

		responseBody, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()

		var response map[string]interface{}
		err = json.Unmarshal(responseBody, &response)
		assert.NoError(t, err)

		assert.Contains(t, response, "data")
		data := response["data"].(map[string]interface{})

		assert.Contains(t, data, "job_id")
		assert.Contains(t, data, "status")
		assert.Equal(t, "pending", data["status"])
	})

	It("should return error when namespace is missing from context", func() {
		t := GinkgoT()
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
})

var _ = Describe("LlamaStackListFilesHandler", func() {
	var app App

	BeforeEach(func() {
		llamaStackClientFactory := lsmocks.NewMockClientFactory()
		app = App{
			config: config.EnvConfig{
				Port: 4000,
			},
			llamaStackClientFactory: llamaStackClientFactory,
			repositories:            repositories.NewRepositories(),
		}
	})

	It("successful list files", func() {
		t := GinkgoT()
		req := httptest.NewRequest(http.MethodGet, constants.FilesListPath+"?namespace=default", nil)

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

		assert.Contains(t, response, "data")
		data := response["data"].([]interface{})
		assert.Len(t, data, 2) // Mock returns 2 files

		firstFile := data[0].(map[string]interface{})
		assert.Equal(t, "file-mock123abc456def", firstFile["id"])
		assert.Equal(t, "file", firstFile["object"])
		assert.Equal(t, "mock_document.txt", firstFile["filename"])
	})

	It("list files with query parameters", func() {
		t := GinkgoT()
		req := httptest.NewRequest(http.MethodGet, constants.FilesListPath+"?namespace=default&limit=10&order=desc&purpose=assistants", nil)

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

		assert.Contains(t, response, "data")
		data := response["data"].([]interface{})
		assert.Len(t, data, 2) // Mock returns 2 files regardless of parameters
	})

	It("invalid limit parameter", func() {
		t := GinkgoT()
		req := httptest.NewRequest(http.MethodGet, constants.FilesListPath+"?namespace=default&limit=invalid", nil)
		ctx := context.WithValue(req.Context(), constants.NamespaceQueryParameterKey, "default")
		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.TestLlamaStackURL, "token-mock", false, nil, "/v1")
		ctx = context.WithValue(ctx, constants.LlamaStackClientKey, llamaStackClient)
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()
		app.LlamaStackListFilesHandler(rr, req, nil)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
	})
})

var _ = Describe("LlamaStackFileUploadStatusHandler", func() {
	var app *App

	BeforeEach(func() {
		originalWd, err := os.Getwd()
		require.NoError(GinkgoT(), err)

		// Change to project root so OpenAPI handler can find the YAML file
		projectRoot := filepath.Join(originalWd, "..", "..")
		err = os.Chdir(projectRoot)
		require.NoError(GinkgoT(), err)

		DeferCleanup(func() {
			err := os.Chdir(originalWd)
			require.NoError(GinkgoT(), err)
		})

		cfg := config.EnvConfig{
			Port:            4000,
			APIPathPrefix:   "/api/v1",
			StaticAssetsDir: "static",
			AuthMethod:      config.AuthMethodUser,
			AuthTokenHeader: config.DefaultAuthTokenHeader,
			AuthTokenPrefix: config.DefaultAuthTokenPrefix,
			MockLSClient:    true,
			LlamaStackURL:   testutil.TestLlamaStackURL,
			MockK8sClient:   false, // Use shared envtest from BeforeSuite
		}

		logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelError}))

		k8sFactory, err := k8smocks.NewTokenClientFactory(testK8sClient, testCfg, logger)
		require.NoError(GinkgoT(), err)

		openAPIHandler, err := NewOpenAPIHandler(logger)
		require.NoError(GinkgoT(), err)

		memStore := cache.NewMemoryStore()

		fileUploadJobTracker := services.NewFileUploadJobTracker(memStore, logger)

		app = &App{
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
	})

	It("should return pending status for newly created job", func() {
		t := GinkgoT()
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

		assert.Contains(t, response, "data")
		data := response["data"].(map[string]interface{})

		assert.Equal(t, jobID, data["job_id"])
		assert.Equal(t, "pending", data["status"])
		assert.Contains(t, data, "created_at")
		assert.Contains(t, data, "updated_at")
	})

	It("should return processing status", func() {
		t := GinkgoT()
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

	It("should return completed status with result", func() {
		t := GinkgoT()
		namespace := "test-namespace"
		jobID, err := app.fileUploadJobTracker.CreateJob(namespace)
		assert.NoError(t, err)

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

	It("should return failed status with error", func() {
		t := GinkgoT()
		namespace := "test-namespace"
		jobID, err := app.fileUploadJobTracker.CreateJob(namespace)
		assert.NoError(t, err)

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

	It("should return error when job_id is missing", func() {
		t := GinkgoT()
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

	It("should return 404 when job does not exist", func() {
		t := GinkgoT()
		namespace := "test-namespace"
		req := httptest.NewRequest(http.MethodGet, constants.FilesUploadStatusPath+"?namespace="+namespace+"&job_id=non-existent-job", nil)
		ctx := context.WithValue(req.Context(), constants.NamespaceQueryParameterKey, namespace)
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()
		app.LlamaStackFileUploadStatusHandler(rr, req, nil)

		assert.Equal(t, http.StatusNotFound, rr.Code)
	})

	It("should isolate jobs by namespace", func() {
		t := GinkgoT()
		namespace1 := "namespace-1"
		namespace2 := "namespace-2"

		jobID, err := app.fileUploadJobTracker.CreateJob(namespace1)
		assert.NoError(t, err)

		req := httptest.NewRequest(http.MethodGet, constants.FilesUploadStatusPath+"?namespace="+namespace2+"&job_id="+jobID, nil)
		ctx := context.WithValue(req.Context(), constants.NamespaceQueryParameterKey, namespace2)
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()
		app.LlamaStackFileUploadStatusHandler(rr, req, nil)

		assert.Equal(t, http.StatusNotFound, rr.Code)
	})

	It("should return error when namespace is missing from context", func() {
		t := GinkgoT()
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
})

var _ = Describe("LlamaStackDeleteFileHandler", func() {
	var app App

	BeforeEach(func() {
		llamaStackClientFactory := lsmocks.NewMockClientFactory()
		app = App{
			config: config.EnvConfig{
				Port: 4000,
			},
			llamaStackClientFactory: llamaStackClientFactory,
			repositories:            repositories.NewRepositories(),
		}
	})

	It("successful delete file", func() {
		t := GinkgoT()
		req := httptest.NewRequest(http.MethodDelete, constants.FilesDeletePath+"?namespace=default&file_id=file-test123", nil)
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

		assert.Contains(t, response, "data")
		data := response["data"].(map[string]interface{})
		assert.Equal(t, "file-test123", data["id"])
		assert.Equal(t, "file", data["object"])
		assert.Equal(t, true, data["deleted"])
	})

	It("missing file_id parameter", func() {
		t := GinkgoT()
		req := httptest.NewRequest(http.MethodDelete, constants.FilesDeletePath+"?namespace=default", nil)
		ctx := context.WithValue(req.Context(), constants.NamespaceQueryParameterKey, "default")
		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.TestLlamaStackURL, "token-mock", false, nil, "/v1")
		ctx = context.WithValue(ctx, constants.LlamaStackClientKey, llamaStackClient)
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()
		app.LlamaStackDeleteFileHandler(rr, req, nil)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
	})

	It("missing LlamaStack client in context", func() {
		t := GinkgoT()
		req := httptest.NewRequest(http.MethodDelete, constants.FilesDeletePath+"?namespace=default&file_id=file-test123", nil)
		// Simulate AttachNamespace middleware but skip AttachLlamaStackClient
		ctx := context.WithValue(req.Context(), constants.NamespaceQueryParameterKey, "default")
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()
		app.LlamaStackDeleteFileHandler(rr, req, nil)

		assert.Equal(t, http.StatusInternalServerError, rr.Code)
	})
})
