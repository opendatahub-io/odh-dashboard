package kubernetes

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"strings"

	"github.com/opendatahub-io/data-registry/bff/internal/config"
	"github.com/opendatahub-io/data-registry/bff/internal/constants"
)

func NewKubernetesClientFactory(cfg config.EnvConfig, logger *slog.Logger) (KubernetesClientFactory, error) {
	if cfg.AuthMethod != config.AuthMethodUser {
		return nil, fmt.Errorf("invalid auth method: %q (only %q is supported)", cfg.AuthMethod, config.AuthMethodUser)
	}

	return NewTokenClientFactory(logger, cfg), nil
}

type KubernetesClientFactory interface {
	GetClient(ctx context.Context) (KubernetesClientInterface, error)
	ExtractRequestIdentity(httpHeader http.Header) (*RequestIdentity, error)
	ValidateRequestIdentity(identity *RequestIdentity) error
}

// TokenClientFactory uses the authenticated user's bearer token for every Kubernetes request.

type TokenClientFactory struct {
	Logger *slog.Logger
	Header string
	Prefix string
	// NewTokenKubernetesClientFn is the function used to create token-based Kubernetes clients.
	// This can be overridden by downstream code to provide custom client creation logic.
	NewTokenKubernetesClientFn func(token string, logger *slog.Logger) (KubernetesClientInterface, error)
}

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
		return nil, fmt.Errorf("missing required Header: %s", f.Header)
	}

	token := raw
	if f.Prefix != "" {
		if !strings.HasPrefix(raw, f.Prefix) {
			return nil, fmt.Errorf("expected token Header %s to start with Prefix %q", f.Header, f.Prefix)
		}
		token = strings.TrimPrefix(raw, f.Prefix)
	}

	return &RequestIdentity{
		Token: strings.TrimSpace(token),
	}, nil
}

func (f *TokenClientFactory) ValidateRequestIdentity(identity *RequestIdentity) error {

	if identity == nil {
		return errors.New("missing identity")
	}

	if identity.Token == "" {
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
	if !ok || identity.Token == "" {
		return nil, fmt.Errorf("invalid or missing identity token")
	}

	return f.NewTokenKubernetesClientFn(identity.Token, f.Logger)
}
