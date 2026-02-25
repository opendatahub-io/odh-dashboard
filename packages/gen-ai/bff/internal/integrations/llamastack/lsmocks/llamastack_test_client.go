package lsmocks

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/openai/openai-go/v2"
	"github.com/openai/openai-go/v2/option"
	"github.com/openai/openai-go/v2/packages/ssestream"
	"github.com/openai/openai-go/v2/responses"
	"github.com/opendatahub-io/gen-ai/internal/integrations/llamastack"
)

// testIDHeaderTransport injects X-LlamaStack-Provider-Data with __test_id
// into every HTTP request. This is required for the record-replay system to
// correctly isolate and match recordings per test.
type testIDHeaderTransport struct {
	base        http.RoundTripper
	headerValue string
}

func (t *testIDHeaderTransport) RoundTrip(req *http.Request) (*http.Response, error) {
	// Only inject if header is not already set (e.g., provider data from BFF handler)
	if req.Header.Get("X-LlamaStack-Provider-Data") == "" {
		req.Header.Set("X-LlamaStack-Provider-Data", t.headerValue)
	} else {
		// Merge __test_id into existing provider data
		existing := req.Header.Get("X-LlamaStack-Provider-Data")
		var data map[string]interface{}
		if err := json.Unmarshal([]byte(existing), &data); err == nil {
			if _, hasTestID := data["__test_id"]; !hasTestID {
				data["__test_id"] = extractTestID(t.headerValue)
				if merged, err := json.Marshal(data); err == nil {
					req.Header.Set("X-LlamaStack-Provider-Data", string(merged))
				}
			}
		}
	}
	return t.base.RoundTrip(req)
}

func extractTestID(headerValue string) string {
	var data map[string]interface{}
	if err := json.Unmarshal([]byte(headerValue), &data); err == nil {
		if id, ok := data["__test_id"].(string); ok {
			return id
		}
	}
	return ""
}

// TestLlamaStackClient wraps a real LlamaStackClient with test ID header injection.
// Every request sent through this client includes the X-LlamaStack-Provider-Data header
// required for record-replay to work.
type TestLlamaStackClient struct {
	inner *llamastack.LlamaStackClient
}

// NewTestLlamaStackClient creates a LlamaStack client that injects test ID headers.
func NewTestLlamaStackClient(baseURL string, testID string) *TestLlamaStackClient {
	headerValue := fmt.Sprintf(`{"__test_id": "%s"}`, testID)

	transport := &testIDHeaderTransport{
		base:        http.DefaultTransport,
		headerValue: headerValue,
	}

	httpClient := &http.Client{Transport: transport}

	client := openai.NewClient(
		option.WithBaseURL(baseURL+"/v1"),
		option.WithAPIKey("dummy-test-key"),
		option.WithHTTPClient(httpClient),
	)

	lsClient := &llamastack.LlamaStackClient{}
	llamastack.SetClientForTest(lsClient, &client)

	return &TestLlamaStackClient{inner: lsClient}
}

func (c *TestLlamaStackClient) ListModels(ctx context.Context) ([]openai.Model, error) {
	return c.inner.ListModels(ctx)
}

func (c *TestLlamaStackClient) ListVectorStores(ctx context.Context, params llamastack.ListVectorStoresParams) ([]openai.VectorStore, error) {
	return c.inner.ListVectorStores(ctx, params)
}

func (c *TestLlamaStackClient) CreateVectorStore(ctx context.Context, params llamastack.CreateVectorStoreParams) (*openai.VectorStore, error) {
	return c.inner.CreateVectorStore(ctx, params)
}

func (c *TestLlamaStackClient) DeleteVectorStore(ctx context.Context, vectorStoreID string) error {
	return c.inner.DeleteVectorStore(ctx, vectorStoreID)
}

func (c *TestLlamaStackClient) UploadFile(ctx context.Context, params llamastack.UploadFileParams) (*llamastack.FileUploadResult, error) {
	return c.inner.UploadFile(ctx, params)
}

func (c *TestLlamaStackClient) ListFiles(ctx context.Context, params llamastack.ListFilesParams) ([]openai.FileObject, error) {
	return c.inner.ListFiles(ctx, params)
}

func (c *TestLlamaStackClient) GetFile(ctx context.Context, fileID string) (*openai.FileObject, error) {
	return c.inner.GetFile(ctx, fileID)
}

func (c *TestLlamaStackClient) DeleteFile(ctx context.Context, fileID string) error {
	return c.inner.DeleteFile(ctx, fileID)
}

func (c *TestLlamaStackClient) ListVectorStoreFiles(ctx context.Context, vectorStoreID string, params llamastack.ListVectorStoreFilesParams) ([]openai.VectorStoreFile, error) {
	return c.inner.ListVectorStoreFiles(ctx, vectorStoreID, params)
}

func (c *TestLlamaStackClient) GetVectorStoreFile(ctx context.Context, vectorStoreID, fileID string) (*openai.VectorStoreFile, error) {
	return c.inner.GetVectorStoreFile(ctx, vectorStoreID, fileID)
}

func (c *TestLlamaStackClient) DeleteVectorStoreFile(ctx context.Context, vectorStoreID, fileID string) error {
	return c.inner.DeleteVectorStoreFile(ctx, vectorStoreID, fileID)
}

func (c *TestLlamaStackClient) CreateResponse(ctx context.Context, params llamastack.CreateResponseParams) (*responses.Response, error) {
	return c.inner.CreateResponse(ctx, params)
}

func (c *TestLlamaStackClient) CreateResponseStream(ctx context.Context, params llamastack.CreateResponseParams) (*ssestream.Stream[responses.ResponseStreamEventUnion], error) {
	return c.inner.CreateResponseStream(ctx, params)
}

func (c *TestLlamaStackClient) GetResponse(ctx context.Context, responseID string) (*responses.Response, error) {
	return c.inner.GetResponse(ctx, responseID)
}

func (c *TestLlamaStackClient) CreateModeration(ctx context.Context, input string, model string) (*openai.ModerationNewResponse, error) {
	return c.inner.CreateModeration(ctx, input, model)
}
