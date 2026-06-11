package api

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"net/textproto"
	"os"
	"path/filepath"
	"testing"

	. "github.com/onsi/ginkgo/v2"
	"github.com/openai/openai-go/v2"
	"github.com/opendatahub-io/gen-ai/internal/config"
	"github.com/opendatahub-io/gen-ai/internal/constants"
	"github.com/opendatahub-io/gen-ai/internal/integrations/kubernetes/k8smocks"
	"github.com/opendatahub-io/gen-ai/internal/integrations/llamastack"
	"github.com/opendatahub-io/gen-ai/internal/integrations/llamastack/lsmocks"
	"github.com/opendatahub-io/gen-ai/internal/repositories"
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
			LlamaStackURL:   testutil.GetTestLlamaStackURL(),
			MockK8sClient:   false, // Use shared envtest from BeforeSuite
		}

		logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelError}))

		k8sFactory, err := k8smocks.NewTokenClientFactory(testK8sClient, testCfg, logger)
		require.NoError(GinkgoT(), err)

		openAPIHandler, err := NewOpenAPIHandler(logger)
		require.NoError(GinkgoT(), err)

		app = NewTestApp(cfg, logger, k8sFactory, WithOpenAPIHandler(openAPIHandler))

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
		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.GetTestLlamaStackURL(), "token-mock123abc456def", false, nil, "/v1")
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
		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.GetTestLlamaStackURL(), "token-mock123abc456def", false, nil, "/v1")
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
		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.GetTestLlamaStackURL(), "token-mock123abc456def", false, nil, "/v1")
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
		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.GetTestLlamaStackURL(), "token-mock123abc456def", false, nil, "/v1")
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
		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.GetTestLlamaStackURL(), "token-mock123abc456def", false, nil, "/v1")
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
		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.GetTestLlamaStackURL(), "token-mock", false, nil, "/v1")
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
		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.GetTestLlamaStackURL(), "token-mock", false, nil, "/v1")
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
		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.GetTestLlamaStackURL(), "token-mock", false, nil, "/v1")
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
		assert.NotNil(t, data, "should return a list of files")

		if len(data) > 0 {
			firstFile := data[0].(map[string]interface{})
			assert.NotEmpty(t, firstFile["id"])
			assert.Equal(t, "file", firstFile["object"])
		}
	})

	It("list files with query parameters", func() {
		t := GinkgoT()
		req := httptest.NewRequest(http.MethodGet, constants.FilesListPath+"?namespace=default&limit=10&order=desc&purpose=assistants", nil)

		ctx := context.WithValue(req.Context(), constants.NamespaceQueryParameterKey, "default")
		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.GetTestLlamaStackURL(), "token-mock", false, nil, "/v1")
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
		assert.NotNil(t, data, "should return a list of files")
	})

	It("invalid limit parameter", func() {
		t := GinkgoT()
		req := httptest.NewRequest(http.MethodGet, constants.FilesListPath+"?namespace=default&limit=invalid", nil)
		ctx := context.WithValue(req.Context(), constants.NamespaceQueryParameterKey, "default")
		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.GetTestLlamaStackURL(), "token-mock", false, nil, "/v1")
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
			LlamaStackURL:   testutil.GetTestLlamaStackURL(),
			MockK8sClient:   false, // Use shared envtest from BeforeSuite
		}

		logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelError}))

		k8sFactory, err := k8smocks.NewTokenClientFactory(testK8sClient, testCfg, logger)
		require.NoError(GinkgoT(), err)

		openAPIHandler, err := NewOpenAPIHandler(logger)
		require.NoError(GinkgoT(), err)

		app = NewTestApp(cfg, logger, k8sFactory, WithOpenAPIHandler(openAPIHandler))
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
		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.GetTestLlamaStackURL(), "token-mock", false, nil, "/v1")

		// Upload a file to get a valid file ID
		fileID, err := uploadTestFile(testutil.GetTestLlamaStackURL())
		require.NoError(t, err, "setup: file upload should succeed")
		require.NotEmpty(t, fileID)

		req := httptest.NewRequest(http.MethodDelete, constants.FilesDeletePath+"?namespace=default&file_id="+fileID, nil)
		ctx := context.WithValue(req.Context(), constants.NamespaceQueryParameterKey, "default")
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
		assert.Equal(t, fileID, data["id"])
		assert.Equal(t, "file", data["object"])
		assert.Equal(t, true, data["deleted"])
	})

	It("missing file_id parameter", func() {
		t := GinkgoT()
		req := httptest.NewRequest(http.MethodDelete, constants.FilesDeletePath+"?namespace=default", nil)
		ctx := context.WithValue(req.Context(), constants.NamespaceQueryParameterKey, "default")
		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.GetTestLlamaStackURL(), "token-mock", false, nil, "/v1")
		ctx = context.WithValue(ctx, constants.LlamaStackClientKey, llamaStackClient)
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()
		app.LlamaStackDeleteFileHandler(rr, req, nil)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
	})

	It("missing LlamaStack client in context", func() {
		t := GinkgoT()
		req := httptest.NewRequest(http.MethodDelete, constants.FilesDeletePath+"?namespace=default&file_id=file-test123", nil)
		// Simulate AttachNamespace middleware but skip AttachOGXClient
		ctx := context.WithValue(req.Context(), constants.NamespaceQueryParameterKey, "default")
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()
		app.LlamaStackDeleteFileHandler(rr, req, nil)

		assert.Equal(t, http.StatusInternalServerError, rr.Code)
	})
})

