package api

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"os"
	"time"

	. "github.com/onsi/ginkgo/v2"
	"github.com/opendatahub-io/gen-ai/internal/config"
	"github.com/opendatahub-io/gen-ai/internal/constants"
	"github.com/opendatahub-io/gen-ai/internal/integrations"
	"github.com/opendatahub-io/gen-ai/internal/integrations/kubernetes/k8smocks"
	"github.com/opendatahub-io/gen-ai/internal/integrations/llamastack/lsmocks"
	"github.com/opendatahub-io/gen-ai/internal/repositories"
	"github.com/opendatahub-io/gen-ai/internal/testutil"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// uploadTestFile uploads a small test file to the Llama Stack server and returns the file ID.
func uploadTestFile(baseURL string) (string, error) {
	var buf bytes.Buffer
	writer := multipart.NewWriter(&buf)
	part, err := writer.CreateFormFile("file", "test_delete.txt")
	if err != nil {
		return "", err
	}
	if _, err := part.Write([]byte("test file content for deletion")); err != nil {
		return "", fmt.Errorf("write form file: %w", err)
	}
	if err := writer.WriteField("purpose", "assistants"); err != nil {
		return "", fmt.Errorf("write field: %w", err)
	}
	if err := writer.Close(); err != nil {
		return "", fmt.Errorf("close multipart writer: %w", err)
	}

	req, err := http.NewRequest("POST", baseURL+"/v1/files", &buf)
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", writer.FormDataContentType())
	if testID := os.Getenv("LLAMA_STACK_TEST_ID"); testID != "" {
		headerBytes, err := json.Marshal(map[string]string{"__test_id": testID})
		if err != nil {
			return "", fmt.Errorf("marshal provider data: %w", err)
		}
		req.Header.Set("X-LlamaStack-Provider-Data", string(headerBytes))
	}

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("read response body: %w", err)
	}
	if resp.StatusCode >= 400 {
		return "", fmt.Errorf("upload failed: %s", string(body))
	}

	var result map[string]interface{}
	if err := json.Unmarshal(body, &result); err != nil {
		return "", err
	}
	id, ok := result["id"].(string)
	if !ok || id == "" {
		return "", fmt.Errorf("upload response missing 'id' field: %s", string(body))
	}
	return id, nil
}

