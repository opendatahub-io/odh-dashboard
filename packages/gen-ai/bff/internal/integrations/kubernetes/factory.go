package kubernetes

import (
	"context"
	"crypto/x509"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/opendatahub-io/gen-ai/internal/config"
	"github.com/opendatahub-io/gen-ai/internal/constants"
	helper "github.com/opendatahub-io/gen-ai/internal/helpers"
	"github.com/opendatahub-io/gen-ai/internal/integrations"
	"k8s.io/client-go/rest"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

func NewKubernetesClientFactory(cfg config.EnvConfig, logger *slog.Logger, rootCAs *x509.CertPool) (KubernetesClientFactory, error) {
	// TODO: Add support for internal auth method wherein we use the same
	// k8s static client for all requests in dev mode.
	// Leaving the code to be a switch statemenent so that it can be added later.
	// TODO: Add support for auth method disabled
	switch cfg.AuthMethod {
	case config.AuthMethodUser:
		k8sFactory := NewTokenClientFactory(logger, cfg, rootCAs)
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

// otelConfigRetryInterval is how often the factory retries OTel config
// manager discovery when the platform collector or MLflow CR was not yet
// available at startup.
const otelConfigRetryInterval = 30 * time.Second

// TokenClientFactory creates per-request Kubernetes clients authenticated
// with the caller's bearer token. The OTel config manager is discovered once
// and shared across clients; when the platform collector or MLflow CR is not
// yet available (e.g. the BFF starts before the DSC monitoring stack),
// discovery is retried in the background so that playgrounds installed later
// still get a collector endpoint and a collector route.
type TokenClientFactory struct {
	Logger   *slog.Logger
	Header   string
	Prefix   string
	Config   config.EnvConfig
	SAClient client.Client // in-cluster SA client for elevated operations (nil in local dev)

	otelMu    sync.Mutex
	otelMgr   *otelConfigManager
	otelStop  chan struct{}
	stopOnce  sync.Once
	otelRetry sync.Once

	// otelCreator and otelInterval are injectable for tests.
	otelCreator  func() (*otelConfigManager, error)
	otelInterval time.Duration
}

func NewTokenClientFactory(logger *slog.Logger, cfg config.EnvConfig, rootCAs *x509.CertPool) *TokenClientFactory {
	creator := func() (*otelConfigManager, error) {
		return newOTelConfigManager(logger, cfg, rootCAs)
	}
	return newTokenClientFactory(logger, cfg, creator, otelConfigRetryInterval)
}

func newTokenClientFactory(logger *slog.Logger, cfg config.EnvConfig, creator func() (*otelConfigManager, error), retryInterval time.Duration) *TokenClientFactory {
	ocm, err := creator()
	if err != nil {
		logger.Warn("failed to create OTel config manager, tracing route management will be unavailable", "error", err)
	}

	f := &TokenClientFactory{
		Logger:       logger,
		Header:       cfg.AuthTokenHeader,
		Prefix:       cfg.AuthTokenPrefix,
		Config:       cfg,
		SAClient:     nil, // set below when not mocked
		otelMgr:      ocm,
		otelStop:     make(chan struct{}),
		otelInterval: retryInterval,
		otelCreator:  creator,
	}

	if !cfg.MockK8sClient {
		saClient, err := buildSAClient(logger)
		if err != nil {
			logger.Warn("SA client unavailable (expected outside cluster)", "error", err)
		} else {
			f.SAClient = saClient
			logger.Info("SA client initialized for pgvector provisioning")
		}
	}

	if ocm == nil && !cfg.MockK8sClient {
		f.startOTelConfigManagerRetry()
	}

	return f
}

// getOTelConfigManager returns the current OTel config manager, or nil when
// discovery has not succeeded yet.
func (f *TokenClientFactory) getOTelConfigManager() *otelConfigManager {
	f.otelMu.Lock()
	defer f.otelMu.Unlock()
	return f.otelMgr
}

// startOTelConfigManagerRetry retries OTel config manager discovery in the
// background until it succeeds or Stop is called. This covers the case where
// the BFF starts before the platform collector or MLflow CR exists: without
// the retry, playgrounds installed later would get an empty collector
// endpoint and their traces would never reach MLflow.
func (f *TokenClientFactory) startOTelConfigManagerRetry() {
	f.otelRetry.Do(func() {
		f.Logger.Info("OTel config manager not initialized, retrying in background", "interval", f.otelInterval)
		go func() {
			ticker := time.NewTicker(f.otelInterval)
			defer ticker.Stop()
			for {
				select {
				case <-f.otelStop:
					return
				case <-ticker.C:
					ocm, err := f.otelCreator()
					if err != nil {
						f.Logger.Warn("failed to create OTel config manager, will retry", "error", err)
						continue
					}
					if ocm == nil {
						continue
					}
					f.otelMu.Lock()
					f.otelMgr = ocm
					f.otelMu.Unlock()
					f.Logger.Info("OTel config manager initialized after background retry")
					return
				}
			}
		}()
	})
}

// Stop cancels background OTel config manager discovery. It is safe to call
// multiple times and must not be called concurrently with itself.
func (f *TokenClientFactory) Stop() {
	f.stopOnce.Do(func() {
		close(f.otelStop)
	})
}

// buildSAClient creates a controller-runtime client using the pod's service
// account. Used for operations that require elevated permissions (creating
// Deployments, Services, PVCs) that the user's bearer token may not have.
func buildSAClient(logger *slog.Logger) (client.Client, error) {
	cfg, err := rest.InClusterConfig()
	if err != nil {
		return nil, fmt.Errorf("not running in cluster: %w", err)
	}

	scheme, err := helper.BuildScheme()
	if err != nil {
		return nil, fmt.Errorf("failed to build scheme: %w", err)
	}

	c, err := client.New(cfg, client.Options{Scheme: scheme})
	if err != nil {
		return nil, fmt.Errorf("failed to create SA client: %w", err)
	}
	return c, nil
}

func (f *TokenClientFactory) ExtractRequestIdentity(httpHeader http.Header) (*integrations.RequestIdentity, error) {
	raw := httpHeader.Get(f.Header)

	// Fallback: when the primary header (e.g. x-forwarded-access-token) is absent,
	// try the Authorization header with Bearer prefix. OGX's remote::passthrough
	// provider sends the user JWT this way on proxy endpoints.
	if raw == "" {
		if auth := httpHeader.Get("Authorization"); strings.HasPrefix(auth, "Bearer ") {
			token := strings.TrimPrefix(auth, "Bearer ")
			return &integrations.RequestIdentity{
				Token: strings.TrimSpace(token),
			}, nil
		}
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

	return newTokenKubernetesClient(identity.Token, f.Logger, f.Config, f.SAClient, f.getOTelConfigManager())
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