var _ = Describe("LlamaStackMediaFileUploadHandler", func() {
	var app *App
	var createMediaMultipart func(filename string, content []byte, contentType, mediaType string) ([]byte, string, error)

	BeforeEach(func() {
		originalWd, err := os.Getwd()
		require.NoError(GinkgoT(), err)

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
			LlamaStackURL:   testutil.GetTestLlamaStackURL(),
			MockK8sClient:   false,
		}

		logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelError}))

		k8sFactory, err := k8smocks.NewTokenClientFactory(testK8sClient, testCfg, logger)
		require.NoError(GinkgoT(), err)

		openAPIHandler, err := NewOpenAPIHandler(logger)
		require.NoError(GinkgoT(), err)

		app = NewTestApp(cfg, logger, k8sFactory, WithOpenAPIHandler(openAPIHandler))

		createMediaMultipart = func(filename string, content []byte, contentType, mediaType string) ([]byte, string, error) {
			var body bytes.Buffer
			writer := multipart.NewWriter(&body)

			if mediaType != "" {
				if err := writer.WriteField("type", mediaType); err != nil {
					return nil, "", err
				}
			}

			h := make(textproto.MIMEHeader)
			h.Set("Content-Disposition", fmt.Sprintf(`form-data; name="file"; filename="%s"`, filename))
			h.Set("Content-Type", contentType)
			part, err := writer.CreatePart(h)
			if err != nil {
				return nil, "", err
			}
			if _, err := part.Write(content); err != nil {
				return nil, "", err
			}
			writer.Close()
			return body.Bytes(), writer.FormDataContentType(), nil
		}
	})

	// --- Vision (type=vision) ---

	It("should upload a JPEG image successfully with type=vision", func() {
		t := GinkgoT()
		imgData := []byte{0xFF, 0xD8, 0xFF, 0xE0}
		body, ct, err := createMediaMultipart("photo.jpg", imgData, "image/jpeg", "vision")
		require.NoError(t, err)

		req := httptest.NewRequest(http.MethodPost, constants.MediaFilesUploadPath+"?namespace=default", bytes.NewReader(body))
		req.Header.Set("Content-Type", ct)

		mockClient := lsmocks.NewMockLlamaStackClient()
		ctx := context.WithValue(req.Context(), constants.LlamaStackClientKey, mockClient)
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()
		app.LlamaStackMediaFileUploadHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)

		var resp map[string]interface{}
		err = json.Unmarshal(rr.Body.Bytes(), &resp)
		require.NoError(t, err)

		data := resp["data"].(map[string]interface{})
		assert.Equal(t, "file-mock123abc456def", data["id"])
		assert.Equal(t, "file", data["object"])
		assert.Equal(t, "vision", data["type"])
		assert.Equal(t, "processed", data["status"])
	})

	It("should reject non-image MIME type for type=vision", func() {
		t := GinkgoT()
		body, ct, err := createMediaMultipart("doc.pdf", []byte("pdf content"), "application/pdf", "vision")
		require.NoError(t, err)

		req := httptest.NewRequest(http.MethodPost, constants.MediaFilesUploadPath+"?namespace=default", bytes.NewReader(body))
		req.Header.Set("Content-Type", ct)

		mockClient := lsmocks.NewMockLlamaStackClient()
		ctx := context.WithValue(req.Context(), constants.LlamaStackClientKey, mockClient)
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()
		app.LlamaStackMediaFileUploadHandler(rr, req, nil)

		assert.Equal(t, http.StatusBadRequest, rr.Code)

		var resp map[string]interface{}
		err = json.Unmarshal(rr.Body.Bytes(), &resp)
		require.NoError(t, err)
		errorObj := resp["error"].(map[string]interface{})
		assert.Contains(t, errorObj["message"], "invalid file type")
		assert.Contains(t, errorObj["message"], "vision")
	})

	// --- Audio (type=audio) ---

	It("should upload a WAV audio file successfully with type=audio", func() {
		t := GinkgoT()
		wavData := []byte("RIFF\x00\x00\x00\x00WAVEfmt ")
		body, ct, err := createMediaMultipart("recording.wav", wavData, "audio/wav", "audio")
		require.NoError(t, err)

		req := httptest.NewRequest(http.MethodPost, constants.MediaFilesUploadPath+"?namespace=default", bytes.NewReader(body))
		req.Header.Set("Content-Type", ct)

		mockClient := lsmocks.NewMockLlamaStackClient()
		ctx := context.WithValue(req.Context(), constants.LlamaStackClientKey, mockClient)
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()
		app.LlamaStackMediaFileUploadHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)

		var resp map[string]interface{}
		err = json.Unmarshal(rr.Body.Bytes(), &resp)
		require.NoError(t, err)

		data := resp["data"].(map[string]interface{})
		assert.Equal(t, "file-mock123abc456def", data["id"])
		assert.Equal(t, "audio", data["type"])
		assert.Equal(t, "processed", data["status"])
	})

	It("should upload an MP3 audio file successfully with type=audio", func() {
		t := GinkgoT()
		mp3Data := []byte{0xFF, 0xFB, 0x90, 0x00}
		body, ct, err := createMediaMultipart("speech.mp3", mp3Data, "audio/mpeg", "audio")
		require.NoError(t, err)

		req := httptest.NewRequest(http.MethodPost, constants.MediaFilesUploadPath+"?namespace=default", bytes.NewReader(body))
		req.Header.Set("Content-Type", ct)

		mockClient := lsmocks.NewMockLlamaStackClient()
		ctx := context.WithValue(req.Context(), constants.LlamaStackClientKey, mockClient)
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()
		app.LlamaStackMediaFileUploadHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)

		var resp map[string]interface{}
		err = json.Unmarshal(rr.Body.Bytes(), &resp)
		require.NoError(t, err)

		data := resp["data"].(map[string]interface{})
		assert.Equal(t, "file-mock123abc456def", data["id"])
		assert.Equal(t, "audio", data["type"])
	})

	It("should reject non-audio MIME type for type=audio", func() {
		t := GinkgoT()
		body, ct, err := createMediaMultipart("photo.jpg", []byte{0xFF, 0xD8}, "image/jpeg", "audio")
		require.NoError(t, err)

		req := httptest.NewRequest(http.MethodPost, constants.MediaFilesUploadPath+"?namespace=default", bytes.NewReader(body))
		req.Header.Set("Content-Type", ct)

		mockClient := lsmocks.NewMockLlamaStackClient()
		ctx := context.WithValue(req.Context(), constants.LlamaStackClientKey, mockClient)
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()
		app.LlamaStackMediaFileUploadHandler(rr, req, nil)

		assert.Equal(t, http.StatusBadRequest, rr.Code)

		var resp map[string]interface{}
		err = json.Unmarshal(rr.Body.Bytes(), &resp)
		require.NoError(t, err)
		errorObj := resp["error"].(map[string]interface{})
		assert.Contains(t, errorObj["message"], "invalid file type")
		assert.Contains(t, errorObj["message"], "audio")
	})

	// --- Common error cases ---

	It("should reject missing type field", func() {
		t := GinkgoT()
		imgData := []byte{0xFF, 0xD8, 0xFF, 0xE0}
		body, ct, err := createMediaMultipart("photo.jpg", imgData, "image/jpeg", "")
		require.NoError(t, err)

		req := httptest.NewRequest(http.MethodPost, constants.MediaFilesUploadPath+"?namespace=default", bytes.NewReader(body))
		req.Header.Set("Content-Type", ct)

		mockClient := lsmocks.NewMockLlamaStackClient()
		ctx := context.WithValue(req.Context(), constants.LlamaStackClientKey, mockClient)
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()
		app.LlamaStackMediaFileUploadHandler(rr, req, nil)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
		assert.Contains(t, rr.Body.String(), "type is required")
	})

	It("should reject invalid type field", func() {
		t := GinkgoT()
		body, ct, err := createMediaMultipart("file.bin", []byte("data"), "application/octet-stream", "video")
		require.NoError(t, err)

		req := httptest.NewRequest(http.MethodPost, constants.MediaFilesUploadPath+"?namespace=default", bytes.NewReader(body))
		req.Header.Set("Content-Type", ct)

		mockClient := lsmocks.NewMockLlamaStackClient()
		ctx := context.WithValue(req.Context(), constants.LlamaStackClientKey, mockClient)
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()
		app.LlamaStackMediaFileUploadHandler(rr, req, nil)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
		assert.Contains(t, rr.Body.String(), "type is required")
	})

	It("should return 500 when OGX upload fails", func() {
		t := GinkgoT()
		imgData := []byte{0x89, 0x50, 0x4E, 0x47}
		body, ct, err := createMediaMultipart("photo.png", imgData, "image/png", "vision")
		require.NoError(t, err)

		req := httptest.NewRequest(http.MethodPost, constants.MediaFilesUploadPath+"?namespace=default", bytes.NewReader(body))
		req.Header.Set("Content-Type", ct)

		mockClient := lsmocks.NewMockLlamaStackClient()
		mockClient.UploadFileError = errors.New("upstream OGX server returned 500")
		ctx := context.WithValue(req.Context(), constants.LlamaStackClientKey, mockClient)
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()
		app.LlamaStackMediaFileUploadHandler(rr, req, nil)

		assert.Equal(t, http.StatusInternalServerError, rr.Code)

		var resp map[string]interface{}
		err = json.Unmarshal(rr.Body.Bytes(), &resp)
		require.NoError(t, err)
		errorObj := resp["error"].(map[string]interface{})
		assert.NotEmpty(t, errorObj["message"])
	})

	It("should return error when file field is missing", func() {
		t := GinkgoT()
		var body bytes.Buffer
		writer := multipart.NewWriter(&body)
		_ = writer.WriteField("type", "vision")
		writer.Close()

		req := httptest.NewRequest(http.MethodPost, constants.MediaFilesUploadPath+"?namespace=default", &body)
		req.Header.Set("Content-Type", writer.FormDataContentType())

		mockClient := lsmocks.NewMockLlamaStackClient()
		ctx := context.WithValue(req.Context(), constants.LlamaStackClientKey, mockClient)
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()
		app.LlamaStackMediaFileUploadHandler(rr, req, nil)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
	})

	It("should return 503 when OGX client is not in context", func() {
		t := GinkgoT()
		imgData := []byte{0xFF, 0xD8, 0xFF, 0xE0}
		body, ct, err := createMediaMultipart("photo.jpg", imgData, "image/jpeg", "vision")
		require.NoError(t, err)

		req := httptest.NewRequest(http.MethodPost, constants.MediaFilesUploadPath+"?namespace=default", bytes.NewReader(body))
		req.Header.Set("Content-Type", ct)

		rr := httptest.NewRecorder()
		app.LlamaStackMediaFileUploadHandler(rr, req, nil)

		assert.Equal(t, http.StatusServiceUnavailable, rr.Code)
	})
})