var _ = Describe("LlamaStackListVectorStoresHandler", func() {
	var app App

	BeforeEach(func() {
		k8sFactory, err := k8smocks.NewTokenClientFactory(testK8sClient, testCfg, slog.Default())
		require.NoError(GinkgoT(), err)

		llamaStackClientFactory := lsmocks.NewMockClientFactory()
		app = App{
			config: config.EnvConfig{
				Port: 4000,
			},
			llamaStackClientFactory: llamaStackClientFactory,
			kubernetesClientFactory: k8sFactory,
			repositories:            repositories.NewRepositories(),
			logger:                  slog.Default(),
		}
	})

	It("should list vector stores without parameters", func() {
		t := GinkgoT()
		req, err := http.NewRequest(http.MethodGet, "/gen-ai/api/v1/vectorstores?namespace="+testutil.TestNamespace, nil)
		assert.NoError(t, err)

		identity := &integrations.RequestIdentity{Token: "test-token"}
		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.GetTestLlamaStackURL(), "token_mock", false, nil, "/v1")
		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, identity)
		ctx = context.WithValue(ctx, constants.LlamaStackClientKey, llamaStackClient)
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()
		app.LlamaStackListVectorStoresHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)

		body, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()

		var response VectorStoresResponse
		err = json.Unmarshal(body, &response)
		assert.NoError(t, err)

		// TEMPORARY: Handler now returns user-specific vectorstore (auto-provisioned if needed)
		vectorStores := response.Data.([]interface{})
		assert.Len(t, vectorStores, 1)

		firstStore := vectorStores[0].(map[string]interface{})
		assert.NotEmpty(t, firstStore["id"])
		// Name should be hashed username (32 char hex from SHA256)
		assert.Len(t, firstStore["name"].(string), 32)
		assert.Contains(t, []string{"completed", "in_progress"}, firstStore["status"])
	})

	It("should list vector stores with limit parameter", func() {
		t := GinkgoT()
		req, err := http.NewRequest(http.MethodGet, "/gen-ai/api/v1/vectorstores?namespace="+testutil.TestNamespace+"&limit=5", nil)
		assert.NoError(t, err)

		identity := &integrations.RequestIdentity{Token: "test-token"}
		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.GetTestLlamaStackURL(), "token_mock", false, nil, "/v1")
		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, identity)
		ctx = context.WithValue(ctx, constants.LlamaStackClientKey, llamaStackClient)
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()
		app.LlamaStackListVectorStoresHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)

		body, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()

		var response VectorStoresResponse
		err = json.Unmarshal(body, &response)
		assert.NoError(t, err)

		vectorStores := response.Data.([]interface{})
		assert.Len(t, vectorStores, 1) // Mock always returns 1
	})

	It("should list vector stores with order parameter", func() {
		t := GinkgoT()
		req, err := http.NewRequest(http.MethodGet, "/gen-ai/api/v1/vectorstores?namespace="+testutil.TestNamespace+"&order=desc", nil)
		assert.NoError(t, err)

		identity := &integrations.RequestIdentity{Token: "test-token"}
		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.GetTestLlamaStackURL(), "token_mock", false, nil, "/v1")
		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, identity)
		ctx = context.WithValue(ctx, constants.LlamaStackClientKey, llamaStackClient)
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()
		app.LlamaStackListVectorStoresHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)

		body, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()

		var response VectorStoresResponse
		err = json.Unmarshal(body, &response)
		assert.NoError(t, err)

		vectorStores := response.Data.([]interface{})
		assert.Len(t, vectorStores, 1)
	})

	It("should list vector stores with both limit and order parameters", func() {
		t := GinkgoT()
		req, err := http.NewRequest(http.MethodGet, "/gen-ai/api/v1/vectorstores?namespace="+testutil.TestNamespace+"&limit=10&order=asc", nil)
		assert.NoError(t, err)

		identity := &integrations.RequestIdentity{Token: "test-token"}
		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.GetTestLlamaStackURL(), "token_mock", false, nil, "/v1")
		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, identity)
		ctx = context.WithValue(ctx, constants.LlamaStackClientKey, llamaStackClient)
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()
		app.LlamaStackListVectorStoresHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)

		body, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()

		var response VectorStoresResponse
		err = json.Unmarshal(body, &response)
		assert.NoError(t, err)

		vectorStores := response.Data.([]interface{})
		assert.Len(t, vectorStores, 1)
	})

	It("should ignore invalid limit parameter", func() {
		t := GinkgoT()
		req, err := http.NewRequest(http.MethodGet, "/gen-ai/api/v1/vectorstores?namespace="+testutil.TestNamespace+"&limit=invalid", nil)
		assert.NoError(t, err)

		identity := &integrations.RequestIdentity{Token: "test-token"}
		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.GetTestLlamaStackURL(), "token_mock", false, nil, "/v1")
		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, identity)
		ctx = context.WithValue(ctx, constants.LlamaStackClientKey, llamaStackClient)
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()
		app.LlamaStackListVectorStoresHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code) // Should still work, ignore invalid param
	})

	It("should ignore invalid order parameter", func() {
		t := GinkgoT()
		req, err := http.NewRequest(http.MethodGet, "/gen-ai/api/v1/vectorstores?namespace="+testutil.TestNamespace+"&order=invalid", nil)
		assert.NoError(t, err)

		identity := &integrations.RequestIdentity{Token: "test-token"}
		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.GetTestLlamaStackURL(), "token_mock", false, nil, "/v1")
		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, identity)
		ctx = context.WithValue(ctx, constants.LlamaStackClientKey, llamaStackClient)
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()
		app.LlamaStackListVectorStoresHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code) // Should still work, ignore invalid param
	})

	It("should use unified repository pattern", func() {
		t := GinkgoT()
		assert.NotNil(t, app.repositories)
		assert.NotNil(t, app.repositories.VectorStores)

		req, err := http.NewRequest(http.MethodGet, "/gen-ai/api/v1/vectorstores?namespace="+testutil.TestNamespace, nil)
		assert.NoError(t, err)

		identity := &integrations.RequestIdentity{Token: "test-token"}
		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.GetTestLlamaStackURL(), "token_mock", false, nil, "/v1")
		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, identity)
		ctx = context.WithValue(ctx, constants.LlamaStackClientKey, llamaStackClient)
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()
		app.LlamaStackListVectorStoresHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)
	})
})

