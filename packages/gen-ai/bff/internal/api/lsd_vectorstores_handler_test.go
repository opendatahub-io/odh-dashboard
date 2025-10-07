package api

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

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

func TestLlamaStackListVectorStoresHandler(t *testing.T) {
	// Setup test environment
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	testEnv, ctrlClient, err := k8smocks.SetupEnvTest(k8smocks.TestEnvInput{
		Users:  k8smocks.DefaultTestUsers,
		Logger: slog.Default(),
		Ctx:    ctx,
		Cancel: cancel,
	})
	require.NoError(t, err)
	defer func() {
		if err := testEnv.Stop(); err != nil {
			t.Logf("Failed to stop test environment: %v", err)
		}
	}()

	// Create mock factories
	k8sFactory, err := k8smocks.NewTokenClientFactory(ctrlClient, testEnv.Config, slog.Default())
	require.NoError(t, err)

	llamaStackClientFactory := lsmocks.NewMockClientFactory()
	app := App{
		config: config.EnvConfig{
			Port: 4000,
		},
		llamaStackClientFactory: llamaStackClientFactory,
		kubernetesClientFactory: k8sFactory,
		repositories:            repositories.NewRepositories(),
		logger:                  slog.Default(),
	}

	t.Run("should list vector stores without parameters", func(t *testing.T) {
		req, err := http.NewRequest(http.MethodGet, "/gen-ai/api/v1/vectorstores?namespace="+testutil.TestNamespace, nil)
		assert.NoError(t, err)

		// Simulate middleware: add RequestIdentity and LlamaStack client to context
		identity := &integrations.RequestIdentity{Token: "test-token"}
		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.TestLlamaStackURL)
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

		// Verify the returned vector store (will be auto-provisioned with hashed username)
		firstStore := vectorStores[0].(map[string]interface{})
		assert.NotEmpty(t, firstStore["id"])
		// Name should be hashed username (32 char hex from SHA256)
		assert.Len(t, firstStore["name"].(string), 32)
		assert.Contains(t, []string{"completed", "in_progress"}, firstStore["status"])
	})

	t.Run("should list vector stores with limit parameter", func(t *testing.T) {
		req, err := http.NewRequest(http.MethodGet, "/gen-ai/api/v1/vectorstores?namespace="+testutil.TestNamespace+"&limit=5", nil)
		assert.NoError(t, err)

		// Simulate middleware: add RequestIdentity and LlamaStack client to context
		identity := &integrations.RequestIdentity{Token: "test-token"}
		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.TestLlamaStackURL)
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

	t.Run("should list vector stores with order parameter", func(t *testing.T) {
		req, err := http.NewRequest(http.MethodGet, "/gen-ai/api/v1/vectorstores?namespace="+testutil.TestNamespace+"&order=desc", nil)
		assert.NoError(t, err)

		// Simulate middleware: add RequestIdentity and LlamaStack client to context
		identity := &integrations.RequestIdentity{Token: "test-token"}
		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.TestLlamaStackURL)
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

	t.Run("should list vector stores with both limit and order parameters", func(t *testing.T) {
		req, err := http.NewRequest(http.MethodGet, "/gen-ai/api/v1/vectorstores?namespace="+testutil.TestNamespace+"&limit=10&order=asc", nil)
		assert.NoError(t, err)

		// Simulate middleware: add RequestIdentity and LlamaStack client to context
		identity := &integrations.RequestIdentity{Token: "test-token"}
		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.TestLlamaStackURL)
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

	t.Run("should ignore invalid limit parameter", func(t *testing.T) {
		req, err := http.NewRequest(http.MethodGet, "/gen-ai/api/v1/vectorstores?namespace="+testutil.TestNamespace+"&limit=invalid", nil)
		assert.NoError(t, err)

		// Simulate middleware: add RequestIdentity and LlamaStack client to context
		identity := &integrations.RequestIdentity{Token: "test-token"}
		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.TestLlamaStackURL)
		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, identity)
		ctx = context.WithValue(ctx, constants.LlamaStackClientKey, llamaStackClient)
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()
		app.LlamaStackListVectorStoresHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code) // Should still work, ignore invalid param
	})

	t.Run("should ignore invalid order parameter", func(t *testing.T) {
		req, err := http.NewRequest(http.MethodGet, "/gen-ai/api/v1/vectorstores?namespace="+testutil.TestNamespace+"&order=invalid", nil)
		assert.NoError(t, err)

		// Simulate middleware: add RequestIdentity and LlamaStack client to context
		identity := &integrations.RequestIdentity{Token: "test-token"}
		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.TestLlamaStackURL)
		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, identity)
		ctx = context.WithValue(ctx, constants.LlamaStackClientKey, llamaStackClient)
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()
		app.LlamaStackListVectorStoresHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code) // Should still work, ignore invalid param
	})

	t.Run("should use unified repository pattern", func(t *testing.T) {
		assert.NotNil(t, app.repositories)
		assert.NotNil(t, app.repositories.VectorStores)

		req, err := http.NewRequest(http.MethodGet, "/gen-ai/api/v1/vectorstores?namespace="+testutil.TestNamespace, nil)
		assert.NoError(t, err)

		// Simulate middleware: add RequestIdentity and LlamaStack client to context
		identity := &integrations.RequestIdentity{Token: "test-token"}
		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.TestLlamaStackURL)
		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, identity)
		ctx = context.WithValue(ctx, constants.LlamaStackClientKey, llamaStackClient)
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()
		app.LlamaStackListVectorStoresHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)
	})
}

