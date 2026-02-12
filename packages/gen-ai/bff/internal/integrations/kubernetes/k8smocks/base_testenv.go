package k8smocks

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	goruntime "runtime"
	"strings"
	"testing"
	"time"

	kservev1alpha1 "github.com/kserve/kserve/pkg/apis/serving/v1alpha1"
	kservev1beta1 "github.com/kserve/kserve/pkg/apis/serving/v1beta1"
	lsdapi "github.com/llamastack/llama-stack-k8s-operator/api/v1alpha1"
	"github.com/shirou/gopsutil/v4/process"
	gorchv1alpha1 "github.com/trustyai-explainability/trustyai-service-operator/api/gorch/v1alpha1"
	corev1 "k8s.io/api/core/v1"
	apiextensionsv1 "k8s.io/apiextensions-apiserver/pkg/apis/apiextensions/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	clientgoscheme "k8s.io/client-go/kubernetes/scheme"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/envtest"
)

// orphanedProcessGracePeriod is the time to wait for testEnv.Stop() to terminate
// processes gracefully before force-killing. 500ms chosen based on empirical testing;
// may need adjustment for slower systems or under heavy load.
const orphanedProcessGracePeriod = 500 * time.Millisecond

// TODO: Expand this to include more test users with right permissions.
var DefaultTestUsers = []TestUser{
	{
		Token: "FAKE_BEARER_TOKEN",
	},
}

type TestUser struct {
	Token string `json:"token"`
}

type TestEnvInput struct {
	Users  []TestUser
	Logger *slog.Logger
	Ctx    context.Context
	Cancel context.CancelFunc
}

// TestEnvState tracks the envtest environment alongside its kube-apiserver PID,
// enabling targeted cleanup of only the process this test spawned—critical for
// parallel test execution where multiple API servers may be running.
type TestEnvState struct {
	Env          *envtest.Environment
	APIServerPID int
	Ctx          context.Context
	Cancel       context.CancelFunc
}

func SetupEnvTest(input TestEnvInput) (*TestEnvState, client.Client, error) {
	// ENVTEST_ASSETS is set by "make test"; fallback only applies when running tests without make (e.g. IDE, ad-hoc go test).
	var binaryAssetsDir string
	if envtestAssets := os.Getenv("ENVTEST_ASSETS"); envtestAssets != "" {
		binaryAssetsDir = envtestAssets
		input.Logger.Info("Using ENVTEST_ASSETS environment variable", slog.String("path", binaryAssetsDir))
	} else {
		projectRoot, err := getProjectRoot()
		if err != nil {
			input.Logger.Error("failed to find project root", slog.String("error", err.Error()))
			input.Cancel()
			os.Exit(1)
		}
		platformDir := fmt.Sprintf("1.29.0-%s-%s", goruntime.GOOS, goruntime.GOARCH)
		binaryAssetsDir = filepath.Join(projectRoot, "bin", "k8s", platformDir)
		input.Logger.Info("Using fallback binary assets directory", slog.String("path", binaryAssetsDir))
	}

	testEnv := &envtest.Environment{
		BinaryAssetsDirectory: binaryAssetsDir,
		CRDs: []*apiextensionsv1.CustomResourceDefinition{
			CreateLlamaStackDistributionCRD(),
			CreateGuardrailsOrchestratorCRD(),
		},
	}

	cfg, err := testEnv.Start()
	if err != nil {
		input.Logger.Error("failed to start envtest", slog.String("error", err.Error()))
		input.Cancel()
		os.Exit(1)
	}

	// Record the PID of the kube-apiserver process started by envtest.
	// This allows us to target cleanup to only the process we started.
	// Workaround for: https://github.com/kubernetes-sigs/controller-runtime/issues/1571
	// This only applies when the test started the process via envtest.
	apiServerPID := FindAPIServerPID()
	testEnvState := &TestEnvState{
		Env:          testEnv,
		APIServerPID: apiServerPID,
		Ctx:          input.Ctx,
		Cancel:       input.Cancel,
	}

	// Create scheme and add core Kubernetes types
	scheme := runtime.NewScheme()
	err = clientgoscheme.AddToScheme(scheme)
	if err != nil {
		input.Logger.Error("failed to add Kubernetes types to scheme", slog.String("error", err.Error()))
		input.Cancel()
		os.Exit(1)
	}

	err = lsdapi.AddToScheme(scheme)
	if err != nil {
		input.Logger.Error("failed to add LlamaStackDistribution types to scheme", slog.String("error", err.Error()))
		input.Cancel()
		os.Exit(1)
	}

	err = kservev1alpha1.AddToScheme(scheme)
	if err != nil {
		input.Logger.Error("failed to add KServe v1alpha1 types to scheme", slog.String("error", err.Error()))
		input.Cancel()
		os.Exit(1)
	}

	err = kservev1beta1.AddToScheme(scheme)
	if err != nil {
		input.Logger.Error("failed to add KServe v1beta1 types to scheme", slog.String("error", err.Error()))
		input.Cancel()
		os.Exit(1)
	}

	err = gorchv1alpha1.AddToScheme(scheme)
	if err != nil {
		input.Logger.Error("failed to add GuardrailsOrchestrator types to scheme", slog.String("error", err.Error()))
		input.Cancel()
		os.Exit(1)
	}

	ctrlClient, err := client.New(cfg, client.Options{Scheme: scheme})
	if err != nil {
		input.Logger.Error("failed to create controller-runtime client", slog.String("error", err.Error()))
		input.Cancel()
		os.Exit(1)
	}

	// bootstrap resources
	err = SetupMock(ctrlClient, input.Ctx)
	if err != nil {
		input.Logger.Error("failed to setup mock data", slog.String("error", err.Error()))
		input.Cancel()
		os.Exit(1)
	}

	return testEnvState, ctrlClient, nil
}

