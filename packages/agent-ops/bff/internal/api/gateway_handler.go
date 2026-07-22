package api

import (
	"fmt"
	"log/slog"
	"net/http"

	"github.com/julienschmidt/httprouter"
	helper "github.com/opendatahub-io/mod-arch-library/bff/internal/helpers"
	"github.com/opendatahub-io/mod-arch-library/bff/internal/models"
)

type GatewayListEnvelope Envelope[*models.GatewayListResponse, None]
type GatewayEnvelope Envelope[*models.Gateway, None]

func (app *App) ListGatewaysHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()
	logger := helper.GetContextLoggerFromReq(r)

	// Gateways are global infrastructure — always discovered from the configured
	// gateway namespace, not from the user's selected project. Follows the model
	// registry pattern where registries live in a dedicated namespace.
	gwNamespace := app.config.OpenShellGatewayNamespace

	result, err := app.repositories.Gateway.ListGateways(ctx, gwNamespace)
	if err != nil {
		logger.Error("Failed to list gateways", slog.Any("error", err))
		app.serverErrorResponse(w, r, err)
		return
	}

	envelope := GatewayListEnvelope{Data: result}
	if err := app.WriteJSON(w, http.StatusOK, envelope, nil); err != nil {
		logger.Error("Failed to write JSON response", slog.Any("error", err))
	}
}

func (app *App) GetGatewayHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	ctx := r.Context()
	logger := helper.GetContextLoggerFromReq(r)

	gwName := ps.ByName("gwName")
	if gwName == "" {
		app.badRequestResponse(w, r, nil)
		return
	}

	result, err := app.repositories.Gateway.GetGateway(ctx, gwName)
	if err != nil {
		logger.Error("Failed to get gateway", slog.String("name", gwName), slog.Any("error", err))
		app.notFoundResponse(w, r)
		return
	}

	envelope := GatewayEnvelope{Data: result}
	if err := app.WriteJSON(w, http.StatusOK, envelope, nil); err != nil {
		logger.Error("Failed to write JSON response", slog.Any("error", err))
	}
}

func (app *App) CreateGatewayHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	logger := helper.GetContextLoggerFromReq(r)

	var req models.CreateGatewayRequest
	if err := app.ReadJSON(w, r, &req); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	if req.Name == "" {
		app.badRequestResponse(w, r, fmt.Errorf("name is required"))
		return
	}
	if !req.Deploy && req.Endpoint == "" {
		app.badRequestResponse(w, r, fmt.Errorf("endpoint is required when not deploying"))
		return
	}

	var result *models.Gateway
	var err error
	if req.Deploy {
		result, err = app.repositories.Gateway.DeployGateway(r.Context(), &req)
	} else {
		result, err = app.repositories.Gateway.CreateGateway(r.Context(), &req)
	}
	if err != nil {
		logger.Error("Failed to create gateway", slog.Any("error", err))
		app.serverErrorResponse(w, r, err)
		return
	}

	envelope := GatewayEnvelope{Data: result}
	if err := app.WriteJSON(w, http.StatusCreated, envelope, nil); err != nil {
		logger.Error("Failed to write JSON response", slog.Any("error", err))
	}
}

func (app *App) DeleteGatewayHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	logger := helper.GetContextLoggerFromReq(r)

	gwName := ps.ByName("gwName")
	if gwName == "" {
		app.badRequestResponse(w, r, nil)
		return
	}

	if err := app.repositories.Gateway.DeleteGateway(r.Context(), gwName); err != nil {
		logger.Error("Failed to delete gateway", slog.String("name", gwName), slog.Any("error", err))
		app.notFoundResponse(w, r)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