func TestLlamaStackCreateVectorStoreHandler(t *testing.T) {
	// Create test app with mock client
	llamaStackClientFactory := lsmocks.NewMockClientFactory()
	app := App{
		config: config.EnvConfig{
			Port: 4000,
		},
		llamaStackClientFactory: llamaStackClientFactory,
		repositories:            repositories.NewRepositories(),
	}

	// Helper function to create JSON request
	createJSONRequest := func(payload interface{}) (*http.Request, error) {
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

	t.Run("should create vector store with name only", func(t *testing.T) {
		payload := CreateVectorStoreRequest{
			Name: "Test Vector Store",
		}

		req, err := createJSONRequest(payload)
		assert.NoError(t, err)

		// Simulate middleware: add RequestIdentity and LlamaStack client to context
		identity := &integrations.RequestIdentity{Token: "test-token"}
		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.TestLlamaStackURL)
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

		// Verify mock response structure
		vectorStore := response.Data.(map[string]interface{})
		assert.Equal(t, "vs_mock_new123", vectorStore["id"])
		assert.Equal(t, "Test Vector Store", vectorStore["name"])
		assert.Equal(t, "completed", vectorStore["status"])
	})

	t.Run("should create vector store with name and metadata", func(t *testing.T) {
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

		// Simulate middleware: add RequestIdentity and LlamaStack client to context
		identity := &integrations.RequestIdentity{Token: "test-token"}
		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.TestLlamaStackURL)
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
		assert.Equal(t, "vs_mock_new123", vectorStore["id"])
		assert.Equal(t, "Test Vector Store with Metadata", vectorStore["name"])
	})

	t.Run("should return error for empty name", func(t *testing.T) {
		payload := CreateVectorStoreRequest{
			Name: "",
		}

		req, err := createJSONRequest(payload)
		assert.NoError(t, err)

		// Simulate middleware: add RequestIdentity and LlamaStack client to context
		identity := &integrations.RequestIdentity{Token: "test-token"}
		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.TestLlamaStackURL)
		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, identity)
		ctx = context.WithValue(ctx, constants.LlamaStackClientKey, llamaStackClient)
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()
		app.LlamaStackCreateVectorStoreHandler(rr, req, nil)

		// Should return 400 Bad Request for empty name
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

	t.Run("should return error for whitespace-only name", func(t *testing.T) {
		payload := CreateVectorStoreRequest{
			Name: "   ",
		}

		req, err := createJSONRequest(payload)
		assert.NoError(t, err)

		// Simulate middleware: add RequestIdentity and LlamaStack client to context
		identity := &integrations.RequestIdentity{Token: "test-token"}
		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.TestLlamaStackURL)
		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, identity)
		ctx = context.WithValue(ctx, constants.LlamaStackClientKey, llamaStackClient)
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()
		app.LlamaStackCreateVectorStoreHandler(rr, req, nil)

		// Should return 400 Bad Request for whitespace-only name
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

	t.Run("should return error for invalid JSON", func(t *testing.T) {
		req, err := http.NewRequest(http.MethodPost, "/gen-ai/api/v1/vectorstores?namespace="+testutil.TestNamespace, bytes.NewBuffer([]byte("invalid json")))
		assert.NoError(t, err)
		req.Header.Set("Content-Type", "application/json")

		// Simulate middleware: add RequestIdentity and LlamaStack client to context
		identity := &integrations.RequestIdentity{Token: "test-token"}
		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.TestLlamaStackURL)
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

	t.Run("should use unified repository pattern", func(t *testing.T) {
		// Verify we're using the domain-specific repository approach
		assert.NotNil(t, app.repositories)
		assert.NotNil(t, app.repositories.VectorStores)

		payload := CreateVectorStoreRequest{
			Name: "Repository Pattern Test",
		}

		req, err := createJSONRequest(payload)
		assert.NoError(t, err)

		// Simulate middleware: add RequestIdentity and LlamaStack client to context
		identity := &integrations.RequestIdentity{Token: "test-token"}
		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.TestLlamaStackURL)
		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, identity)
		ctx = context.WithValue(ctx, constants.LlamaStackClientKey, llamaStackClient)
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()
		app.LlamaStackCreateVectorStoreHandler(rr, req, nil)

		assert.Equal(t, http.StatusCreated, rr.Code)

		// Verify response structure
		var response map[string]interface{}
		body, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()

		err = json.Unmarshal(body, &response)
		assert.NoError(t, err)

		assert.Contains(t, response, "data")
		data := response["data"].(map[string]interface{})

		// Verify vector store fields
		expectedFields := []string{"id", "object", "created_at", "name", "status"}
		for _, field := range expectedFields {
			assert.Contains(t, data, field)
		}
	})

	t.Run("should handle metadata correctly", func(t *testing.T) {
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

		// Simulate middleware: add RequestIdentity and LlamaStack client to context
		identity := &integrations.RequestIdentity{Token: "test-token"}
		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.TestLlamaStackURL)
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
}

