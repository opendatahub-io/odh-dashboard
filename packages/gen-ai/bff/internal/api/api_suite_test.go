package api

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
	"time"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
	"github.com/opendatahub-io/gen-ai/internal/config"
)

// TestAPIHandlers is the main test suite entry point
func TestAPIHandlers(t *testing.T) {
	RegisterFailHandler(Fail)
	RunSpecs(t, "API Handlers Suite")
}

// SharedTestContext holds common test infrastructure
type SharedTestContext struct {
	App        *App
	Server     *httptest.Server
	HTTPClient *http.Client
	BaseURL    string
	Logger     *slog.Logger
}

var testCtx *SharedTestContext

var _ = BeforeSuite(func() {
	By("Setting up test environment")

	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelDebug}))

	// Save current working directory
	originalWd, err := os.Getwd()
	Expect(err).NotTo(HaveOccurred())

	// Change to project root directory so OpenAPI handler can find the YAML file
	projectRoot := filepath.Join(originalWd, "..", "..")
	err = os.Chdir(projectRoot)
	Expect(err).NotTo(HaveOccurred())

	// Create test app with mock configuration
	cfg := config.EnvConfig{
		Port:          8080,
		APIPathPrefix: "/api/v1",
		AuthMethod:    config.AuthMethodDisabled,
		MockLSClient:  true,
	}

	app, err := NewApp(cfg, logger)
	Expect(err).NotTo(HaveOccurred())

	// Restore original working directory
	err = os.Chdir(originalWd)
	Expect(err).NotTo(HaveOccurred())

	server := httptest.NewServer(app.Routes())

	httpClient := &http.Client{
		Timeout: 30 * time.Second,
	}

	testCtx = &SharedTestContext{
		App:        app,
		Server:     server,
		HTTPClient: httpClient,
		BaseURL:    server.URL,
		Logger:     logger,
	}

	By("Test environment setup complete")
})

var _ = AfterSuite(func() {
	By("Cleaning up test environment")
	if testCtx != nil && testCtx.Server != nil {
		testCtx.Server.Close()
	}
	By("Test environment cleanup complete")
})

// MakeRequest is a helper to make HTTP requests in tests
func MakeRequest(req TestRequest) *http.Response {
	url := testCtx.BaseURL + req.Path

	// Add query parameters
	if len(req.QueryParams) > 0 {
		url += "?"
		for key, value := range req.QueryParams {
			url += fmt.Sprintf("%s=%s&", key, value)
		}
		url = url[:len(url)-1] // Remove trailing &
	}

	httpReq, err := http.NewRequest(req.Method, url, nil)
	if req.Body != nil {
		httpReq, err = http.NewRequestWithContext(context.Background(), req.Method, url,
			bytes.NewReader(req.Body))
	}
	Expect(err).NotTo(HaveOccurred())

	// Set headers
	for key, value := range req.Headers {
		httpReq.Header.Set(key, value)
	}

	resp, err := testCtx.HTTPClient.Do(httpReq)
	Expect(err).NotTo(HaveOccurred())

	return resp
}

// TestRequest represents a test HTTP request
type TestRequest struct {
	Method      string
	Path        string
	Body        []byte
	Headers     map[string]string
	QueryParams map[string]string
}

// JSONRequest creates a test request with JSON body
func JSONRequest(method, path string, body interface{}) TestRequest {
	var bodyBytes []byte
	if body != nil {
		var err error
		bodyBytes, err = json.Marshal(body)
		Expect(err).NotTo(HaveOccurred())
	}

	return TestRequest{
		Method: method,
		Path:   path,
		Body:   bodyBytes,
		Headers: map[string]string{
			"Content-Type": "application/json",
		},
	}
}

// ReadJSONResponse reads and unmarshals a JSON response
func ReadJSONResponse(resp *http.Response, target interface{}) {
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	Expect(err).NotTo(HaveOccurred())

	err = json.Unmarshal(body, target)
	Expect(err).NotTo(HaveOccurred())
}

// ReadResponseBody reads the response body as bytes
func ReadResponseBody(resp *http.Response) []byte {
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	Expect(err).NotTo(HaveOccurred())
	return body
}