func TestLlamaStackUploadFileHandler_PayloadTooLarge(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	app := &App{
		config: config.EnvConfig{
			APIPathPrefix: "/api/v1",
			AuthMethod:    config.AuthMethodDisabled,
		},
		logger: logger,
	}

	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		app.LlamaStackUploadFileHandler(w, r, nil)
	})

	var buf bytes.Buffer
	writer := multipart.NewWriter(&buf)
	part, err := writer.CreateFormFile("file", "large_doc.txt")
	require.NoError(t, err)

	oversizedContent := make([]byte, constants.FileUploadMaxBodySize+1)
	for i := range oversizedContent {
		oversizedContent[i] = 'x'
	}
	_, err = part.Write(oversizedContent)
	require.NoError(t, err)

	err = writer.WriteField("vector_store_id", "vs_test123")
	require.NoError(t, err)
	writer.Close()

	req := httptest.NewRequest(http.MethodPost, "/api/v1/lsd/files/upload", &buf)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	rr := httptest.NewRecorder()

	handler.ServeHTTP(rr, req)

	assert.Equal(t, http.StatusRequestEntityTooLarge, rr.Code)

	var envelope map[string]interface{}
	err = json.Unmarshal(rr.Body.Bytes(), &envelope)
	assert.NoError(t, err)
	errorObj, ok := envelope["error"].(map[string]interface{})
	assert.True(t, ok, "response should contain 'error' object")
	assert.Equal(t, "413", errorObj["code"])
	assert.Contains(t, errorObj["message"], "10MB")
}