func TestLlamaStackDeleteVectorStoreHandler(t *testing.T) {
	// Create test app with mock client (lightweight approach)
	llamaStackClientFactory := lsmocks.NewMockClientFactory()
	app := App{
		config: config.EnvConfig{
			Port: 4000,
		},
		llamaStackClientFactory: llamaStackClientFactory,
		repositories:            repositories.NewRepositories(),
	}

	t.Run("successful delete vector store", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodDelete, constants.VectorStoresDeletePath+"?namespace=default&vector_store_id=vs-test123", nil)
		// Simulate middleware: add RequestIdentity, namespace, and LlamaStack client to context
		identity := &integrations.RequestIdentity{Token: "test-token"}
		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, identity)
		ctx = context.WithValue(ctx, constants.NamespaceQueryParameterKey, "default")
		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.TestLlamaStackURL)
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

		// Verify envelope structure
		assert.Contains(t, response, "data")
		data := response["data"].(map[string]interface{})
		assert.Equal(t, "vs-test123", data["id"])
		assert.Equal(t, "vector_store.deleted", data["object"])
		assert.Equal(t, true, data["deleted"])
	})

	t.Run("missing vector_store_id parameter", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodDelete, constants.VectorStoresDeletePath+"?namespace=default", nil)
		// Simulate middleware: add RequestIdentity, namespace, and LlamaStack client to context
		identity := &integrations.RequestIdentity{Token: "test-token"}
		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, identity)
		ctx = context.WithValue(ctx, constants.NamespaceQueryParameterKey, "default")
		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.TestLlamaStackURL)
		ctx = context.WithValue(ctx, constants.LlamaStackClientKey, llamaStackClient)
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()
		app.LlamaStackDeleteVectorStoreHandler(rr, req, nil)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
	})

	t.Run("missing LlamaStack client in context", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodDelete, constants.VectorStoresDeletePath+"?namespace=default&vector_store_id=vs-test123", nil)
		// Simulate AttachNamespace middleware but skip AttachLlamaStackClient
		ctx := context.WithValue(req.Context(), constants.NamespaceQueryParameterKey, "default")
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()
		app.LlamaStackDeleteVectorStoreHandler(rr, req, nil)

		assert.Equal(t, http.StatusInternalServerError, rr.Code)
	})
}

