package api

import (
	"context"
	"errors"
	"log/slog"
	"net/http"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/httpcontract"
	k8serrors "k8s.io/apimachinery/pkg/api/errors"
)

// Aliases preserve existing handler/test types while sharing the wire contract with proxies.
type HTTPError = httpcontract.HTTPError
type ErrorPayload = httpcontract.ErrorPayload

func (app *App) LogError(r *http.Request, err error) {
	level := slog.LevelError
	code := httpcontract.SafeErrorCode(err)
	status := httpcontract.Classify(err, http.StatusInternalServerError).StatusCode
	var upstream k8serrors.APIStatus
	if errors.As(err, &upstream) {
		status = int(upstream.Status().Code)
	}
	if status >= http.StatusBadRequest && status < http.StatusInternalServerError {
		level = slog.LevelWarn
	}
	if errors.Is(err, context.Canceled) || errors.Is(r.Context().Err(), context.Canceled) {
		level, code = slog.LevelDebug, "CANCELED"
	}
	httpcontract.Log(app.logger, r).Log(r.Context(), level, "request failed", "code", code, "method", r.Method)
}
func (app *App) logRejection(r *http.Request, err error, status int) {
	httpcontract.Log(app.logger, r).Warn("request rejected", "code", httpcontract.Local(status).Error.Code,
		"cause", httpcontract.SafeErrorCode(err), "method", r.Method)
}
func (app *App) badRequestResponse(w http.ResponseWriter, r *http.Request, err error) {
	app.logRejection(r, err, http.StatusBadRequest)
	httpcontract.WriteLocal(w, r, http.StatusBadRequest)
}
func (app *App) unauthorizedResponse(w http.ResponseWriter, r *http.Request, err error) {
	app.logRejection(r, err, http.StatusUnauthorized)
	httpcontract.WriteLocal(w, r, http.StatusUnauthorized)
}
func (app *App) forbiddenResponse(w http.ResponseWriter, r *http.Request, err error) {
	app.logRejection(r, err, http.StatusForbidden)
	httpcontract.WriteLocal(w, r, http.StatusForbidden)
}
func (app *App) notFoundResponse(w http.ResponseWriter, r *http.Request) {
	httpcontract.WriteLocal(w, r, http.StatusNotFound)
}
func (app *App) methodNotAllowedResponse(w http.ResponseWriter, r *http.Request) {
	httpcontract.WriteLocal(w, r, http.StatusMethodNotAllowed)
}
func (app *App) errorResponse(w http.ResponseWriter, r *http.Request, e *HTTPError) {
	httpcontract.WriteBFF(w, r, e)
}
func (app *App) serverErrorResponse(w http.ResponseWriter, r *http.Request, err error) {
	app.LogError(r, err)
	httpcontract.WriteError(w, r, err, http.StatusInternalServerError)
}
func (app *App) k8sErrorResponse(w http.ResponseWriter, r *http.Request, err error) {
	app.serverErrorResponse(w, r, err)
}
