package k8smocks

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"sync"

	kservev1alpha1 "github.com/kserve/kserve/pkg/apis/serving/v1alpha1"
	kservev1beta1 "github.com/kserve/kserve/pkg/apis/serving/v1beta1"
	lsdapi "github.com/llamastack/llama-stack-k8s-operator/api/v1alpha1"
	"github.com/opendatahub-io/gen-ai/internal/config"
	"github.com/opendatahub-io/gen-ai/internal/constants"
	"github.com/opendatahub-io/gen-ai/internal/integrations"
	k8s "github.com/opendatahub-io/gen-ai/internal/integrations/kubernetes"
	"k8s.io/apimachinery/pkg/runtime"
	clientgoscheme "k8s.io/client-go/kubernetes/scheme"
	"k8s.io/client-go/rest"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/envtest"
)

type MockedKubernetesClientFactory interface {
	k8s.KubernetesClientFactory
}

func NewMockedKubernetesClientFactory(clientset client.Client, testEnv *envtest.Environment, cfg config.EnvConfig, logger *slog.Logger) (k8s.KubernetesClientFactory, error) {
	switch cfg.AuthMethod {
	case config.AuthMethodUser:
		k8sFactory, err := NewTokenClientFactory(clientset, testEnv.Config, logger)
		if err != nil {
			return nil, fmt.Errorf("failed to create static client factory: %w", err)
		}
		return k8sFactory, nil

	default:
		return nil, fmt.Errorf("invalid auth method: %q", cfg.AuthMethod)
	}
}

// ─── MOCKED TOKEN FACTORY (envtest + "USER TOKEN") ──────────────────────────────
//
// MockedTokenClientFactory simulates token-based client creation in tests.
// It maps fake tokens (like "FAKE_BELLA_TOKEN") to a TestUser (username + groups),
// and creates a Kubernetes client that impersonates that user.
// This is critical for triggering proper RBAC evaluation (e.g., SelfSubjectAccessReview) inside envtest,
// which does not perform real token authentication.
type MockedTokenClientFactory struct {
	logger     *slog.Logger
	clientset  client.Client
	restConfig *rest.Config

	clients        map[string]k8s.KubernetesClientInterface
	initLock       sync.Mutex
	realK8sFactory k8s.KubernetesClientFactory
}

// NewTokenClientFactory initializes a factory using a known envtest clientset + config.
func NewTokenClientFactory(ctrlClient client.Client, restConfig *rest.Config, logger *slog.Logger) (k8s.KubernetesClientFactory, error) {
	cfg := config.EnvConfig{
		AuthMethod:      config.AuthMethodUser,
		AuthTokenHeader: config.DefaultAuthTokenHeader,
		AuthTokenPrefix: config.DefaultAuthTokenPrefix,
	}
	realFactory := k8s.NewTokenClientFactory(logger, cfg)

	return &MockedTokenClientFactory{
		logger:         logger,
		clientset:      ctrlClient,
		restConfig:     restConfig,
		realK8sFactory: realFactory,
		clients:        make(map[string]k8s.KubernetesClientInterface),
	}, nil
}

func (f *MockedTokenClientFactory) ExtractRequestIdentity(httpHeader http.Header) (*integrations.RequestIdentity, error) {
	id, err := f.realK8sFactory.ExtractRequestIdentity(httpHeader)
	if err != nil {
		token := "FAKE_BEARER_TOKEN"
		if len(DefaultTestUsers) > 0 {
			token = DefaultTestUsers[0].Token
		}
		return &integrations.RequestIdentity{Token: token}, nil
	}
	return id, nil
}

func (f *MockedTokenClientFactory) ValidateRequestIdentity(identity *integrations.RequestIdentity) error {
	return f.realK8sFactory.ValidateRequestIdentity(identity)
}

// GetClient returns a Kubernetes client for the identity in context,
// impersonating the associated user to allow SelfSubjectAccessReview (SSAR) and RBAC testing.
func (f *MockedTokenClientFactory) GetClient(ctx context.Context) (k8s.KubernetesClientInterface, error) {
	val := ctx.Value(constants.RequestIdentityKey)
	if val == nil {
		return nil, fmt.Errorf("missing RequestIdentity in context")
	}

	identity, ok := val.(*integrations.RequestIdentity)
	if !ok || identity.Token == "" {
		return nil, fmt.Errorf("invalid or missing identity token")
	}

	f.initLock.Lock()
	defer f.initLock.Unlock()

	if client, exists := f.clients[identity.Token]; exists {
		return client, nil
	}

	// Accept any token in mock mode; no user mapping required
	impersonatedCfg := rest.CopyConfig(f.restConfig)
	impersonatedCfg.Impersonate = rest.ImpersonationConfig{}

	// Create a scheme with LSD types for the new client
	scheme := runtime.NewScheme()
	if err := clientgoscheme.AddToScheme(scheme); err != nil {
		return nil, err
	}
	if err := lsdapi.AddToScheme(scheme); err != nil {
		return nil, err
	}
	if err := kservev1alpha1.AddToScheme(scheme); err != nil {
		return nil, err
	}
	if err := kservev1beta1.AddToScheme(scheme); err != nil {
		return nil, err
	}

	ctrlClient, err := client.New(impersonatedCfg, client.Options{Scheme: scheme})
	if err != nil {
		return nil, fmt.Errorf("failed to create impersonated client: %w", err)
	}

	client := newMockedTokenKubernetesClientFromClientset(ctrlClient, impersonatedCfg, f.logger)
	f.clients[identity.Token] = client
	return client, nil
}
