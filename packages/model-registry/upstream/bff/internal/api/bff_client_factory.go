package api

import (
	"crypto/x509"
	"log/slog"

	"github.com/kubeflow/hub/ui/bff/internal/config"
	"github.com/kubeflow/hub/ui/bff/internal/integrations/bffclient"
	"github.com/kubeflow/hub/ui/bff/internal/integrations/bffclient/bffmocks"
)

// BFFClientFactory exposes the inter-BFF client factory for extensions (see
// docs/inter-bff-communication.md), used to resolve MCP Registry server details
// from the MLflow BFF. Built lazily on first use, rather than in NewApp, so that
// function -- shared with upstream -- doesn't need to carry this setup logic.
func (app *App) BFFClientFactory() bffclient.BFFClientFactory {
	app.bffClientFactoryOnce.Do(func() {
		app.bffClientFactory = newBFFClientFactory(app.config, app.podNamespace, app.rootCAs, app.logger)
	})
	return app.bffClientFactory
}

func newBFFClientFactory(cfg config.EnvConfig, podNamespace string, rootCAs *x509.CertPool, logger *slog.Logger) bffclient.BFFClientFactory {
	bffConfig := bffclient.NewDefaultBFFClientConfig()
	bffConfig.MockBFFClients = cfg.MockBFFClients
	bffConfig.InsecureSkipVerify = cfg.InsecureSkipVerify
	bffConfig.PodNamespace = podNamespace

	if mlflowConfig := bffConfig.GetServiceConfig(bffclient.BFFTargetMLflow); mlflowConfig != nil {
		if cfg.BFFMLflowServiceName != "" {
			mlflowConfig.ServiceName = cfg.BFFMLflowServiceName
		}
		if cfg.BFFMLflowServicePort > 0 {
			mlflowConfig.Port = cfg.BFFMLflowServicePort
		}
		mlflowConfig.TLSEnabled = cfg.BFFMLflowTLSEnabled
		mlflowConfig.DevOverrideURL = cfg.BFFMLflowDevURL
		if cfg.BFFMLflowAuthMethod != "" {
			mlflowConfig.AuthMethod = cfg.BFFMLflowAuthMethod
		}
		if cfg.BFFMLflowAuthTokenHeader != "" {
			mlflowConfig.AuthTokenHeader = cfg.BFFMLflowAuthTokenHeader
		}
		// AuthTokenPrefix can be empty (which is the ODH default)
		mlflowConfig.AuthTokenPrefix = cfg.BFFMLflowAuthTokenPrefix
	}

	if cfg.MockBFFClients {
		if logger != nil {
			logger.Info("Using mock BFF client factory")
		}
		return bffmocks.NewMockClientFactory(logger)
	}
	return bffclient.NewRealClientFactory(bffConfig, rootCAs, cfg.InsecureSkipVerify, logger)
}