var _ = Describe("LlamaStackCreateVectorStoreHandler", func() {
	var app App
	var createJSONRequest func(payload interface{}) (*http.Request, error)

	BeforeEach(func() {
		llamaStackClientFactory := lsmocks.NewMockClientFactory()
		app = App{
			config: config.EnvConfig{
				Port: 4000,
			},
			llamaStackClientFactory: llamaStackClientFactory,
			repositories:            repositories.NewRepositories(),
		}

		createJSONRequest = func(payload interface{}) (*http.Request, error) {
			jsonData, err := json.Marshal(payload)
			if err != nil {
				return nil, err
			}

			req, err := http.NewRequest(http.MethodPost, "/gen-ai/api/v1/vectorstores?namespace="+testutil.TestNamespace, bytes.NewBuffer(jsonData))
			if err != nil {
				return nil, err
			}
			req.Header.Set("Content-Type", "application/json")
			return req, nil
		}
	})

	It("should create vector store with name only", func() {
		t := GinkgoT()
		payload := CreateVectorStoreRequest{
			Name: "Test Vector Store",
		}

		req, err := createJSONRequest(payload)
		assert.NoError(t, err)

		identity := &integrations.RequestIdentity{Token: "test-token"}
		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.GetTestLlamaStackURL(), "token_mock", false, nil, "/v1")
		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, identity)
		ctx = context.WithValue(ctx, constants.LlamaStackClientKey, llamaStackClient)
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()
		app.LlamaStackCreateVectorStoreHandler(rr, req, nil)

		assert.Equal(t, http.StatusCreated, rr.Code)

		body, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()

		var response VectorStoreResponse
		err = json.Unmarshal(body, &response)
		assert.NoError(t, err)

		vectorStore := response.Data.(map[string]interface{})
		assert.NotEmpty(t, vectorStore["id"])
		assert.Equal(t, "Test Vector Store", vectorStore["name"])
		assert.Contains(t, []string{"completed", "in_progress"}, vectorStore["status"])
	})

	It("should create vector store with name and metadata", func() {
		t := GinkgoT()
		payload := CreateVectorStoreRequest{
			Name: "Test Vector Store with Metadata",
			Metadata: map[string]string{
				"purpose":     "testing",
				"environment": "development",
				"team":        "engineering",
			},
		}

		req, err := createJSONRequest(payload)
		assert.NoError(t, err)

		identity := &integrations.RequestIdentity{Token: "test-token"}
		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.GetTestLlamaStackURL(), "token_mock", false, nil, "/v1")
		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, identity)
		ctx = context.WithValue(ctx, constants.LlamaStackClientKey, llamaStackClient)
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()
		app.LlamaStackCreateVectorStoreHandler(rr, req, nil)

		assert.Equal(t, http.StatusCreated, rr.Code)

		body, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()

		var response VectorStoreResponse
		err = json.Unmarshal(body, &response)
		assert.NoError(t, err)

		vectorStore := response.Data.(map[string]interface{})
		assert.NotEmpty(t, vectorStore["id"])
		assert.Equal(t, "Test Vector Store with Metadata", vectorStore["name"])
	})

	It("should return error for empty name", func() {
		t := GinkgoT()
		payload := CreateVectorStoreRequest{
			Name: "",
		}

		req, err := createJSONRequest(payload)
		assert.NoError(t, err)

		identity := &integrations.RequestIdentity{Token: "test-token"}
		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.GetTestLlamaStackURL(), "token_mock", false, nil, "/v1")
		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, identity)
		ctx = context.WithValue(ctx, constants.LlamaStackClientKey, llamaStackClient)
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()
		app.LlamaStackCreateVectorStoreHandler(rr, req, nil)

		assert.Equal(t, http.StatusBadRequest, rr.Code)

		body, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()

		var response map[string]interface{}
		err = json.Unmarshal(body, &response)
		assert.NoError(t, err)

		errorObj := response["error"].(map[string]interface{})
		assert.Contains(t, errorObj["message"], "name is required")
	})

	It("should return error for whitespace-only name", func() {
		t := GinkgoT()
		payload := CreateVectorStoreRequest{
			Name: "   ",
		}

		req, err := createJSONRequest(payload)
		assert.NoError(t, err)

		identity := &integrations.RequestIdentity{Token: "test-token"}
		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.GetTestLlamaStackURL(), "token_mock", false, nil, "/v1")
		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, identity)
		ctx = context.WithValue(ctx, constants.LlamaStackClientKey, llamaStackClient)
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()
		app.LlamaStackCreateVectorStoreHandler(rr, req, nil)

		assert.Equal(t, http.StatusBadRequest, rr.Code)

		body, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()

		var response map[string]interface{}
		err = json.Unmarshal(body, &response)
		assert.NoError(t, err)

		errorObj := response["error"].(map[string]interface{})
		assert.Contains(t, errorObj["message"], "name is required")
	})

	It("should return error for invalid JSON", func() {
		t := GinkgoT()
		req, err := http.NewRequest(http.MethodPost, "/gen-ai/api/v1/vectorstores?namespace="+testutil.TestNamespace, bytes.NewBuffer([]byte("invalid json")))
		assert.NoError(t, err)
		req.Header.Set("Content-Type", "application/json")

		identity := &integrations.RequestIdentity{Token: "test-token"}
		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.GetTestLlamaStackURL(), "token_mock", false, nil, "/v1")
		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, identity)
		ctx = context.WithValue(ctx, constants.LlamaStackClientKey, llamaStackClient)
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()
		app.LlamaStackCreateVectorStoreHandler(rr, req, nil)

		assert.Equal(t, http.StatusBadRequest, rr.Code)

		body, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()

		var response map[string]interface{}
		err = json.Unmarshal(body, &response)
		assert.NoError(t, err)

		assert.Contains(t, response, "error")
	})

	It("should use unified repository pattern", func() {
		t := GinkgoT()
		assert.NotNil(t, app.repositories)
		assert.NotNil(t, app.repositories.VectorStores)

		payload := CreateVectorStoreRequest{
			Name: "Repository Pattern Test",
		}

		req, err := createJSONRequest(payload)
		assert.NoError(t, err)

		identity := &integrations.RequestIdentity{Token: "test-token"}
		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.GetTestLlamaStackURL(), "token_mock", false, nil, "/v1")
		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, identity)
		ctx = context.WithValue(ctx, constants.LlamaStackClientKey, llamaStackClient)
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()
		app.LlamaStackCreateVectorStoreHandler(rr, req, nil)

		assert.Equal(t, http.StatusCreated, rr.Code)

		var response map[string]interface{}
		body, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()

		err = json.Unmarshal(body, &response)
		assert.NoError(t, err)

		assert.Contains(t, response, "data")
		data := response["data"].(map[string]interface{})

		expectedFields := []string{"id", "object", "created_at", "name", "status"}
		for _, field := range expectedFields {
			assert.Contains(t, data, field)
		}
	})

	It("should handle metadata correctly", func() {
		t := GinkgoT()
		metadata := map[string]string{
			"key1": "value1",
			"key2": "value2",
		}

		payload := CreateVectorStoreRequest{
			Name:     "Metadata Test Store",
			Metadata: metadata,
		}

		req, err := createJSONRequest(payload)
		assert.NoError(t, err)

		identity := &integrations.RequestIdentity{Token: "test-token"}
		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.GetTestLlamaStackURL(), "token_mock", false, nil, "/v1")
		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, identity)
		ctx = context.WithValue(ctx, constants.LlamaStackClientKey, llamaStackClient)
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()
		app.LlamaStackCreateVectorStoreHandler(rr, req, nil)

		assert.Equal(t, http.StatusCreated, rr.Code)

		body, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()

		var response VectorStoreResponse
		err = json.Unmarshal(body, &response)
		assert.NoError(t, err)

		vectorStore := response.Data.(map[string]interface{})
		assert.Equal(t, "Metadata Test Store", vectorStore["name"])
		assert.Contains(t, vectorStore, "metadata")
	})
})

