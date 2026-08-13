package api

import (
	"io"
	"log/slog"

	"github.com/kubeflow/hub/ui/bff/internal/config"
	"github.com/kubeflow/hub/ui/bff/internal/integrations/bffclient"
	k8s "github.com/kubeflow/hub/ui/bff/internal/integrations/kubernetes"
	"github.com/kubeflow/hub/ui/bff/internal/repositories"
)

// NewTestApp exposes a minimal constructor that allows tests and downstream
// extensions to configure specific App dependencies without invoking the
// production bootstrap logic.
func NewTestApp(cfg config.EnvConfig, logger *slog.Logger, factory k8s.KubernetesClientFactory, repos *repositories.Repositories) *App {
	if logger == nil {
		logger = slog.New(slog.NewTextHandler(io.Discard, nil))
	}
	return &App{
		config:                  cfg,
		logger:                  logger,
		kubernetesClientFactory: factory,
		repositories:            repos,
	}
}

// SetBFFClientFactoryForTest lets tests inject a (typically mock) inter-BFF
// client factory into an App built via NewTestApp. It marks the lazy-init guard
// as already fired so a later BFFClientFactory() call doesn't overwrite it.
func (app *App) SetBFFClientFactoryForTest(factory bffclient.BFFClientFactory) {
	app.bffClientFactoryOnce.Do(func() {})
	app.bffClientFactory = factory
}
