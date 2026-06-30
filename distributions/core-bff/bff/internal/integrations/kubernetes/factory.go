package kubernetes

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"strings"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/config"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/constants"
)

// KubernetesClientFactory creates per-request Kubernetes clients and extracts
// request identity from HTTP headers.
type KubernetesClientFactory interface {
	GetClient(ctx context.Context) (KubernetesClientInterface, error)
	ExtractRequestIdentity(httpHeader http.Header) (*RequestIdentity, error)
	ValidateRequestIdentity(identity *RequestIdentity) error
}

// NewKubernetesClientFactory creates a Kubernetes client factory based on the configured auth method.
func NewKubernetesClientFactory(cfg config.EnvConfig, logger *slog.Logger) (KubernetesClientFactory, error) {
	switch cfg.AuthMethod {
	case config.AuthMethodDisabled, config.AuthMethodUser:
		k8sFactory := NewTokenClientFactory(logger, cfg)
		return k8sFactory, nil
	default:
		return nil, fmt.Errorf("invalid auth method: %q", cfg.AuthMethod)
	}
}

// ─── TOKEN FACTORY (USER TOKEN) ────────────────────────────────────────────────
// Uses a user-provided Bearer token for client creation.
// Each user has a separate client instance.

// TokenClientFactory creates Kubernetes clients using user-provided bearer tokens.
type TokenClientFactory struct {
	Logger *slog.Logger
	Header string
	Prefix string
	// NewTokenKubernetesClientFn is the function used to create token-based Kubernetes clients.
	// This can be overridden by downstream code to provide custom client creation logic.
	NewTokenKubernetesClientFn func(token string, logger *slog.Logger) (KubernetesClientInterface, error)
}

// NewTokenClientFactory creates a new token-based Kubernetes client factory.
func NewTokenClientFactory(logger *slog.Logger, cfg config.EnvConfig) KubernetesClientFactory {
	return &TokenClientFactory{
		Logger:                     logger,
		Header:                     cfg.AuthTokenHeader,
		Prefix:                     cfg.AuthTokenPrefix,
		NewTokenKubernetesClientFn: NewTokenKubernetesClient,
	}
}

func (f *TokenClientFactory) ExtractRequestIdentity(httpHeader http.Header) (*RequestIdentity, error) {
	raw := httpHeader.Get(f.Header)
	if raw == "" {
		return nil, fmt.Errorf("missing required header: %s", f.Header)
	}

	token := raw
	if f.Prefix != "" {
		if !strings.HasPrefix(raw, f.Prefix) {
			return nil, fmt.Errorf("expected token header %s to start with prefix %q", f.Header, f.Prefix)
		}
		token = strings.TrimPrefix(raw, f.Prefix)
	}

	return &RequestIdentity{
		Token: NewBearerToken(strings.TrimSpace(token)),
	}, nil
}

func (f *TokenClientFactory) ValidateRequestIdentity(identity *RequestIdentity) error {

	if identity == nil {
		return errors.New("missing identity")
	}

	if identity.Token.Raw() == "" {
		return errors.New("token is required for token-based authentication")
	}

	return nil
}

func (f *TokenClientFactory) GetClient(ctx context.Context) (KubernetesClientInterface, error) {
	identityVal := ctx.Value(constants.RequestIdentityKey)
	if identityVal == nil {
		return nil, fmt.Errorf("missing RequestIdentity in context")
	}

	identity, ok := identityVal.(*RequestIdentity)
	if !ok || identity.Token.Raw() == "" {
		return nil, fmt.Errorf("invalid or missing identity token")
	}

	return f.NewTokenKubernetesClientFn(identity.Token.Raw(), f.Logger)
}
