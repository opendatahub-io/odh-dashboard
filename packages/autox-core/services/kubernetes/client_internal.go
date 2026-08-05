package kubernetes

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"os"
	"strings"

	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
)

// internalClient implements Kubernetes operations using in-cluster service account
// with user impersonation for RBAC enforcement.
//
// Impersonation is handled via a custom RoundTripper that reads RequestIdentity from
// the request context and sets impersonation headers. Clients are created once during
// initialization for efficiency.
//
// Security: Identity is mandatory - operations without identity are rejected to prevent
// privilege escalation via service account permissions.
//
// All operations except GetUser are shared with tokenClient via the embedded baseClient
// (see client_base.go). GetUser and the RoundTripper are the only auth-mode-specific pieces.
type internalClient struct {
	baseClient
}

// NewInternalClient creates an internal client with injectable Clientset and DynamicClient (for testing).
func NewInternalClient(cs Clientset, dc DynamicClient) Client {
	return &internalClient{baseClient{Clientset: cs, DynamicClient: dc}}
}

// NewDefaultInternalClient creates an internal client that uses impersonation for all operations.
// Automatically detects in-cluster (pod service account) vs out-of-cluster (kubeconfig) environments.
//
// The returned client:
//   - Requires RequestIdentity in context for all operations (enforces RBAC)
//   - Uses a custom RoundTripper to inject impersonation headers from context
//   - Creates clients once at initialization (efficient)
//   - Needs only "impersonate" permission for the service account (minimal privilege)
//
// Returns an error if Kubernetes configuration cannot be loaded or clients cannot be created.
func NewDefaultInternalClient() (Client, error) {
	baseConfig, err := getKubernetesConfig()
	if err != nil {
		return nil, err
	}

	clientCfg := rest.CopyConfig(baseConfig)
	clientCfg.WrapTransport = func(rt http.RoundTripper) http.RoundTripper {
		return &impersonationRoundTripper{base: rt}
	}

	cs, err := kubernetes.NewForConfig(clientCfg)
	if err != nil {
		return nil, err
	}

	dc, err := dynamic.NewForConfig(clientCfg)
	if err != nil {
		return nil, err
	}

	return &internalClient{baseClient{Clientset: cs, DynamicClient: dc}}, nil
}

func (c *internalClient) GetUser(ctx context.Context) (string, error) {
	identity, err := IdentityFromContext(ctx)
	if err != nil {
		return "", err
	}

	return identity.UserID, nil
}

// NewSATokenTransportWrapper returns a WrapTransport function that injects the pod's
// service account token into every outbound request. Intended for internal auth mode,
// where there is no per-request user token — the BFF authenticates to downstream
// services (e.g. kube-rbac-proxy in front of model registry) using its own SA credentials.
//
// Token rotation is handled automatically: when running in-cluster the token file is
// re-read on each request so that short-lived projected tokens stay current.
// In local development (kubeconfig), the static token from the kubeconfig is used.
//
// Returns an error at startup if the Kubernetes config cannot be loaded, so misconfiguration
// is caught before serving any requests.
//
// onTokenFileReadError, if non-nil, is invoked whenever the token file fails to read
// (e.g. transient permission or filesystem issue). This layer has no logger of its own —
// it only maps failures to a callback — so the composition root (app.go) can decide how to
// observe it (typically by logging with mw.logger). The round tripper always falls back to
// the last-known token so a single failed read doesn't fail the outbound request outright.
func NewSATokenTransportWrapper(onTokenFileReadError func(tokenFile string, err error)) (func(http.RoundTripper) http.RoundTripper, error) {
	cfg, err := getKubernetesConfig()
	if err != nil {
		return nil, fmt.Errorf("failed to load kubernetes config for SA token transport: %w", err)
	}
	return func(base http.RoundTripper) http.RoundTripper {
		return &saTokenRoundTripper{
			base:                 base,
			token:                cfg.BearerToken,
			tokenFile:            cfg.BearerTokenFile,
			onTokenFileReadError: onTokenFileReadError,
		}
	}, nil
}

// saTokenRoundTripper injects the pod's service account token into outbound requests.
// It re-reads the token file on each request to handle short-lived projected token rotation.
type saTokenRoundTripper struct {
	base                 http.RoundTripper
	token                string // static token (local dev / kubeconfig)
	tokenFile            string // projected token file path (in-cluster, rotated by kubelet)
	onTokenFileReadError func(tokenFile string, err error)
}

func (t *saTokenRoundTripper) RoundTrip(req *http.Request) (*http.Response, error) {
	token := t.token
	if t.tokenFile != "" {
		if data, err := os.ReadFile(t.tokenFile); err == nil {
			if s := strings.TrimSpace(string(data)); s != "" {
				token = s
			}
		} else {
			if t.onTokenFileReadError != nil {
				t.onTokenFileReadError(t.tokenFile, err)
			}
		}
	}
	if token == "" {
		return nil, errors.New("service account token is empty")
	}
	req2 := req.Clone(req.Context())
	req2.Header.Set("Authorization", "Bearer "+token)
	return t.base.RoundTrip(req2)
}

// impersonationRoundTripper injects impersonation headers from the RequestIdentity in context.
// This allows a single client to handle requests for multiple users efficiently.
type impersonationRoundTripper struct {
	base http.RoundTripper
}

func (t *impersonationRoundTripper) RoundTrip(req *http.Request) (*http.Response, error) {
	ctx := req.Context()
	identity, err := IdentityFromContext(ctx)
	if err != nil {
		return nil, err
	}

	if identity.UserID == "" {
		return nil, &ValidationError{
			Field:   "identity.UserID",
			Message: "identity UserID is required for impersonation",
		}
	}

	req2 := req.Clone(ctx)

	// Set impersonation headers on the cloned request
	req2.Header.Set("Impersonate-User", identity.UserID)
	req2.Header.Del("Impersonate-Group")
	req2.Header.Del("Impersonate-Uid")

	// Add group headers
	for _, group := range identity.Groups {
		req2.Header.Add("Impersonate-Group", group)
	}

	return t.base.RoundTrip(req2)
}

// Compile-time interface check.
var _ Client = (*internalClient)(nil)