var _ = Describe("LlamaStackDeleteVectorStoreHandler", func() {
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

	It("successful delete vector store", func() {
		t := GinkgoT()
		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.GetTestLlamaStackURL(), "token_mock", false, nil, "/v1")

		// First create a vector store to delete
		createPayload := CreateVectorStoreRequest{Name: "VS to Delete"}
		jsonData, err := json.Marshal(createPayload)
		assert.NoError(t, err)

		createReq := httptest.NewRequest(http.MethodPost, "/gen-ai/api/v1/vectorstores?namespace="+testutil.TestNamespace, bytes.NewBuffer(jsonData))
		createReq.Header.Set("Content-Type", "application/json")
		identity := &integrations.RequestIdentity{Token: "test-token"}
		createCtx := context.WithValue(createReq.Context(), constants.RequestIdentityKey, identity)
		createCtx = context.WithValue(createCtx, constants.LlamaStackClientKey, llamaStackClient)
		createReq = createReq.WithContext(createCtx)

		createRR := httptest.NewRecorder()
		app.LlamaStackCreateVectorStoreHandler(createRR, createReq, nil)
		require.Equal(t, http.StatusCreated, createRR.Code, "setup: create vector store should succeed")

		var createResp VectorStoreResponse
		err = json.Unmarshal(createRR.Body.Bytes(), &createResp)
		assert.NoError(t, err)
		vsID := createResp.Data.(map[string]interface{})["id"].(string)

		// Now delete it
		req := httptest.NewRequest(http.MethodDelete, constants.VectorStoresDeletePath+"?namespace=default&vector_store_id="+vsID, nil)
		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, identity)
		ctx = context.WithValue(ctx, constants.NamespaceQueryParameterKey, "default")
		ctx = context.WithValue(ctx, constants.LlamaStackClientKey, llamaStackClient)
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()
		app.LlamaStackDeleteVectorStoreHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)

		responseBody, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()

		var response map[string]interface{}
		err = json.Unmarshal(responseBody, &response)
		assert.NoError(t, err)

		assert.Contains(t, response, "data")
		data := response["data"].(map[string]interface{})
		assert.Equal(t, vsID, data["id"])
		assert.Equal(t, "vector_store.deleted", data["object"])
		assert.Equal(t, true, data["deleted"])
	})

	It("missing vector_store_id parameter", func() {
		t := GinkgoT()
		req := httptest.NewRequest(http.MethodDelete, constants.VectorStoresDeletePath+"?namespace=default", nil)
		identity := &integrations.RequestIdentity{Token: "test-token"}
		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, identity)
		ctx = context.WithValue(ctx, constants.NamespaceQueryParameterKey, "default")
		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.GetTestLlamaStackURL(), "token_mock", false, nil, "/v1")
		ctx = context.WithValue(ctx, constants.LlamaStackClientKey, llamaStackClient)
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()
		app.LlamaStackDeleteVectorStoreHandler(rr, req, nil)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
	})

	It("missing LlamaStack client in context", func() {
		t := GinkgoT()
		req := httptest.NewRequest(http.MethodDelete, constants.VectorStoresDeletePath+"?namespace=default&vector_store_id=vs-test123", nil)
		// Simulate AttachNamespace middleware but skip AttachLlamaStackClient
		ctx := context.WithValue(req.Context(), constants.NamespaceQueryParameterKey, "default")
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()
		app.LlamaStackDeleteVectorStoreHandler(rr, req, nil)

		assert.Equal(t, http.StatusInternalServerError, rr.Code)
	})
})