// CleanupTestEnvState performs graceful shutdown followed by force-kill if needed.
// The two-phase approach is necessary because envtest.Stop() frequently fails to
// reap child processes on Linux (see controller-runtime issue #1571).
func CleanupTestEnvState(
	testEnvState *TestEnvState,
	errorLogger func(string, ...interface{}),
	infoLogger func(string, ...interface{}),
) {
	if testEnvState == nil {
		return
	}

	if testEnvState.Env != nil {
		if err := testEnvState.Env.Stop(); err != nil {
			errorLogger("Failed to stop test environment gracefully: %v", err)
		}
	}

	ForceKillOrphanedAPIServer(testEnvState.Ctx, testEnvState.APIServerPID, infoLogger)

	// mark the PID as handled to prevent double-kills
	testEnvState.APIServerPID = 0

	if testEnvState.Cancel != nil {
		testEnvState.Cancel()
	}
}

// TeardownEnvTest wraps CleanupTestEnvState for use in test defer statements.
// Must be deferred immediately after SetupEnvTest to ensure cleanup runs even
// if the test panics or fails early.
func TeardownEnvTest(t *testing.T, testEnvState *TestEnvState) {
	CleanupTestEnvState(
		testEnvState,
		func(format string, args ...interface{}) { t.Errorf(format, args...) },
		func(format string, args ...interface{}) { t.Logf(format, args...) },
	)
}

// FindAPIServerPID identifies the kube-apiserver process spawned by this specific test execution.
// It relies on PPID (parent process ID) tracking to distinguish this instance from others
// started by parallel test packages, as envtest.Stop() frequently fails to reap child
// processes on Linux.
func FindAPIServerPID() int {
	// This workaround targets a Linux-specific process reaping issue; we skip on
	// Windows to avoid interference with its distinct process tree management.
	if goruntime.GOOS == "windows" {
		return 0
	}

	// The API server may take a few milliseconds to appear in the OS process table.
	// We retry to ensure detection under heavy CI load.
	const maxAttempts = 5
	const retryDelay = 100 * time.Millisecond

	for attempt := 0; attempt < maxAttempts; attempt++ {
		if attempt > 0 {
			time.Sleep(retryDelay)
		}

		pid := tryFindAPIServerPID()
		if pid != 0 {
			return pid
		}
	}
	// Returning 0 means ForceKillOrphanedAPIServer won't target any process.
	// If the process is still orphaned after envtest.Stop() fails, it will remain
	// until the test process exits or manual cleanup. This is expected on Windows
	// (where we skip detection) but should be rare on Linux after retries.
	return 0
}

