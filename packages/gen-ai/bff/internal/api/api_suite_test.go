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

	kservev1alpha1 "github.com/kserve/kserve/pkg/apis/serving/v1alpha1"
	kservev1beta1 "github.com/kserve/kserve/pkg/apis/serving/v1beta1"
	lsdapi "github.com/llamastack/llama-stack-k8s-operator/api/v1alpha1"
	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
	gorchv1alpha1 "github.com/trustyai-explainability/trustyai-service-operator/api/gorch/v1alpha1"
	apiextensionsv1 "k8s.io/apiextensions-apiserver/pkg/apis/apiextensions/v1"
	"k8s.io/apimachinery/pkg/runtime"
	clientgoscheme "k8s.io/client-go/kubernetes/scheme"
	"k8s.io/client-go/rest"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/envtest"
	logf "sigs.k8s.io/controller-runtime/pkg/log"
	"sigs.k8s.io/controller-runtime/pkg/log/zap"

	"github.com/opendatahub-io/gen-ai/internal/config"
	"github.com/opendatahub-io/gen-ai/internal/integrations/kubernetes/k8smocks"
	"github.com/opendatahub-io/gen-ai/internal/integrations/mlflow/mlflowmocks"
)

// Package-level test infrastructure - initialized once, shared by all tests.
// WARNING: Tests using these shared resources must NOT use t.Parallel()
// as they share cluster state.
var (
	ctx           context.Context
	cancel        context.CancelFunc
	testK8sClient client.Client
	testCfg       *rest.Config
	testEnv       *envtest.Environment
	testScheme    *runtime.Scheme
)

// getFirstFoundEnvTestBinaryDir returns the envtest binary assets directory.
// ENVTEST_ASSETS is set by "make test"; when unset (e.g. IDE or ad-hoc go test),
// it locates the module root via go.mod and uses <moduleRoot>/bin/k8s/<version-dir>.
// Callers must fail fast on error; run "make test" or "make envtest" to ensure assets exist.
func getFirstFoundEnvTestBinaryDir() (string, error) {
	if envtestAssets := os.Getenv("ENVTEST_ASSETS"); envtestAssets != "" {
		return envtestAssets, nil
	}

	cwd, err := os.Getwd()
	if err != nil {
		return "", fmt.Errorf("get working directory: %w", err)
	}
	projectRoot := cwd
	for {
		if _, err := os.Stat(filepath.Join(projectRoot, "go.mod")); err == nil {
			break
		}
		parent := filepath.Dir(projectRoot)
		if parent == projectRoot {
			return "", fmt.Errorf("project root (go.mod) not found when walking up from %s", cwd)
		}
		projectRoot = parent
	}

	basePath := filepath.Join(projectRoot, "bin", "k8s")
	entries, err := os.ReadDir(basePath)
	if err != nil {
		logf.Log.Error(err, "failed to read envtest binary directory", "path", basePath)
		return "", fmt.Errorf("read envtest binary dir %s: %w", basePath, err)
	}
	for _, entry := range entries {
		if entry.IsDir() {
			return filepath.Join(basePath, entry.Name()), nil
		}
	}
	logf.Log.Error(nil, "no envtest version directory found", "path", basePath)
	return "", fmt.Errorf("no envtest version directory under %s (run make envtest)", basePath)
}

func TestAPIHandlers(t *testing.T) {
	RegisterFailHandler(Fail)
	RunSpecs(t, "API Handlers Suite")
}

// SharedTestContext holds common test infrastructure for HTTP tests
type SharedTestContext struct {
	App         *App
	Server      *httptest.Server
	HTTPClient  *http.Client
	BaseURL     string
	Logger      *slog.Logger
	mlflowState *mlflowmocks.MLflowState
}

var testCtx *SharedTestContext

