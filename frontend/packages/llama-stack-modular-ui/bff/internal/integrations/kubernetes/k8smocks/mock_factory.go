package k8smocks

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"sync"

	"github.com/opendatahub-io/llama-stack-modular-ui/internal/config"
	"github.com/opendatahub-io/llama-stack-modular-ui/internal/constants"
	"github.com/opendatahub-io/llama-stack-modular-ui/internal/integrations"
	k8s "github.com/opendatahub-io/llama-stack-modular-ui/internal/integrations/kubernetes"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"sigs.k8s.io/controller-runtime/pkg/envtest"
)

type MockedKubernetesClientFactory interface {
	k8s.KubernetesClientFactory
}

func NewMockedKubernetesClientFactory(clientset kubernetes.Interface, testEnv *envtest.Environment, cfg config.EnvConfig, logger *slog.Logger) (k8s.KubernetesClientFactory, error) {
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
	clientset  kubernetes.Interface
	restConfig *rest.Config

	clients        map[string]k8s.KubernetesClientInterface
	initLock       sync.Mutex
	realK8sFactory k8s.KubernetesClientFactory
}

// NewTokenClientFactory initializes a factory using a known envtest clientset + config.
func NewTokenClientFactory(clientset kubernetes.Interface, restConfig *rest.Config, logger *slog.Logger) (k8s.KubernetesClientFactory, error) {
	cfg := config.EnvConfig{
		AuthMethod:      config.AuthMethodUser,
		AuthTokenHeader: config.DefaultAuthTokenHeader,
		AuthTokenPrefix: config.DefaultAuthTokenPrefix,
	}
	realFactory := k8s.NewTokenClientFactory(logger, cfg)

	return &MockedTokenClientFactory{
		logger:         logger,
		clientset:      clientset,
		restConfig:     restConfig,
		realK8sFactory: realFactory,
		clients:        make(map[string]k8s.KubernetesClientInterface),
	}, nil
}

func (f *MockedTokenClientFactory) ExtractRequestIdentity(httpHeader http.Header) (*integrations.RequestIdentity, error) {
	return f.realK8sFactory.ExtractRequestIdentity(httpHeader)
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

	// Map token to test user identity
	user := findTestUserByToken(identity.Token)
	if user == nil {
		return nil, fmt.Errorf("unknown test token: %s", identity.Token)
	}

	// Create a new rest.Config that impersonates the user.
	// This bypasses the lack of real authentication in envtest and allows RBAC to work properly.
	impersonatedCfg := rest.CopyConfig(f.restConfig)
	impersonatedCfg.Impersonate = rest.ImpersonationConfig{}

	clientset, err := kubernetes.NewForConfig(impersonatedCfg)
	if err != nil {
		return nil, fmt.Errorf("failed to create impersonated client: %w", err)
	}

	client := newMockedTokenKubernetesClientFromClientset(clientset, f.logger)
	f.clients[identity.Token] = client
	return client, nil
}

func findTestUserByToken(token string) *TestUser {
	for _, u := range DefaultTestUsers {
		if u.Token == token {
			return &u
		}
	}
	return nil
}