func TestLlamaStackListVectorStoreFilesHandler(t *testing.T) {
	// Create test app with mock client (lightweight approach)
	llamaStackClientFactory := lsmocks.NewMockClientFactory()
	app := App{
		config: config.EnvConfig{
			Port: 4000,
		},
		llamaStackClientFactory: llamaStackClientFactory,
		repositories:            repositories.NewRepositories(),
	}

	t.Run("successful list vector store files", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, constants.VectorStoreFilesListPath+"?namespace=default&vector_store_id=vs-test123", nil)
		// Simulate middleware: add RequestIdentity, namespace, and LlamaStack client to context
		identity := &integrations.RequestIdentity{Token: "test-token"}
		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, identity)
		ctx = context.WithValue(ctx, constants.NamespaceQueryParameterKey, "default")
		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.TestLlamaStackURL)
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

		// Verify envelope structure
		assert.Contains(t, response, "data")
		data := response["data"].([]interface{})
		assert.Len(t, data, 2) // Mock returns 2 files

		// Verify first file structure
		firstFile := data[0].(map[string]interface{})
		assert.Equal(t, "file-mock123abc456def", firstFile["id"])
		assert.Equal(t, "vector_store.file", firstFile["object"])
		assert.Equal(t, "vs-test123", firstFile["vector_store_id"])
		assert.Equal(t, "completed", firstFile["status"])
	})

	t.Run("list vector store files with query parameters", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, constants.VectorStoreFilesListPath+"?namespace=default&vector_store_id=vs-test123&limit=10&order=desc&filter=completed", nil)
		// Simulate middleware: add RequestIdentity, namespace, and LlamaStack client to context
		identity := &integrations.RequestIdentity{Token: "test-token"}
		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, identity)
		ctx = context.WithValue(ctx, constants.NamespaceQueryParameterKey, "default")
		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.TestLlamaStackURL)
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

		// Verify envelope structure
		assert.Contains(t, response, "data")
		data := response["data"].([]interface{})
		assert.Len(t, data, 2) // Mock returns 2 files regardless of parameters
	})

	t.Run("missing vector_store_id parameter", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, constants.VectorStoreFilesListPath+"?namespace=default", nil)
		// Simulate middleware: add RequestIdentity, namespace, and LlamaStack client to context
		identity := &integrations.RequestIdentity{Token: "test-token"}
		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, identity)
		ctx = context.WithValue(ctx, constants.NamespaceQueryParameterKey, "default")
		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.TestLlamaStackURL)
		ctx = context.WithValue(ctx, constants.LlamaStackClientKey, llamaStackClient)
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()
		app.LlamaStackListVectorStoreFilesHandler(rr, req, nil)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
	})

	t.Run("invalid limit parameter", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, constants.VectorStoreFilesListPath+"?namespace=default&vector_store_id=vs-test123&limit=invalid", nil)
		// Simulate middleware: add RequestIdentity, namespace, and LlamaStack client to context
		identity := &integrations.RequestIdentity{Token: "test-token"}
		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, identity)
		ctx = context.WithValue(ctx, constants.NamespaceQueryParameterKey, "default")
		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.TestLlamaStackURL)
		ctx = context.WithValue(ctx, constants.LlamaStackClientKey, llamaStackClient)
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()
		app.LlamaStackListVectorStoreFilesHandler(rr, req, nil)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
	})
}

func TestLlamaStackDeleteVectorStoreFileHandler(t *testing.T) {
	// Create test app with mock client (lightweight approach)
	llamaStackClientFactory := lsmocks.NewMockClientFactory()
	app := App{
		config: config.EnvConfig{
			Port: 4000,
		},
		llamaStackClientFactory: llamaStackClientFactory,
		repositories:            repositories.NewRepositories(),
	}

	t.Run("successful delete vector store file", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodDelete, constants.VectorStoreFilesDeletePath+"?namespace=default&vector_store_id=vs-test123&file_id=file-test456", nil)
		// Simulate middleware: add RequestIdentity, namespace, and LlamaStack client to context
		identity := &integrations.RequestIdentity{Token: "test-token"}
		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, identity)
		ctx = context.WithValue(ctx, constants.NamespaceQueryParameterKey, "default")
		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.TestLlamaStackURL)
		ctx = context.WithValue(ctx, constants.LlamaStackClientKey, llamaStackClient)
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()
		app.LlamaStackDeleteVectorStoreFileHandler(rr, req, nil)

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
		assert.Equal(t, "file-test456", data["id"])
		assert.Equal(t, "vector_store.file.deleted", data["object"])
		assert.Equal(t, true, data["deleted"])
	})

	t.Run("missing vector_store_id parameter", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodDelete, constants.VectorStoreFilesDeletePath+"?namespace=default&file_id=file-test456", nil)
		// Simulate middleware: add RequestIdentity, namespace, and LlamaStack client to context
		identity := &integrations.RequestIdentity{Token: "test-token"}
		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, identity)
		ctx = context.WithValue(ctx, constants.NamespaceQueryParameterKey, "default")
		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.TestLlamaStackURL)
		ctx = context.WithValue(ctx, constants.LlamaStackClientKey, llamaStackClient)
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()
		app.LlamaStackDeleteVectorStoreFileHandler(rr, req, nil)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
	})

	t.Run("missing file_id parameter", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodDelete, constants.VectorStoreFilesDeletePath+"?namespace=default&vector_store_id=vs-test123", nil)
		// Simulate middleware: add RequestIdentity, namespace, and LlamaStack client to context
		identity := &integrations.RequestIdentity{Token: "test-token"}
		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, identity)
		ctx = context.WithValue(ctx, constants.NamespaceQueryParameterKey, "default")
		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.TestLlamaStackURL)
		ctx = context.WithValue(ctx, constants.LlamaStackClientKey, llamaStackClient)
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()
		app.LlamaStackDeleteVectorStoreFileHandler(rr, req, nil)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
	})

	t.Run("missing LlamaStack client in context", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodDelete, constants.VectorStoreFilesDeletePath+"?namespace=default&vector_store_id=vs-test123&file_id=file-test456", nil)
		// Simulate AttachNamespace middleware but skip AttachLlamaStackClient
		ctx := context.WithValue(req.Context(), constants.NamespaceQueryParameterKey, "default")
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()
		app.LlamaStackDeleteVectorStoreFileHandler(rr, req, nil)

		assert.Equal(t, http.StatusInternalServerError, rr.Code)
	})
}
