package k8smocks

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"runtime"

	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	"k8s.io/client-go/kubernetes"
	"sigs.k8s.io/controller-runtime/pkg/envtest"
)

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

func SetupEnvTest(input TestEnvInput) (*envtest.Environment, kubernetes.Interface, error) {
	projectRoot, err := getProjectRoot()
	if err != nil {
		input.Logger.Error("failed to find project root", slog.String("error", err.Error()))
		input.Cancel()
		os.Exit(1)
	}

	testEnv := &envtest.Environment{
		// TODO: Refactor this to use setup envtest.
		// It is much efficient and user friendly, Manually declaring the path means this can break.
		BinaryAssetsDirectory: filepath.Join(projectRoot, "bin", "k8s", fmt.Sprintf("1.29.0-%s-%s", runtime.GOOS, runtime.GOARCH)),
	}

	cfg, err := testEnv.Start()
	if err != nil {
		input.Logger.Error("failed to start envtest", slog.String("error", err.Error()))
		input.Cancel()
		os.Exit(1)
	}

	clientset, err := kubernetes.NewForConfig(cfg)
	if err != nil {
		input.Logger.Error("failed to create clientset", slog.String("error", err.Error()))
		input.Cancel()
		os.Exit(1)
	}

	// bootstrap resources
	err = setupMock(clientset, input.Ctx)
	if err != nil {
		input.Logger.Error("failed to setup mock data", slog.String("error", err.Error()))
		input.Cancel()
		os.Exit(1)
	}

	return testEnv, clientset, nil
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

func setupMock(mockK8sClient kubernetes.Interface, ctx context.Context) error {
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

func createNamespace(k8sClient kubernetes.Interface, ctx context.Context, namespace string) error {
	ns := &corev1.Namespace{
		ObjectMeta: metav1.ObjectMeta{
			Name: namespace,
		},
	}

	_, err := k8sClient.CoreV1().Namespaces().Create(ctx, ns, metav1.CreateOptions{})
	if err != nil {
		if apierrors.IsAlreadyExists(err) {
			return nil
		}
		return fmt.Errorf("failed to create namespace %s: %w", namespace, err)
	}

	return nil
}
