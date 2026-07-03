package api

import (
	"log/slog"
	"net/http"
)

// emitAuditLog writes a structured audit log entry.
// The isAdmin field is only included when needsAdmin is true, since non-admin
// routes do not perform an SSAR check and the value would be misleading.
func (app *App) emitAuditLog(username string, r *http.Request, needsAdmin bool, isAdmin bool) {
	attrs := []any{
		slog.String("user", username),
		slog.String("namespace", app.config.Namespace),
		slog.String("action", r.Method),
		slog.String("endpoint", r.URL.Path),
		slog.Bool("needsAdmin", needsAdmin),
	}
	if needsAdmin {
		attrs = append(attrs, slog.Bool("isAdmin", isAdmin))
	}
	app.logger.Info("audit", attrs...)
}

// emitAuditLogWithAdminCheckError writes an audit log entry when the SSAR admin check
// fails, so log consumers can distinguish "confirmed non-admin" from "couldn't determine."
func (app *App) emitAuditLogWithAdminCheckError(username string, r *http.Request, adminErr error) {
	app.logger.Info("audit",
		slog.String("user", username),
		slog.String("namespace", app.config.Namespace),
		slog.String("action", r.Method),
		slog.String("endpoint", r.URL.Path),
		slog.Bool("isAdmin", false),
		slog.Bool("needsAdmin", true),
		slog.String("adminCheckError", adminErr.Error()),
	)
}
