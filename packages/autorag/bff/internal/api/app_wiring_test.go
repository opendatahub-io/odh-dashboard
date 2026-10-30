package api

import (
	"context"
	"io"
	"log/slog"
	"testing"
	"time"

	"github.com/opendatahub-io/autorag-library/bff/internal/config"
	k8s "github.com/opendatahub-io/autorag-library/bff/internal/integrations/kubernetes"
	maas "github.com/opendatahub-io/autorag-library/bff/internal/integrations/maas"
	"github.com/opendatahub-io/autorag-library/bff/internal/models"
	"github.com/opendatahub-io/autorag-library/bff/internal/repositories"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	k8sclient "k8s.io/client-go/kubernetes"
	k8sfake "k8s.io/client-go/kubernetes/fake"
	"k8s.io/client-go/rest"
	k8stesting "k8s.io/client-go/testing"
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

func TestSyncRouterCAOnceUsesPublicCertificateOnly(t *testing.T) {
	client := k8sfake.NewSimpleClientset(
		&corev1.Secret{
			ObjectMeta: metav1.ObjectMeta{Name: "router-ca", Namespace: "openshift-ingress-operator"},
			Data: map[string][]byte{
				"tls.crt": []byte("router-ca"),
				"tls.key": []byte("private-key"),
			},
		},
		&corev1.ConfigMap{ObjectMeta: metav1.ObjectMeta{Name: "autorag-router-ca-bundle", Namespace: "applications"}},
	)

	certificate := syncRouterCAOnce(context.Background(), "applications", client, slog.New(slog.NewTextHandler(io.Discard, nil)))
	if string(certificate) != "router-ca" {
		t.Fatalf("certificate = %q, want router-ca", certificate)
	}
	bundle, err := client.CoreV1().ConfigMaps("applications").Get(context.Background(), "autorag-router-ca-bundle", metav1.GetOptions{})
	if err != nil {
		t.Fatalf("failed to read synchronized bundle: %v", err)
	}
	if got := bundle.Data["ca-bundle.crt"]; got != "router-ca" {
		t.Fatalf("bundle certificate = %q, want router-ca", got)
	}
	if _, found := bundle.Data["tls.key"]; found {
		t.Fatal("router private key was copied into the bundle")
	}
}

func TestSyncRouterCAOnceContinuesWithoutSourceCertificate(t *testing.T) {
	client := k8sfake.NewSimpleClientset()
	certificate := syncRouterCAOnce(context.Background(), "applications", client, slog.New(slog.NewTextHandler(io.Discard, nil)))
	if certificate != nil {
		t.Fatalf("certificate = %q, want nil when source Secret is unavailable", certificate)
	}
}

func TestRouterCARefreshCancellationWaitsForInFlightSync(t *testing.T) {
	oldNewInClusterK8sClient := newInClusterK8sClient
	t.Cleanup(func() { newInClusterK8sClient = oldNewInClusterK8sClient })

	started := make(chan struct{})
	release := make(chan struct{})
	client := k8sfake.NewSimpleClientset()
	client.PrependReactor("get", "secrets", func(k8stesting.Action) (bool, runtime.Object, error) {
		close(started)
		<-release
		return true, &corev1.Secret{Data: map[string][]byte{"tls.crt": []byte("router-ca")}}, nil
	})
	newInClusterK8sClient = func() (k8sclient.Interface, error) { return client, nil }

	pool := maas.NewDynamicRootCAPool(nil)
	cancel := startRouterCARefresh("applications", pool, slog.New(slog.NewTextHandler(io.Discard, nil)))
	<-started

	cancelDone := make(chan struct{})
	go func() {
		cancel()
		close(cancelDone)
	}()
	select {
	case <-cancelDone:
		t.Fatal("cancellation returned before the in-flight sync completed")
	case <-time.After(25 * time.Millisecond):
	}

	close(release)
	select {
	case <-cancelDone:
	case <-time.After(time.Second):
		t.Fatal("cancellation did not wait for the refresh goroutine")
	}
}