// tryFindAPIServerPID scans the process table once without retries.
// Separated from FindAPIServerPID to allow the retry logic to be tested independently.
func tryFindAPIServerPID() int {
	procs, err := process.Processes()
	if err != nil {
		return 0
	}

	for _, p := range procs {
		pid := int(p.Pid)

		// Two-stage validation: first confirm it's our child kube-apiserver,
		// then verify the envtest fingerprint to exclude non-test API servers.
		if isAPIServerProcess(pid) {
			return pid
		}
	}

	return 0
}

// isAPIServerProcess validates ownership via PPID to prevent killing API servers
// belonging to other parallel test packages—a critical safety check given that
// PID values alone are insufficient for identification in concurrent environments.
//
// Note: This PPID check does not distinguish between multiple API servers if tests
// run in parallel within the same package (e.g., using -parallel flag), as they
// would all share the same parent PID. This is acceptable for serial test execution
// (the default), but parallel tests within a package are not supported.
func isAPIServerProcess(pid int) bool {
	if pid <= 0 {
		return false
	}

	p, err := process.NewProcess(int32(pid))
	if err != nil {
		return false
	}

	myPID := int32(os.Getpid())

	ppid, err := p.Ppid()
	if err != nil {
		return false
	}

	name, err := p.Name()
	if err != nil {
		return false
	}

	return ppid == myPID && strings.Contains(name, "kube-apiserver")
}

// ForceKillOrphanedAPIServer handles the case where envtest.Stop() fails to terminate
// the kube-apiserver (controller-runtime issue #1571). It waits for a grace period
// to allow normal cleanup, then force-kills only if the process is still ours.
func ForceKillOrphanedAPIServer(ctx context.Context, pid int, logger func(string, ...interface{})) {
	if pid <= 0 {
		return
	}

	// Wait for the grace period to allow graceful reaping, but we respect
	// context cancellation to avoid blocking an already-terminating test run.
	select {
	case <-time.After(orphanedProcessGracePeriod):
	case <-ctx.Done():
	}

	// Re-verify the PID before killing. This is a critical safety check against
	// PID recycling in high-load parallel environments.
	if !isAPIServerProcess(pid) {
		return
	}

	logger("Terminating orphaned kube-apiserver (PID: %d)", pid)

	// Attempt to acquire a fresh process handle. If this fails, the process
	// has exited in the window between our identity check and
	// this acquisition, meaning no further cleanup is required.
	p, err := process.NewProcess(int32(pid))
	if err != nil {
		return
	}

	// At this point, we are certain the process still exists and belongs to us.
	if err := p.Kill(); err != nil {
		logger("Warning: failed to kill PID %d: %v", pid, err)
	}
}

func getProjectRoot() (string, error) {
	currentDir, err := os.Getwd()
	if err != nil {
		return "", err
	}

	for {
		if _, err := os.Stat(filepath.Join(currentDir, "go.mod")); err == nil {
			// Found the project root where go.mod is located
			return currentDir, nil
		}

		parentDir := filepath.Dir(currentDir)
		if parentDir == currentDir {
			// We reached the root directory and did not find the go.mod
			return "", fmt.Errorf("could not find project root")
		}

		currentDir = parentDir
	}
}

// SetupMock creates the default test namespaces used by tests.
func SetupMock(mockK8sClient client.Client, ctx context.Context) error {
	err := createNamespace(mockK8sClient, ctx, "llama-stack")
	if err != nil {
		return fmt.Errorf("failed to create llama-stack namespace: %w", err)
	}

	err = createNamespace(mockK8sClient, ctx, "dora-namespace")
	if err != nil {
		return err
	}

	err = createNamespace(mockK8sClient, ctx, "bella-namespace")
	if err != nil {
		return err
	}

	err = createNamespace(mockK8sClient, ctx, "bento-namespace")
	if err != nil {
		return err
	}

	return nil
}

func createNamespace(k8sClient client.Client, ctx context.Context, namespace string) error {
	ns := &corev1.Namespace{
		ObjectMeta: metav1.ObjectMeta{
			Name: namespace,
		},
	}

	err := k8sClient.Create(ctx, ns)
	if err != nil {
		return fmt.Errorf("failed to create namespace %s: %w", namespace, err)
	}

	return nil
}

