package k8mocks

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"sync"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/config"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/constants"
	k8s "github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/integrations/kubernetes"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"sigs.k8s.io/controller-runtime/pkg/envtest"
)

// NewMockedKubernetesClientFactory creates a mocked Kubernetes client factory for testing.
func NewMockedKubernetesClientFactory(clientset kubernetes.Interface, testEnv *envtest.Environment, cfg config.EnvConfig, logger *slog.Logger) (k8s.KubernetesClientFactory, error) {
	switch cfg.AuthMethod {
	case config.AuthMethodDisabled, config.AuthMethodUser:
		k8sFactory, err := NewTokenClientFactory(clientset, testEnv.Config, logger, cfg)
		if err != nil {
			return nil, fmt.Errorf("failed to create token client factory: %w", err)
		}
		return k8sFactory, nil

	default:
		return nil, fmt.Errorf("invalid auth method: %q", cfg.AuthMethod)
	}
}

// MockedTokenClientFactory simulates token-based client creation in tests.
// It maps fake tokens to a TestUser and creates a Kubernetes client that impersonates that user.
type MockedTokenClientFactory struct {
	logger     *slog.Logger
	clientset  kubernetes.Interface
	restConfig *rest.Config

	clients        map[string]k8s.KubernetesClientInterface
	initLock       sync.Mutex
	realK8sFactory k8s.KubernetesClientFactory
}

// NewTokenClientFactory creates a mocked token client factory for testing.
func NewTokenClientFactory(clientset kubernetes.Interface, restConfig *rest.Config, logger *slog.Logger, appCfg config.EnvConfig) (k8s.KubernetesClientFactory, error) {
	realFactory := k8s.NewTokenClientFactory(logger, appCfg)

	return &MockedTokenClientFactory{
		logger:         logger,
		clientset:      clientset,
		restConfig:     restConfig,
		realK8sFactory: realFactory,
		clients:        make(map[string]k8s.KubernetesClientInterface),
	}, nil
}

func (f *MockedTokenClientFactory) ExtractRequestIdentity(httpHeader http.Header) (*k8s.RequestIdentity, error) {
	identity, err := f.realK8sFactory.ExtractRequestIdentity(httpHeader)
	if err != nil {
		return nil, err
	}
	if user := findTestUserByToken(identity.Token.Raw()); user != nil {
		identity.UserID = user.UserName
		identity.Groups = user.Groups
	}
	return identity, nil
}

func (f *MockedTokenClientFactory) ValidateRequestIdentity(identity *k8s.RequestIdentity) error {
	return f.realK8sFactory.ValidateRequestIdentity(identity)
}

// GetClient returns a Kubernetes client for the identity in context,
// impersonating the associated user to allow SelfSubjectAccessReview (SSAR) and RBAC testing.
func (f *MockedTokenClientFactory) GetClient(ctx context.Context) (k8s.KubernetesClientInterface, error) {
	val := ctx.Value(constants.RequestIdentityKey)
	if val == nil {
		return nil, fmt.Errorf("missing RequestIdentity in context")
	}

	identity, ok := val.(*k8s.RequestIdentity)
	if !ok || identity.Token.Raw() == "" {
		return nil, fmt.Errorf("invalid or missing identity token")
	}

	f.initLock.Lock()
	defer f.initLock.Unlock()

	if client, exists := f.clients[identity.Token.Raw()]; exists {
		return client, nil
	}

	// Map token to test user identity
	user := findTestUserByToken(identity.Token.Raw())
	if user == nil {
		return nil, fmt.Errorf("unknown test token: %s", identity.Token)
	}

	// Create a new rest.Config that impersonates the user.
	// This bypasses the lack of real authentication in envtest and allows RBAC to work properly.
	impersonatedCfg := rest.CopyConfig(f.restConfig)
	impersonatedCfg.Impersonate = rest.ImpersonationConfig{
		UserName: user.UserName,
		Groups:   user.Groups,
	}

	clientset, err := kubernetes.NewForConfig(impersonatedCfg)
	if err != nil {
		return nil, fmt.Errorf("failed to create impersonated client: %w", err)
	}

	client := newMockedTokenKubernetesClientFromClientset(clientset, impersonatedCfg, f.logger)
	f.clients[identity.Token.Raw()] = client
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
