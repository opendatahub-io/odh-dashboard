package kubernetes

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"strings"

	"github.com/opendatahub-io/gen-ai/internal/config"
	"github.com/opendatahub-io/gen-ai/internal/constants"
	"github.com/opendatahub-io/gen-ai/internal/integrations"
)

func NewKubernetesClientFactory(cfg config.EnvConfig, logger *slog.Logger) (KubernetesClientFactory, error) {
	// TODO: Add support for internal auth method wherein we use the same
	// k8s static client for all requests in dev mode.
	// Leaving the code to be a switch statemenent so that it can be added later.
	// TODO: Add support for auth method disabled
	switch cfg.AuthMethod {
	case config.AuthMethodUser:
		k8sFactory := NewTokenClientFactory(logger, cfg)
		return k8sFactory, nil

	default:
		return nil, fmt.Errorf("invalid auth method: %q", cfg.AuthMethod)
	}
}

type KubernetesClientFactory interface {
	GetClient(ctx context.Context) (KubernetesClientInterface, error)
	ExtractRequestIdentity(httpHeader http.Header) (*integrations.RequestIdentity, error)
	ValidateRequestIdentity(identity *integrations.RequestIdentity) error
}

type TokenClientFactory struct {
	Logger *slog.Logger
	Header string
	Prefix string
}

func NewTokenClientFactory(logger *slog.Logger, cfg config.EnvConfig) *TokenClientFactory {
	return &TokenClientFactory{
		Logger: logger,
		Header: cfg.AuthTokenHeader,
		Prefix: cfg.AuthTokenPrefix,
	}
}

func (f *TokenClientFactory) ExtractRequestIdentity(httpHeader http.Header) (*integrations.RequestIdentity, error) {
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

	return &integrations.RequestIdentity{
		Token: strings.TrimSpace(token),
	}, nil
}

func (f *TokenClientFactory) GetClient(ctx context.Context) (KubernetesClientInterface, error) {
	identityVal := ctx.Value(constants.RequestIdentityKey)
	if identityVal == nil {
		return nil, fmt.Errorf("missing RequestIdentity in context")
	}

	identity, ok := identityVal.(*integrations.RequestIdentity)
	if !ok || identity.Token == "" {
		return nil, fmt.Errorf("invalid or missing identity token")
	}

	return newTokenKubernetesClient(identity.Token, f.Logger)
}

func (f *TokenClientFactory) ValidateRequestIdentity(identity *integrations.RequestIdentity) error {
	if identity == nil {
		return errors.New("missing identity")
	}

	if identity.Token == "" {
		return errors.New("token is required for token-based authentication")
	}

	return nil
}
