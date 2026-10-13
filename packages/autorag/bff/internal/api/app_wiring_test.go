package api

import (
	"context"
	"io"
	"log/slog"
	"testing"

	"github.com/opendatahub-io/autorag-library/bff/internal/config"
	k8s "github.com/opendatahub-io/autorag-library/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/autorag-library/bff/internal/models"
	"github.com/opendatahub-io/autorag-library/bff/internal/repositories"
	k8sclient "k8s.io/client-go/kubernetes"
	k8sfake "k8s.io/client-go/kubernetes/fake"
	"k8s.io/client-go/rest"
)

func TestInitPortForwardManagerIsDevOnly(t *testing.T) {
	oldGetKubeconfig := getKubeconfig
	oldNewK8sClientset := newK8sClientset
	oldNewPortForwardManager := newPortForwardManager
	t.Cleanup(func() {
		getKubeconfig = oldGetKubeconfig
		newK8sClientset = oldNewK8sClientset
		newPortForwardManager = oldNewPortForwardManager
	})

	getKubeconfig = func() (*rest.Config, error) { return &rest.Config{}, nil }
	newK8sClientset = func(*rest.Config) (k8sclient.Interface, error) { return k8sfake.NewSimpleClientset(), nil }
	newPortForwardManager = func(*rest.Config, k8sclient.Interface, *slog.Logger) *k8s.PortForwardManager {
		return &k8s.PortForwardManager{}
	}
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))

	if initPortForwardManager(config.EnvConfig{DevMode: true}, logger) == nil {
		t.Fatal("expected manager in DevMode")
	}
	if initPortForwardManager(config.EnvConfig{}, logger) != nil {
		t.Fatal("expected no manager outside DevMode")
	}
	if initPortForwardManager(config.EnvConfig{DevMode: true, MockK8sClient: true}, logger) != nil {
		t.Fatal("expected no manager with a mock Kubernetes client")
	}
}

func TestNewAppRejectsInsecureTLSOutsideDevMode(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))

	_, err := NewApp(config.EnvConfig{InsecureSkipVerify: true}, logger)

	if err == nil {
		t.Fatal("expected insecure TLS configuration to be rejected outside DevMode")
	}
	if err.Error() != "insecure-skip-verify can only be enabled in development mode" {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestNewAppMockMaaSClientDisablesResponsesFactory(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	app, err := NewApp(config.EnvConfig{
		AuthMethod:     config.AuthMethodDisabled,
		DevMode:        true,
		MockK8sClient:  true,
		MockMaaSClient: true,
	}, logger)
	if err != nil {
		t.Fatalf("failed to create app: %v", err)
	}

	err = app.responses.repo.ValidateResponses(context.Background(), repositories.ResponsesParams{
		Namespace:      "my-project",
		DBSecretName:   "vector-db",
		MaasSecretName: "maas",
	}, &models.ResponsesRequest{
		Model: "test-model",
		Input: []models.InputMessage{{
			Role:    "user",
			Content: []models.InputContent{{Type: "input_text", Text: "hello"}},
		}},
		Tools: []models.FileSearchTool{{
			Type:           "file_search",
			VectorStoreIDs: []string{"collection"},
		}},
	})

	if err == nil {
		t.Fatal("expected the mock MaaS Responses factory to return an error")
	}
	if err.Error() != "MaaS Responses are unavailable with the mock MaaS client" {
		t.Fatalf("unexpected error: %v", err)
	}
}