var _ = Describe("LlamaStackListVectorStoreFilesHandler", func() {
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

	It("successful list vector store files", func() {
		t := GinkgoT()
		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.GetTestLlamaStackURL(), "token_mock", false, nil, "/v1")

		// Create a vector store first to get a valid ID
		createPayload := CreateVectorStoreRequest{Name: "VS for File List"}
		jsonData, err := json.Marshal(createPayload)
		assert.NoError(t, err)

		createReq := httptest.NewRequest(http.MethodPost, "/gen-ai/api/v1/vectorstores?namespace="+testutil.TestNamespace, bytes.NewBuffer(jsonData))
		createReq.Header.Set("Content-Type", "application/json")
		identity := &integrations.RequestIdentity{Token: "test-token"}
		createCtx := context.WithValue(createReq.Context(), constants.RequestIdentityKey, identity)
		createCtx = context.WithValue(createCtx, constants.LlamaStackClientKey, llamaStackClient)
		createReq = createReq.WithContext(createCtx)

		createRR := httptest.NewRecorder()
		app.LlamaStackCreateVectorStoreHandler(createRR, createReq, nil)
		require.Equal(t, http.StatusCreated, createRR.Code, "setup: create vector store should succeed")

		var createResp VectorStoreResponse
		err = json.Unmarshal(createRR.Body.Bytes(), &createResp)
		assert.NoError(t, err)
		vsID := createResp.Data.(map[string]interface{})["id"].(string)

		req := httptest.NewRequest(http.MethodGet, constants.VectorStoreFilesListPath+"?namespace=default&vector_store_id="+vsID, nil)
		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, identity)
		ctx = context.WithValue(ctx, constants.NamespaceQueryParameterKey, "default")
		ctx = context.WithValue(ctx, constants.LlamaStackClientKey, llamaStackClient)
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()
		app.LlamaStackListVectorStoreFilesHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)

		responseBody, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()

		var response map[string]interface{}
		err = json.Unmarshal(responseBody, &response)
		assert.NoError(t, err)

		assert.Contains(t, response, "data")
		data := response["data"].([]interface{})
		assert.NotNil(t, data, "should return a list (may be empty)")
	})

	It("list vector store files with query parameters", func() {
		t := GinkgoT()
		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.GetTestLlamaStackURL(), "token_mock", false, nil, "/v1")

		// Create a vector store first
		createPayload := CreateVectorStoreRequest{Name: "VS for Param Test"}
		jsonData, err := json.Marshal(createPayload)
		assert.NoError(t, err)

		createReq := httptest.NewRequest(http.MethodPost, "/gen-ai/api/v1/vectorstores?namespace="+testutil.TestNamespace, bytes.NewBuffer(jsonData))
		createReq.Header.Set("Content-Type", "application/json")
		identity := &integrations.RequestIdentity{Token: "test-token"}
		createCtx := context.WithValue(createReq.Context(), constants.RequestIdentityKey, identity)
		createCtx = context.WithValue(createCtx, constants.LlamaStackClientKey, llamaStackClient)
		createReq = createReq.WithContext(createCtx)

		createRR := httptest.NewRecorder()
		app.LlamaStackCreateVectorStoreHandler(createRR, createReq, nil)
		require.Equal(t, http.StatusCreated, createRR.Code, "setup: create vector store should succeed")

		var createResp VectorStoreResponse
		err = json.Unmarshal(createRR.Body.Bytes(), &createResp)
		assert.NoError(t, err)
		vsID := createResp.Data.(map[string]interface{})["id"].(string)

		req := httptest.NewRequest(http.MethodGet, constants.VectorStoreFilesListPath+"?namespace=default&vector_store_id="+vsID+"&limit=10&order=desc&filter=completed", nil)
		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, identity)
		ctx = context.WithValue(ctx, constants.NamespaceQueryParameterKey, "default")
		ctx = context.WithValue(ctx, constants.LlamaStackClientKey, llamaStackClient)
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()
		app.LlamaStackListVectorStoreFilesHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)

		responseBody, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()

		var response map[string]interface{}
		err = json.Unmarshal(responseBody, &response)
		assert.NoError(t, err)

		assert.Contains(t, response, "data")
	})

	It("missing vector_store_id parameter", func() {
		t := GinkgoT()
		req := httptest.NewRequest(http.MethodGet, constants.VectorStoreFilesListPath+"?namespace=default", nil)
		identity := &integrations.RequestIdentity{Token: "test-token"}
		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, identity)
		ctx = context.WithValue(ctx, constants.NamespaceQueryParameterKey, "default")
		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.GetTestLlamaStackURL(), "token_mock", false, nil, "/v1")
		ctx = context.WithValue(ctx, constants.LlamaStackClientKey, llamaStackClient)
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()
		app.LlamaStackListVectorStoreFilesHandler(rr, req, nil)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
	})

	It("invalid limit parameter", func() {
		t := GinkgoT()
		req := httptest.NewRequest(http.MethodGet, constants.VectorStoreFilesListPath+"?namespace=default&vector_store_id=vs-test123&limit=invalid", nil)
		identity := &integrations.RequestIdentity{Token: "test-token"}
		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, identity)
		ctx = context.WithValue(ctx, constants.NamespaceQueryParameterKey, "default")
		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.GetTestLlamaStackURL(), "token_mock", false, nil, "/v1")
		ctx = context.WithValue(ctx, constants.LlamaStackClientKey, llamaStackClient)
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()
		app.LlamaStackListVectorStoreFilesHandler(rr, req, nil)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
	})
})

