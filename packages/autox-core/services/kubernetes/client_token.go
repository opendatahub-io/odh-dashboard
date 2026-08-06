package kubernetes

import (
	"context"
	"errors"
	"net/http"
	"time"

	authenticationv1 "k8s.io/api/authentication/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
)

// tokenClient implements Kubernetes operations using user tokens.
//
// All operations except GetUser are shared with internalClient via the embedded
// baseClient (see client_base.go). GetUser and the RoundTripper are the only
// auth-mode-specific pieces.
type tokenClient struct {
	baseClient
}

// NewTokenClient creates a token client with injectable Clientset and DynamicClient (for testing).
func NewTokenClient(cs Clientset, dc DynamicClient) Client {
	return &tokenClient{baseClient{Clientset: cs, DynamicClient: dc}}
}

// NewDefaultTokenClient creates a token client with real Kubernetes Clientset and dynamic client.
// Automatically detects in-cluster (pod service account) vs out-of-cluster (kubeconfig) environments.
// Wraps all requests with user token authentication via RoundTripper.
// The user token is extracted from the request context via IdentityFromContext.
// Returns an error if Kubernetes configuration cannot be loaded or clients cannot be created.
func NewDefaultTokenClient() (Client, error) {
	baseConfig, err := getKubernetesConfig()
	if err != nil {
		return nil, err
	}

	clientCfg := rest.CopyConfig(baseConfig)
	clientCfg.WrapTransport = func(rt http.RoundTripper) http.RoundTripper {
		return &tokenRoundTripper{base: rt}
	}

	cs, err := kubernetes.NewForConfig(clientCfg)
	if err != nil {
		return nil, err
	}

	dc, err := dynamic.NewForConfig(clientCfg)
	if err != nil {
		return nil, err
	}

	return &tokenClient{baseClient{Clientset: cs, DynamicClient: dc}}, nil
}

func (c *tokenClient) GetUser(ctx context.Context) (string, error) {
	timeoutCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	ssr := &authenticationv1.SelfSubjectReview{}
	resp, err := c.Clientset.AuthenticationV1().SelfSubjectReviews().Create(timeoutCtx, ssr, metav1.CreateOptions{})
	if err != nil {
		return "", err
	}

	username := resp.Status.UserInfo.Username
	if username == "" {
		return "", &ValidationError{Field: "token", Message: "no username found in token"}
	}

	return username, nil
}

// NewBearerTokenRoundTripper wraps base with a RoundTripper that injects the user's
// bearer token from the RequestIdentity stored in each request's context.
func NewBearerTokenRoundTripper(base http.RoundTripper) http.RoundTripper {
	return &tokenRoundTripper{base: base}
}

// tokenRoundTripper injects the user's bearer token into all Kubernetes API requests.
type tokenRoundTripper struct {
	base http.RoundTripper
}

func (t *tokenRoundTripper) RoundTrip(req *http.Request) (*http.Response, error) {
	ctx := req.Context()
	identity, err := IdentityFromContext(ctx)
	if err != nil {
		return nil, err
	}

	if identity.Token == "" {
		return nil, errors.New("identity token is empty")
	}

	req2 := req.Clone(ctx)
	req2.Header.Set("Authorization", "Bearer "+identity.Token)
	return t.base.RoundTrip(req2)
}

// Compile-time interface check.
var _ Client = (*tokenClient)(nil)
