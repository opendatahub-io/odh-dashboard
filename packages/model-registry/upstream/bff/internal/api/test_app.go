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
// client factory into an App built via NewTestApp. The assignment happens inside
// the Once so it's synchronized with BFFClientFactory()'s read the same way the
// production lazy-init path is -- assigning outside Do would race with a
// concurrent BFFClientFactory() call under go test -race.
func (app *App) SetBFFClientFactoryForTest(factory bffclient.BFFClientFactory) {
	app.bffClientFactoryOnce.Do(func() {
		app.bffClientFactory = factory
	})
}
