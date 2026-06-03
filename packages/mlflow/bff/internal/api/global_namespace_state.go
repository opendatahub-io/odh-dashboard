package api

import (
	"context"
	"log/slog"
	"slices"
	"time"

	"github.com/opendatahub-io/mlflow/bff/internal/config"
)

const globalNamespaceDiscoveryInterval = 30 * time.Second

func (app *App) getGlobalNamespaces() []string {
	app.globalNamespacesMu.RLock()
	defer app.globalNamespacesMu.RUnlock()
	return slices.Clone(app.globalNamespaces)
}

func (app *App) refreshGlobalNamespaces() {
	if app.dashboardConfigReader == nil {
		return
	}

	namespaces, err := app.dashboardConfigReader.FetchGlobalMLflowNamespaces(context.Background())
	if err != nil {
		app.logger.Debug("Failed to fetch global MLflow namespaces, preserving cached value",
			slog.Any("error", err))
		return
	}

	app.globalNamespacesMu.Lock()
	defer app.globalNamespacesMu.Unlock()

	if slices.Equal(app.globalNamespaces, namespaces) {
		return
	}

	app.logger.Info("Global MLflow namespaces updated",
		slog.Any("previous", app.globalNamespaces),
		slog.Any("current", namespaces))
	app.globalNamespaces = namespaces
}

func (app *App) startGlobalNamespaceWatcher() {
	app.globalNsWatcherDone = make(chan struct{})
	app.globalNsWatcherWg.Add(1)
	ticker := time.NewTicker(globalNamespaceDiscoveryInterval)
	go func() {
		defer app.globalNsWatcherWg.Done()
		defer ticker.Stop()
		for {
			select {
			case <-ticker.C:
				app.safeRefreshGlobalNamespaces()
			case <-app.globalNsWatcherDone:
				return
			}
		}
	}()
	app.logger.Info("Started global namespace watcher",
		slog.Duration("interval", globalNamespaceDiscoveryInterval))
}

func (app *App) safeRefreshGlobalNamespaces() {
	defer func() {
		if r := recover(); r != nil {
			app.logger.Error("panic during global namespace refresh", slog.Any("recover", r))
		}
	}()
	app.refreshGlobalNamespaces()
}

func (app *App) shouldWatchGlobalNamespaces() bool {
	return app.config.AuthMethod != config.AuthMethodDisabled
}