var _ = Describe("LlamaStackDeleteVectorStoreFileHandler", func() {
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

	It("delete vector store file for non-member file", func() {
		t := GinkgoT()
		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.GetTestLlamaStackURL(), "token_mock", false, nil, "/v1")
		identity := &integrations.RequestIdentity{Token: "test-token"}

		// Create a vector store first
		createPayload := CreateVectorStoreRequest{Name: "VS for File Delete"}
		jsonData, err := json.Marshal(createPayload)
		assert.NoError(t, err)

		createReq := httptest.NewRequest(http.MethodPost, "/gen-ai/api/v1/vectorstores?namespace="+testutil.TestNamespace, bytes.NewBuffer(jsonData))
		createReq.Header.Set("Content-Type", "application/json")
		createCtx := context.WithValue(createReq.Context(), constants.RequestIdentityKey, identity)
		createCtx = context.WithValue(createCtx, constants.LlamaStackClientKey, llamaStackClient)
		createReq = createReq.WithContext(createCtx)

		createRR := httptest.NewRecorder()
		app.LlamaStackCreateVectorStoreHandler(createRR, createReq, nil)
		require.Equal(t, http.StatusCreated, createRR.Code, "setup: create vector store should succeed")

		var createResp VectorStoreResponse
		err = json.Unmarshal(createRR.Body.Bytes(), &createResp)
		assert.NoError(t, err)
		vsID := createResp.Data.(map[string]interface{})["id"].(string)

		// Upload a file (not added to the vector store)
		fileResp, err := uploadTestFile(testutil.GetTestLlamaStackURL())
		require.NoError(t, err, "setup: file upload should succeed")
		fileID := fileResp

		req := httptest.NewRequest(http.MethodDelete, constants.VectorStoreFilesDeletePath+"?namespace=default&vector_store_id="+vsID+"&file_id="+fileID, nil)
		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, identity)
		ctx = context.WithValue(ctx, constants.NamespaceQueryParameterKey, "default")
		ctx = context.WithValue(ctx, constants.LlamaStackClientKey, llamaStackClient)
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()
		app.LlamaStackDeleteVectorStoreFileHandler(rr, req, nil)

		assert.True(t, rr.Code == http.StatusBadRequest || rr.Code == http.StatusNotFound,
			"Expected 400 or 404 for non-member file delete, got %d", rr.Code)
	})

	It("missing vector_store_id parameter", func() {
		t := GinkgoT()
		req := httptest.NewRequest(http.MethodDelete, constants.VectorStoreFilesDeletePath+"?namespace=default&file_id=file-test456", nil)
		identity := &integrations.RequestIdentity{Token: "test-token"}
		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, identity)
		ctx = context.WithValue(ctx, constants.NamespaceQueryParameterKey, "default")
		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.GetTestLlamaStackURL(), "token_mock", false, nil, "/v1")
		ctx = context.WithValue(ctx, constants.LlamaStackClientKey, llamaStackClient)
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()
		app.LlamaStackDeleteVectorStoreFileHandler(rr, req, nil)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
	})

	It("missing file_id parameter", func() {
		t := GinkgoT()
		req := httptest.NewRequest(http.MethodDelete, constants.VectorStoreFilesDeletePath+"?namespace=default&vector_store_id=vs-test123", nil)
		identity := &integrations.RequestIdentity{Token: "test-token"}
		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, identity)
		ctx = context.WithValue(ctx, constants.NamespaceQueryParameterKey, "default")
		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.GetTestLlamaStackURL(), "token_mock", false, nil, "/v1")
		ctx = context.WithValue(ctx, constants.LlamaStackClientKey, llamaStackClient)
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()
		app.LlamaStackDeleteVectorStoreFileHandler(rr, req, nil)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
	})

	It("missing LlamaStack client in context", func() {
		t := GinkgoT()
		req := httptest.NewRequest(http.MethodDelete, constants.VectorStoreFilesDeletePath+"?namespace=default&vector_store_id=vs-test123&file_id=file-test456", nil)
		// Simulate AttachNamespace middleware but skip AttachLlamaStackClient
		ctx := context.WithValue(req.Context(), constants.NamespaceQueryParameterKey, "default")
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()
		app.LlamaStackDeleteVectorStoreFileHandler(rr, req, nil)

		assert.Equal(t, http.StatusInternalServerError, rr.Code)
	})
})