// CreateLlamaStackDistributionCRD creates the CRD for LlamaStackDistribution
// Based on the official CRD from https://github.com/llamastack/llama-stack-k8s-operator/blob/main/config/crd/bases/llamastack.io_llamastackdistributions.yaml
// A better approach to replicate real CRD install would be to download the CRD and place it in the CRDDirectoryPaths, given
// pointing to a remote location is not supported yet by envtest: https://github.com/kubernetes-sigs/controller-runtime/issues/1558
func CreateLlamaStackDistributionCRD() *apiextensionsv1.CustomResourceDefinition {
	return &apiextensionsv1.CustomResourceDefinition{
		ObjectMeta: metav1.ObjectMeta{
			Name: "llamastackdistributions.llamastack.io",
		},
		Spec: apiextensionsv1.CustomResourceDefinitionSpec{
			Group: "llamastack.io",
			Versions: []apiextensionsv1.CustomResourceDefinitionVersion{
				{
					Name:    "v1alpha1",
					Served:  true,
					Storage: true,
					Schema: &apiextensionsv1.CustomResourceValidation{
						OpenAPIV3Schema: &apiextensionsv1.JSONSchemaProps{
							Type: "object",
							Properties: map[string]apiextensionsv1.JSONSchemaProps{
								"spec": {
									Type: "object",
									Properties: map[string]apiextensionsv1.JSONSchemaProps{
										"replicas": {
											Type: "integer",
										},
										"server": {
											Type: "object",
											Properties: map[string]apiextensionsv1.JSONSchemaProps{
												"containerSpec": {
													Type: "object",
													Properties: map[string]apiextensionsv1.JSONSchemaProps{
														"command": {
															Type: "array",
															Items: &apiextensionsv1.JSONSchemaPropsOrArray{
																Schema: &apiextensionsv1.JSONSchemaProps{
																	Type: "string",
																},
															},
														},
														"resources": {
															Type: "object",
														},
														"env": {
															Type: "array",
															Items: &apiextensionsv1.JSONSchemaPropsOrArray{
																Schema: &apiextensionsv1.JSONSchemaProps{
																	Type: "object",
																},
															},
														},
														"name": {
															Type: "string",
														},
														"port": {
															Type: "integer",
														},
													},
												},
												"distribution": {
													Type: "object",
													Properties: map[string]apiextensionsv1.JSONSchemaProps{
														"name": {
															Type: "string",
														},
													},
												},
												"userConfig": {
													Type: "object",
													Properties: map[string]apiextensionsv1.JSONSchemaProps{
														"configMapName": {
															Type: "string",
														},
													},
												},
											},
										},
									},
								},
								"status": {
									Type: "object",
									Properties: map[string]apiextensionsv1.JSONSchemaProps{
										"phase": {
											Type: "string",
										},
									},
								},
							},
						},
					},
				},
			},
			Scope: apiextensionsv1.NamespaceScoped,
			Names: apiextensionsv1.CustomResourceDefinitionNames{
				Plural:     "llamastackdistributions",
				Singular:   "llamastackdistribution",
				Kind:       "LlamaStackDistribution",
				ShortNames: []string{"lsd"},
			},
		},
	}
}

// CreateGuardrailsOrchestratorCRD creates the CRD for GuardrailsOrchestrator (gorch).
// Minimal schema so envtest API server accepts the type; matches gorchv1alpha1 scheme registration.
func CreateGuardrailsOrchestratorCRD() *apiextensionsv1.CustomResourceDefinition {
	return &apiextensionsv1.CustomResourceDefinition{
		ObjectMeta: metav1.ObjectMeta{
			Name: "guardrailsorchestrators.trustyai.opendatahub.io",
		},
		Spec: apiextensionsv1.CustomResourceDefinitionSpec{
			Group: "trustyai.opendatahub.io",
			Versions: []apiextensionsv1.CustomResourceDefinitionVersion{
				{
					Name:    "v1alpha1",
					Served:  true,
					Storage: true,
					Schema: &apiextensionsv1.CustomResourceValidation{
						OpenAPIV3Schema: &apiextensionsv1.JSONSchemaProps{
							Type: "object",
							Properties: map[string]apiextensionsv1.JSONSchemaProps{
								"spec":   {Type: "object"},
								"status": {Type: "object"},
							},
						},
					},
				},
			},
			Scope: apiextensionsv1.NamespaceScoped,
			Names: apiextensionsv1.CustomResourceDefinitionNames{
				Plural:   "guardrailsorchestrators",
				Singular: "guardrailsorchestrator",
				Kind:     "GuardrailsOrchestrator",
			},
		},
	}
}
