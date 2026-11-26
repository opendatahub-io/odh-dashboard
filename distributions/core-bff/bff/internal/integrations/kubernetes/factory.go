package kubernetes

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/callerauth"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/config"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/constants"
	"k8s.io/client-go/rest"
)

// KubernetesClientFactory creates per-request Kubernetes clients and extracts
// request identity from HTTP headers.
type KubernetesClientFactory interface {
	GetClient(ctx context.Context) (KubernetesClientInterface, error)
	ExtractRequestIdentity(httpHeader http.Header) (*RequestIdentity, error)
	ValidateRequestIdentity(identity *RequestIdentity) error
}

// NewKubernetesClientFactory creates a Kubernetes client factory based on the
// configured auth method. When base is non-nil every caller client is built
// from a copy of it instead of a fresh kubeconfig read, so a kubeconfig that
// changes after startup cannot bypass the checks base passed.
func NewKubernetesClientFactory(cfg config.EnvConfig, logger *slog.Logger, base *rest.Config) (KubernetesClientFactory, error) {
	switch cfg.AuthMethod {
	case config.AuthMethodDisabled, config.AuthMethodUser:
		// NewTokenClientFactory builds the shared caller-credential extractor;
		// only the client constructor is replaced when base is set.
		k8sFactory := NewTokenClientFactory(logger, cfg).(*TokenClientFactory)
		if base != nil {
			validated := rest.CopyConfig(base)
			k8sFactory.NewTokenKubernetesClientFn = func(ctx context.Context, token string, logger *slog.Logger) (KubernetesClientInterface, error) {
				return newTokenKubernetesClientFromBase(ctx, validated, token, logger)
			}
			k8sFactory.newDevFallbackClientFn = func(ctx context.Context, logger *slog.Logger) (KubernetesClientInterface, error) {
				return newKubeconfigKubernetesClientFromBase(ctx, validated, logger)
			}
		}
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
	// Header and Prefix are the single-header settings. They are used only when
	// Credentials was not built (tests and downstream code that construct the
	// factory literally); NewTokenClientFactory always sets Credentials.
	Header string
	Prefix string
	// Credentials is the caller-credential extractor shared by every transport.
	Credentials *callerauth.Extractor
	// NewTokenKubernetesClientFn is the function used to create token-based Kubernetes clients.
	// Pass the request context and base logger; resolve audit correlation when logging.
	// This can be overridden by downstream code to provide custom client creation logic.
	NewTokenKubernetesClientFn func(ctx context.Context, token string, logger *slog.Logger) (KubernetesClientInterface, error)
	// newDevFallbackClientFn builds the DEV_MODE fallback client. It is set to
	// use the validated startup kubeconfig; nil means a fresh read, which only
	// factories built without one (tests) use.
	newDevFallbackClientFn func(ctx context.Context, logger *slog.Logger) (KubernetesClientInterface, error)
}

// NewTokenClientFactory creates a new token-based Kubernetes client factory.
func NewTokenClientFactory(logger *slog.Logger, cfg config.EnvConfig) KubernetesClientFactory {
	extractor := callerauth.New(cfg)
	return &TokenClientFactory{
		Logger:                     logger,
		Header:                     cfg.AuthTokenHeader,
		Prefix:                     cfg.AuthTokenPrefix,
		Credentials:                &extractor,
		NewTokenKubernetesClientFn: NewTokenKubernetesClient,
	}
}

func (f *TokenClientFactory) extractor() callerauth.Extractor {
	if f.Credentials != nil {
		return *f.Credentials
	}
	return callerauth.Legacy(f.Header, f.Prefix)
}

// ExtractRequestIdentity resolves the caller credential. The identity carries
// only the token; the user name is resolved later by SelfSubjectReview, so a
// header can never assert who the caller is.
func (f *TokenClientFactory) ExtractRequestIdentity(httpHeader http.Header) (*RequestIdentity, error) {
	cred, err := f.extractor().Extract(httpHeader)
	if err != nil {
		return nil, err
	}
	return &RequestIdentity{
		Token: NewBearerToken(cred.Token),
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

	if identity.DevFallback {
		if f.newDevFallbackClientFn != nil {
			return f.newDevFallbackClientFn(ctx, f.Logger)
		}
		return NewKubeconfigKubernetesClient(ctx, f.Logger)
	}

	return f.NewTokenKubernetesClientFn(ctx, identity.Token.Raw(), f.Logger)
}