func TestMediaFileUploadHandler_PayloadTooLarge(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	app := &App{
		config: config.EnvConfig{
			APIPathPrefix: "/api/v1",
			AuthMethod:    config.AuthMethodDisabled,
		},
		logger: logger,
	}

	var buf bytes.Buffer
	writer := multipart.NewWriter(&buf)

	err := writer.WriteField("type", "audio")
	require.NoError(t, err)

	h := make(textproto.MIMEHeader)
	h.Set("Content-Disposition", `form-data; name="file"; filename="huge_recording.wav"`)
	h.Set("Content-Type", "audio/wav")
	part, err := writer.CreatePart(h)
	require.NoError(t, err)

	oversizedContent := make([]byte, constants.MediaUploadMaxBodySize+1)
	for i := range oversizedContent {
		oversizedContent[i] = 0x00
	}
	_, err = part.Write(oversizedContent)
	require.NoError(t, err)
	writer.Close()

	req := httptest.NewRequest(http.MethodPost, "/api/v1/lsd/files/media?namespace=default", &buf)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	rr := httptest.NewRecorder()

	app.LlamaStackMediaFileUploadHandler(rr, req, nil)

	assert.Equal(t, http.StatusRequestEntityTooLarge, rr.Code)

	var envelope map[string]interface{}
	err = json.Unmarshal(rr.Body.Bytes(), &envelope)
	assert.NoError(t, err)
	errorObj, ok := envelope["error"].(map[string]interface{})
	assert.True(t, ok, "response should contain 'error' object")
	assert.Equal(t, "413", errorObj["code"])
	assert.Contains(t, errorObj["message"], "10MB")
}

