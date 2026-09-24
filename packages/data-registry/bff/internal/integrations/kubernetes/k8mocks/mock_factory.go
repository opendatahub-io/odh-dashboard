package k8mocks

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"sync"

	"github.com/opendatahub-io/data-registry/bff/internal/config"
	"github.com/opendatahub-io/data-registry/bff/internal/constants"
	k8s "github.com/opendatahub-io/data-registry/bff/internal/integrations/kubernetes"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"sigs.k8s.io/controller-runtime/pkg/envtest"
)

type MockedKubernetesClientFactory interface {
	k8s.KubernetesClientFactory
}

func NewMockedKubernetesClientFactory(clientset kubernetes.Interface, testEnv *envtest.Environment, logger *slog.Logger) (k8s.KubernetesClientFactory, error) {
	k8sFactory, err := NewTokenClientFactory(clientset, testEnv, logger)
	if err != nil {
		return nil, fmt.Errorf("failed to create token client factory: %w", err)
	}
	return k8sFactory, nil
}

// MockedTokenClientFactory simulates token-based client creation in envtest.
//
// envtest does not perform real token authentication, so the test-only client maps fake tokens
// (like "FAKE_BELLA_TOKEN") to TestUsers and provisions a matching envtest client certificate
// to exercise RBAC behavior. Production code never uses this factory.
type MockedTokenClientFactory struct {
	logger    *slog.Logger
	clientset kubernetes.Interface
	testEnv   *envtest.Environment

	clients        map[string]k8s.KubernetesClientInterface
	initLock       sync.Mutex
	realK8sFactory k8s.KubernetesClientFactory
}

// NewTokenClientFactory initializes a factory using a known envtest clientset and environment.
func NewTokenClientFactory(clientset kubernetes.Interface, testEnv *envtest.Environment, logger *slog.Logger) (k8s.KubernetesClientFactory, error) {
	if testEnv == nil {
		return nil, fmt.Errorf("envtest environment is required")
	}

	cfg := config.EnvConfig{
		AuthMethod:      config.AuthMethodUser,
		AuthTokenHeader: config.DefaultAuthTokenHeader,
		AuthTokenPrefix: config.DefaultAuthTokenPrefix,
	}
	realFactory := k8s.NewTokenClientFactory(logger, cfg)

	return &MockedTokenClientFactory{
		logger:         logger,
		clientset:      clientset,
		testEnv:        testEnv,
		realK8sFactory: realFactory,
		clients:        make(map[string]k8s.KubernetesClientInterface),
	}, nil
}

func (f *MockedTokenClientFactory) ExtractRequestIdentity(httpHeader http.Header) (*k8s.RequestIdentity, error) {
	return f.realK8sFactory.ExtractRequestIdentity(httpHeader)
}

func (f *MockedTokenClientFactory) ValidateRequestIdentity(identity *k8s.RequestIdentity) error {
	return f.realK8sFactory.ValidateRequestIdentity(identity)
}

// GetClient returns a Kubernetes client for the token in the request identity.
func (f *MockedTokenClientFactory) GetClient(ctx context.Context) (k8s.KubernetesClientInterface, error) {
	val := ctx.Value(constants.RequestIdentityKey)
	if val == nil {
		return nil, fmt.Errorf("missing RequestIdentity in context")
	}

	identity, ok := val.(*k8s.RequestIdentity)
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

	// Provision a client certificate for the test user. This models user authentication without
	// relying on service-account credentials or caller-asserted identity.
	authenticatedUser, err := f.testEnv.AddUser(envtest.User{
		Name:   user.UserName,
		Groups: user.Groups,
	}, &rest.Config{QPS: 1000, Burst: 2000})
	if err != nil {
		return nil, fmt.Errorf("failed to provision test user: %w", err)
	}

	clientset, err := kubernetes.NewForConfig(authenticatedUser.Config())
	if err != nil {
		return nil, fmt.Errorf("failed to create test user client: %w", err)
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
