package api

import (
	"context"
	"log/slog"
	"net/http"
	"time"

	k8s "github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/integrations/kubernetes"
)

// emitAuditLogAsync logs the request details asynchronously without blocking the handler.
// For non-admin routes, the admin status is resolved in the background via SSAR.
func (app *App) emitAuditLogAsync(ctx context.Context, client k8s.KubernetesClientInterface, username string, identity *k8s.RequestIdentity, r *http.Request, needsAdmin bool) {
	method := r.Method
	url := *r.URL

	go func() {
		// Detach from request context so the SSAR call doesn't race with handler completion.
		auditCtx, cancel := context.WithTimeout(context.WithoutCancel(ctx), 10*time.Second)
		defer cancel()
		isAdmin, err := client.IsUserAdmin(auditCtx, identity)
		if err != nil {
			app.logger.Warn("audit log admin check failed", slog.Any("error", err))
		}
		r := &http.Request{Method: method, URL: &url}
		if err != nil {
			app.emitAuditLogWithError(username, r, needsAdmin, isAdmin, err)
		} else {
			app.emitAuditLog(username, r, needsAdmin, isAdmin)
		}
	}()
}

// emitAuditLog writes a structured audit log entry.
func (app *App) emitAuditLog(username string, r *http.Request, needsAdmin bool, isAdmin bool) {
	app.logger.Info("audit",
		slog.String("user", username),
		slog.String("namespace", app.config.Namespace),
		slog.String("action", r.Method),
		slog.String("endpoint", r.URL.Path),
		slog.Bool("isAdmin", isAdmin),
		slog.Bool("needsAdmin", needsAdmin),
		slog.String("timestamp", time.Now().UTC().Format(time.RFC3339)),
	)
}

// emitAuditLogWithError writes a structured audit log entry with an admin check error,
// so log consumers can distinguish "confirmed non-admin" from "couldn't determine."
func (app *App) emitAuditLogWithError(username string, r *http.Request, needsAdmin bool, isAdmin bool, adminErr error) {
	app.logger.Info("audit",
		slog.String("user", username),
		slog.String("namespace", app.config.Namespace),
		slog.String("action", r.Method),
		slog.String("endpoint", r.URL.Path),
		slog.Bool("isAdmin", isAdmin),
		slog.Bool("needsAdmin", needsAdmin),
		slog.String("adminCheckError", adminErr.Error()),
		slog.String("timestamp", time.Now().UTC().Format(time.RFC3339)),
	)
}