func TestMediaFileUploadHandler_PerTypeSizeExceeded(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	app := &App{
		config: config.EnvConfig{
			APIPathPrefix: "/api/v1",
			AuthMethod:    config.AuthMethodDisabled,
		},
		logger: logger,
	}

	// Temporarily set a very small per-type limit to exercise the header.Size check
	// without allocating a >10MB buffer.
	origConfig := constants.MediaTypeConfigs[constants.MediaTypeAudio]
	constants.MediaTypeConfigs[constants.MediaTypeAudio] = constants.MediaConfig{
		AllowedMIME: origConfig.AllowedMIME,
		MaxBodySize: 100, // 100 bytes
		OGXPurpose:  origConfig.OGXPurpose,
	}
	defer func() {
		constants.MediaTypeConfigs[constants.MediaTypeAudio] = origConfig
	}()

	var buf bytes.Buffer
	writer := multipart.NewWriter(&buf)

	err := writer.WriteField("type", "audio")
	require.NoError(t, err)

	h := make(textproto.MIMEHeader)
	h.Set("Content-Disposition", `form-data; name="file"; filename="recording.wav"`)
	h.Set("Content-Type", "audio/wav")
	part, err := writer.CreatePart(h)
	require.NoError(t, err)

	// 200 bytes exceeds the 100-byte per-type limit but passes the 10MB global limit
	content := make([]byte, 200)
	_, err = part.Write(content)
	require.NoError(t, err)
	writer.Close()

	req := httptest.NewRequest(http.MethodPost, "/api/v1/lsd/files/media?namespace=default", &buf)
	req.Header.Set("Content-Type", writer.FormDataContentType())

	mockClient := lsmocks.NewMockLlamaStackClient()
	ctx := context.WithValue(req.Context(), constants.LlamaStackClientKey, mockClient)
	req = req.WithContext(ctx)

	rr := httptest.NewRecorder()
	app.LlamaStackMediaFileUploadHandler(rr, req, nil)

	assert.Equal(t, http.StatusRequestEntityTooLarge, rr.Code)
}