// BeforeSuite sets up test infrastructure (envtest and HTTP server) for all Ginkgo tests.
var _ = BeforeSuite(func() {
	By("Setting up envtest environment")

	logf.SetLogger(zap.New(zap.UseDevMode(true)))

	ctx, cancel = context.WithCancel(context.TODO())

	testScheme = runtime.NewScheme()
	err := clientgoscheme.AddToScheme(testScheme)
	Expect(err).NotTo(HaveOccurred(), "failed to add Kubernetes types to scheme")

	err = lsdapi.AddToScheme(testScheme)
	Expect(err).NotTo(HaveOccurred(), "failed to add LlamaStackDistribution types to scheme")

	err = kservev1alpha1.AddToScheme(testScheme)
	Expect(err).NotTo(HaveOccurred(), "failed to add KServe v1alpha1 types to scheme")

	err = kservev1beta1.AddToScheme(testScheme)
	Expect(err).NotTo(HaveOccurred(), "failed to add KServe v1beta1 types to scheme")

	err = gorchv1alpha1.AddToScheme(testScheme)
	Expect(err).NotTo(HaveOccurred(), "failed to add GuardrailsOrchestrator (gorch) types to scheme")

	logf.Log.Info("bootstrapping test environment")
	binaryDir, err := getFirstFoundEnvTestBinaryDir()
	Expect(err).NotTo(HaveOccurred(), "failed to resolve envtest binary directory")

	testEnv = &envtest.Environment{
		BinaryAssetsDirectory:    binaryDir,
		ControlPlaneStartTimeout: 60 * time.Second,
		ControlPlaneStopTimeout:  60 * time.Second,
		CRDs: []*apiextensionsv1.CustomResourceDefinition{
			k8smocks.CreateLlamaStackDistributionCRD(),
			k8smocks.CreateGuardrailsOrchestratorCRD(),
		},
	}

	testCfg, err = testEnv.Start()
	Expect(err).NotTo(HaveOccurred(), "failed to start test environment")
	Expect(testCfg).NotTo(BeNil(), "testCfg is nil after starting test environment")

	DeferCleanup(func() {
		By("tearing down envtest environment")

		apiServerPID := k8smocks.FindAPIServerPID()
		testEnvState := &k8smocks.TestEnvState{
			Env:          testEnv,
			APIServerPID: apiServerPID,
			Ctx:          ctx,
			Cancel:       cancel,
		}

		k8smocks.CleanupTestEnvState(
			testEnvState,
			func(format string, args ...any) { GinkgoWriter.Printf("ERROR: "+format+"\n", args...) },
			func(format string, args ...any) { GinkgoWriter.Printf(format+"\n", args...) },
		)
	})

	testK8sClient, err = client.New(testCfg, client.Options{Scheme: testScheme})
	Expect(err).NotTo(HaveOccurred(), "failed to create controller-runtime client")
	Expect(testK8sClient).NotTo(BeNil(), "testK8sClient is nil after creation")

	err = k8smocks.SetupMock(testK8sClient, ctx)
	Expect(err).NotTo(HaveOccurred(), "failed to setup mock data")

	By("Setting up HTTP test infrastructure")

	Expect(testK8sClient).NotTo(BeNil())
	Expect(testCfg).NotTo(BeNil())

	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelDebug}))

	originalWd, err := os.Getwd()
	Expect(err).NotTo(HaveOccurred())

	// OpenAPI handler needs to find YAML file in project root
	projectRoot := filepath.Join(originalWd, "..", "..")
	err = os.Chdir(projectRoot)
	Expect(err).NotTo(HaveOccurred())

	cfg := config.EnvConfig{
		Port:          8080,
		APIPathPrefix: "/api/v1",
		AuthMethod:    config.AuthMethodDisabled,
		MockLSClient:  true,
	}

	k8sFactory, err := k8smocks.NewTokenClientFactory(testK8sClient, testCfg, logger)
	Expect(err).NotTo(HaveOccurred())

	openAPIHandler, err := NewOpenAPIHandler(logger)
	Expect(err).NotTo(HaveOccurred())

	app := NewTestApp(cfg, logger, k8sFactory, WithOpenAPIHandler(openAPIHandler))

	err = os.Chdir(originalWd)
	Expect(err).NotTo(HaveOccurred())

	server := httptest.NewServer(app.Routes())
	DeferCleanup(func() {
		By("tearing down HTTP test server")
		server.Close()
	})

	httpClient := &http.Client{
		Timeout: 30 * time.Second,
	}

	// Start MLflow as a child process (SetupMLflow also seeds sample prompts)
	By("Starting MLflow")
	mlflowState, mlflowErr := mlflowmocks.SetupMLflow(logger)
	Expect(mlflowErr).NotTo(HaveOccurred())
	DeferCleanup(func() {
		if mlflowState != nil {
			By("stopping MLflow server")
			mlflowmocks.CleanupMLflowState(
				mlflowState,
				func(format string, args ...any) { GinkgoWriter.Printf("ERROR: "+format+"\n", args...) },
				func(format string, args ...any) { GinkgoWriter.Printf(format+"\n", args...) },
			)
		}
	})

	testCtx = &SharedTestContext{
		App:         app,
		Server:      server,
		HTTPClient:  httpClient,
		BaseURL:     server.URL,
		Logger:      logger,
		mlflowState: mlflowState,
	}

	By("HTTP test environment setup complete")
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
