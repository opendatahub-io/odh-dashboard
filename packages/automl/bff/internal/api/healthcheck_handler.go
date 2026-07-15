package api

import (
	"log/slog"
	"net/http"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/automl-library/bff/internal/repositories"
)

type HealthcheckHandler struct {
	logger *slog.Logger
	repo   *repositories.HealthCheckRepository
}

func (h *HealthcheckHandler) HealthcheckHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	healthCheck, err := h.repo.HealthCheck(Version)
	if err != nil {
		serverErrorResponse(h.logger, w, r, err)
		return
	}

	err = writeJSON(w, http.StatusOK, healthCheck, nil)
	if err != nil {
		serverErrorResponse(h.logger, w, r, err)
	}
}
