package kubernetes

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"sync"
	"testing"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/config"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/constants"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	authnv1 "k8s.io/api/authentication/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
)

func TestTokenClientFactory_ForwardsUserToken(t *testing.T) {
	var capturedToken string

	factory := &TokenClientFactory{
		Logger: slog.Default(),
		Header: config.DefaultAuthTokenHeader,
		Prefix: config.DefaultAuthTokenPrefix,
		NewTokenKubernetesClientFn: func(token string, logger *slog.Logger) (KubernetesClientInterface, error) {
			capturedToken = token
			return nil, nil
		},
	}

	userToken := "user-specific-bearer-token-abc123"
	identity := &RequestIdentity{
		UserID: "test-user",
		Token:  NewBearerToken(userToken),
	}

	ctx := context.WithValue(context.Background(), constants.RequestIdentityKey, identity)
	_, _ = factory.GetClient(ctx)

	assert.Equal(t, userToken, capturedToken, "factory must forward the user's bearer token, not an SA token")
}

func TestTokenClientFactory_DifferentUsersGetDifferentTokens(t *testing.T) {
	var tokens []string

	factory := &TokenClientFactory{
		Logger: slog.Default(),
		Header: config.DefaultAuthTokenHeader,
		Prefix: config.DefaultAuthTokenPrefix,
		NewTokenKubernetesClientFn: func(token string, logger *slog.Logger) (KubernetesClientInterface, error) {
			tokens = append(tokens, token)
			return nil, nil
		},
	}

	for _, token := range []string{"token-user-A", "token-user-B", "token-user-C"} {
		identity := &RequestIdentity{Token: NewBearerToken(token)}
		ctx := context.WithValue(context.Background(), constants.RequestIdentityKey, identity)
		_, _ = factory.GetClient(ctx)
	}

	require.Len(t, tokens, 3)
	assert.Equal(t, "token-user-A", tokens[0])
	assert.Equal(t, "token-user-B", tokens[1])
	assert.Equal(t, "token-user-C", tokens[2])
}

func TestTokenClientFactory_MissingIdentityReturnsError(t *testing.T) {
	factory := &TokenClientFactory{
		Logger: slog.Default(),
		Header: config.DefaultAuthTokenHeader,
		Prefix: config.DefaultAuthTokenPrefix,
	}

	ctx := context.Background()
	client, err := factory.GetClient(ctx)

	assert.Nil(t, client)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "missing RequestIdentity")
}

func TestTokenClientFactory_EmptyTokenReturnsError(t *testing.T) {
	factory := &TokenClientFactory{
		Logger: slog.Default(),
		Header: config.DefaultAuthTokenHeader,
		Prefix: config.DefaultAuthTokenPrefix,
	}

	identity := &RequestIdentity{Token: NewBearerToken("")}
	ctx := context.WithValue(context.Background(), constants.RequestIdentityKey, identity)
	client, err := factory.GetClient(ctx)

	assert.Nil(t, client)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "invalid or missing identity token")
}

func TestExtractRequestIdentity_ParsesBearerToken(t *testing.T) {
	factory := &TokenClientFactory{
		Logger: slog.Default(),
		Header: config.DefaultAuthTokenHeader,
		Prefix: config.DefaultAuthTokenPrefix,
	}

	header := http.Header{}
	header.Set(config.DefaultAuthTokenHeader, "my-token-value")

	identity, err := factory.ExtractRequestIdentity(header)
	require.NoError(t, err)
	assert.Equal(t, "my-token-value", identity.Token.Raw())
}

func TestExtractRequestIdentity_MissingHeaderReturnsError(t *testing.T) {
	factory := &TokenClientFactory{
		Logger: slog.Default(),
		Header: config.DefaultAuthTokenHeader,
		Prefix: config.DefaultAuthTokenPrefix,
	}

	_, err := factory.ExtractRequestIdentity(http.Header{})
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "missing required header")
}

func TestNewTokenKubernetesClient_ConfiguresOnlyBearerTokenAuth(t *testing.T) {
	// Write a minimal kubeconfig so NewTokenKubernetesClient can load a base config.
	// No real connection is made - kubernetes.NewForConfig only configures the client.
	kubeconfig := `apiVersion: v1
kind: Config
clusters:
- cluster:
    server: https://127.0.0.1:6443
    insecure-skip-tls-verify: true
  name: test
contexts:
- context:
    cluster: test
    user: test
  name: test
current-context: test
users:
- name: test
  user:
    token: sa-token-that-must-be-stripped
`
	tmpDir := t.TempDir()
	kubeconfigPath := filepath.Join(tmpDir, "kubeconfig")
	require.NoError(t, os.WriteFile(kubeconfigPath, []byte(kubeconfig), 0600))
	t.Setenv("KUBECONFIG", kubeconfigPath)

	userToken := "user-bearer-token-xyz789" //nolint:gosec // test fixture, not a real credential
	client, err := NewTokenKubernetesClient(userToken, slog.Default())
	require.NoError(t, err)

	tkc, ok := client.(*TokenKubernetesClient)
	require.True(t, ok)

	assert.Equal(t, userToken, tkc.RestConfig.BearerToken, "rest.Config must carry the user's bearer token")
	assert.Empty(t, tkc.RestConfig.BearerTokenFile, "BearerTokenFile must be cleared")
	assert.Empty(t, tkc.RestConfig.Username, "Username must be cleared")
	assert.Empty(t, tkc.RestConfig.Password, "Password must be cleared")
	assert.Nil(t, tkc.RestConfig.ExecProvider, "ExecProvider must be cleared")
	assert.Nil(t, tkc.RestConfig.AuthProvider, "AuthProvider must be cleared")
	assert.Equal(t, userToken, tkc.Token.Raw(), "Token field must match the user's bearer token")
}

func TestNewTokenKubernetesClient_ForwardsUserTokenOnAPICall(t *testing.T) {
	userToken := "integration-test-user-token-abc123"

	var mu sync.Mutex
	var capturedAuthHeader string

	server := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		mu.Lock()
		capturedAuthHeader = r.Header.Get("Authorization")
		mu.Unlock()

		resp := authnv1.SelfSubjectReview{
			TypeMeta: metav1.TypeMeta{Kind: "SelfSubjectReview", APIVersion: "authentication.k8s.io/v1"},
			Status: authnv1.SelfSubjectReviewStatus{
				UserInfo: authnv1.UserInfo{Username: "test-user"},
			},
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(resp)
	}))
	defer server.Close()

	cfg := &rest.Config{
		Host: server.URL,
		TLSClientConfig: rest.TLSClientConfig{
			Insecure: true,
		},
		BearerToken: userToken,
	}

	clientset, err := kubernetes.NewForConfig(cfg)
	require.NoError(t, err)

	client := &TokenKubernetesClient{
		SharedClientLogic: SharedClientLogic{
			Client:     clientset,
			Logger:     slog.Default(),
			RestConfig: cfg,
			Token:      NewBearerToken(userToken),
		},
	}

	username, err := client.GetUser(context.Background(), nil)
	require.NoError(t, err)
	assert.Equal(t, "test-user", username)

	mu.Lock()
	defer mu.Unlock()
	assert.Equal(t, "Bearer "+userToken, capturedAuthHeader,
		"K8s API call must carry the user's bearer token, not an SA token")
}
