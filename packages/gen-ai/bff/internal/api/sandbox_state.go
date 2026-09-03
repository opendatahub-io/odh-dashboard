package api

import (
	"context"
	"time"

	helper "github.com/opendatahub-io/gen-ai/internal/helpers"
)

const sandboxProbeTimeout = 10 * time.Second

const sandboxDiscoveryInterval = 30 * time.Second

// sandboxState groups the fields on App that are protected by sandboxMu.
//
// Read access:  isSandboxAvailable (RLock)
// Write access: refreshSandboxState (Lock)

func (app *App) isSandboxAvailable() bool {
	app.sandboxMu.RLock()
	defer app.sandboxMu.RUnlock()
	return app.sandboxesAvailable
}

func (app *App) refreshSandboxState() {
	ctx, cancel := context.WithTimeout(context.Background(), sandboxProbeTimeout)
	defer cancel()
	available := helper.CheckAgentSandboxCRDAvailable(ctx, app.logger)

	app.sandboxMu.Lock()
	defer app.sandboxMu.Unlock()

	if available == app.sandboxesAvailable {
		return
	}

	app.sandboxesAvailable = available
	app.logger.Info("agent sandbox CRD availability changed", "sandboxesAvailable", available)
}

func (app *App) startSandboxWatcher() {
	app.sandboxWatcherDone = make(chan struct{})
	app.sandboxWatcherWg.Add(1)
	ticker := time.NewTicker(sandboxDiscoveryInterval)
	go func() {
		defer app.sandboxWatcherWg.Done()
		defer ticker.Stop()
		for {
			select {
			case <-ticker.C:
				app.safeRefreshSandboxState()
			case <-app.sandboxWatcherDone:
				return
			}
		}
	}()
	app.logger.Info("started agent sandbox CRD watcher", "interval", sandboxDiscoveryInterval)
}

func (app *App) safeRefreshSandboxState() {
	defer func() {
		if r := recover(); r != nil {
			app.logger.Error("panic during agent sandbox CRD check", "recover", r)
		}
	}()
	app.refreshSandboxState()
}
