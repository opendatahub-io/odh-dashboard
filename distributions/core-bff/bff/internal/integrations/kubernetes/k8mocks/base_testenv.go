// Package k8mocks provides envtest-based mock Kubernetes environments for integration tests.
package k8mocks

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"runtime"

	apiextensionsv1 "k8s.io/apiextensions-apiserver/pkg/apis/apiextensions/v1"
	"k8s.io/client-go/dynamic"
	k8sclient "k8s.io/client-go/kubernetes"
	"sigs.k8s.io/controller-runtime/pkg/envtest"
)

// DefaultTestUsers provides a default set of test users for envtest scenarios.
//
//nolint:gosec // G101: test-only fake tokens, not real credentials
var DefaultTestUsers = []TestUser{
	{
		UserName: "user@example.com",
		Token:    "FAKE_CLUSTER_ADMIN_TOKEN",
		Groups:   []string{},
	},
	{
		UserName: "userA@example.com",
		Token:    "FAKE_USER_A_TOKEN",
		Groups:   []string{"test-ns-a-group", "test-ns-a-service-group"},
	},
	{
		UserName: "userB@example.com",
		Token:    "FAKE_USER_B_TOKEN",
		Groups:   []string{},
	},
}

// TestUser represents a test user with fake token and group memberships.
type TestUser struct {
	UserName string
	Token    string
	Groups   []string
}

// TestEnvInput holds configuration for setting up a test environment.
type TestEnvInput struct {
	Users []TestUser
	Ctx   context.Context
	CRDs  []*apiextensionsv1.CustomResourceDefinition
}

// SetupEnvTest creates an envtest environment with configured test users.
func SetupEnvTest(input TestEnvInput) (*envtest.Environment, k8sclient.Interface, dynamic.Interface, error) {
	if input.Ctx == nil {
		input.Ctx = context.Background()
	}

	var binaryAssetsDir string
	if envtestAssets := os.Getenv("ENVTEST_ASSETS"); envtestAssets != "" {
		binaryAssetsDir = envtestAssets
	} else {
		projectRoot, err := getProjectRoot()
		if err != nil {
			return nil, nil, nil, fmt.Errorf("failed to find project root: %w", err)
		}
		binaryAssetsDir = filepath.Join(projectRoot, "bin", "k8s", fmt.Sprintf("1.29.3-%s-%s", runtime.GOOS, runtime.GOARCH))
	}

	testEnv := &envtest.Environment{
		BinaryAssetsDirectory: binaryAssetsDir,
		CRDs:                  input.CRDs,
	}

	cfg, err := testEnv.Start()
	if err != nil {
		return nil, nil, nil, fmt.Errorf("failed to start envtest: %w", err)
	}

	clientset, err := k8sclient.NewForConfig(cfg)
	if err != nil {
		_ = testEnv.Stop()
		return nil, nil, nil, fmt.Errorf("failed to create clientset: %w", err)
	}

	dynClient, err := dynamic.NewForConfig(cfg)
	if err != nil {
		_ = testEnv.Stop()
		return nil, nil, nil, fmt.Errorf("failed to create dynamic client: %w", err)
	}

	if err := setupMock(input.Ctx, clientset, dynClient, input.Users); err != nil {
		_ = testEnv.Stop()
		return nil, nil, nil, fmt.Errorf("failed to setup mock data: %w", err)
	}

	return testEnv, clientset, dynClient, nil
}

func setupMock(ctx context.Context, mockK8sClient k8sclient.Interface, dynClient dynamic.Interface, users []TestUser) error {
	if len(users) == 0 {
		users = DefaultTestUsers
	}

	err := createNamespace(ctx, mockK8sClient, "opendatahub")
	if err != nil {
		return err
	}

	err = createNamespace(ctx, mockK8sClient, "test-ns-a")
	if err != nil {
		return err
	}

	err = createNamespace(ctx, mockK8sClient, "test-ns-b")
	if err != nil {
		return err
	}

	err = createNamespace(ctx, mockK8sClient, "test-ns-c")
	if err != nil {
		return err
	}

	err = createService(ctx, mockK8sClient, "dashboard", "opendatahub", "Dashboard", "Dashboard service", "10.0.0.10", "core")
	if err != nil {
		return err
	}
	err = createService(ctx, mockK8sClient, "dashboard-one", "opendatahub", "Dashboard One", "Dashboard One service", "10.0.0.11", "core")
	if err != nil {
		return err
	}
	err = createService(ctx, mockK8sClient, "dashboard-ns-a", "test-ns-a", "Dashboard NS A", "Dashboard NS A service", "10.0.0.12", "core")
	if err != nil {
		return err
	}
	err = createService(ctx, mockK8sClient, "dashboard-ns-b", "test-ns-b", "Dashboard NS B", "Dashboard NS B service", "10.0.0.13", "core")
	if err != nil {
		return err
	}
	err = createService(ctx, mockK8sClient, "non-dashboard", "opendatahub", "Not a Dashboard service", "Not a Dashboard service description", "10.0.0.14", "")
	if err != nil {
		return err
	}

	if len(users) > 0 {
		err = createClusterAdminRBAC(ctx, mockK8sClient, users[0].UserName)
		if err != nil {
			return fmt.Errorf("failed to create cluster admin RBAC: %w", err)
		}
	}

	if len(users) > 1 {
		err = createNamespaceRestrictedRBAC(ctx, mockK8sClient, users[1].UserName, "test-ns-a")
		if err != nil {
			return fmt.Errorf("failed to create namespace-restricted RBAC: %w", err)
		}
	}

	if len(users) > 2 {
		err = createNamespaceRestrictedRBAC(ctx, mockK8sClient, users[2].UserName, "test-ns-b")
		if err != nil {
			return fmt.Errorf("failed to create namespace-restricted RBAC: %w", err)
		}
	}

	if len(users) > 1 && len(users[1].Groups) > 1 {
		err = createGroupAccessRBAC(ctx, mockK8sClient, users[1].Groups[1], "test-ns-a", "dashboard-ns-a")
		if err != nil {
			return fmt.Errorf("failed to create group-based RBAC: %w", err)
		}
	}

	if len(users) > 1 && len(users[1].Groups) > 0 {
		err = createGroupNamespaceAccessRBAC(ctx, mockK8sClient, users[1].Groups[0], "test-ns-a")
		if err != nil {
			return fmt.Errorf("failed to set up group access to namespace: %w", err)
		}
	}

	if err := createNIMTestData(ctx, mockK8sClient, dynClient); err != nil {
		return fmt.Errorf("failed to create NIM test data: %w", err)
	}

	return nil
}

func getProjectRoot() (string, error) {
	currentDir, err := os.Getwd()
	if err != nil {
		return "", err
	}

	for {
		if _, err := os.Stat(filepath.Join(currentDir, "go.mod")); err == nil {
			return currentDir, nil
		}

		parentDir := filepath.Dir(currentDir)
		if parentDir == currentDir {
			return "", fmt.Errorf("could not find project root")
		}

		currentDir = parentDir
	}
}
