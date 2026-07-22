package api

import (
	"log/slog"
	"net/http"

	"github.com/julienschmidt/httprouter"
	helper "github.com/opendatahub-io/mod-arch-library/bff/internal/helpers"
	"github.com/opendatahub-io/mod-arch-library/bff/internal/models"
)

type ProviderListEnvelope Envelope[*models.ProviderListResponse, None]
type ProviderEnvelope Envelope[*models.Provider, None]
type ProviderDetailEnvelope Envelope[*models.ProviderDetail, None]
type ProviderProfileListEnvelope Envelope[*models.ProviderProfileListResponse, None]

func (app *App) ListProvidersHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	ctx := r.Context()
	logger := helper.GetContextLoggerFromReq(r)

	gwName := ps.ByName("gwName")
	if gwName == "" {
		app.badRequestResponse(w, r, nil)
		return
	}

	result, err := app.repositories.Provider.ListProviders(ctx, gwName)
	if err != nil {
		logger.Error("Failed to list providers", slog.String("gateway", gwName), slog.Any("error", err))
		app.serverErrorResponse(w, r, err)
		return
	}

	envelope := ProviderListEnvelope{Data: result}
	if err := app.WriteJSON(w, http.StatusOK, envelope, nil); err != nil {
		logger.Error("Failed to write JSON response", slog.Any("error", err))
	}
}

func (app *App) GetProviderHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	ctx := r.Context()
	logger := helper.GetContextLoggerFromReq(r)

	gwName := ps.ByName("gwName")
	provName := ps.ByName("provName")
	if gwName == "" || provName == "" {
		app.badRequestResponse(w, r, nil)
		return
	}

	result, err := app.repositories.Provider.GetProvider(ctx, gwName, provName)
	if err != nil {
		logger.Error("Failed to get provider", slog.String("gateway", gwName), slog.String("provider", provName), slog.Any("error", err))
		app.notFoundResponse(w, r)
		return
	}

	envelope := ProviderDetailEnvelope{Data: result}
	if err := app.WriteJSON(w, http.StatusOK, envelope, nil); err != nil {
		logger.Error("Failed to write JSON response", slog.Any("error", err))
	}
}

func (app *App) CreateProviderHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	logger := helper.GetContextLoggerFromReq(r)

	gwName := ps.ByName("gwName")
	if gwName == "" {
		app.badRequestResponse(w, r, nil)
		return
	}

	var req models.CreateProviderRequest
	if err := app.ReadJSON(w, r, &req); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	if req.Name == "" || req.ProfileName == "" {
		app.badRequestResponse(w, r, nil)
		return
	}

	result, err := app.repositories.Provider.CreateProvider(r.Context(), gwName, &req)
	if err != nil {
		logger.Error("Failed to create provider", slog.String("gateway", gwName), slog.Any("error", err))
		app.serverErrorResponse(w, r, err)
		return
	}

	envelope := ProviderEnvelope{Data: result}
	if err := app.WriteJSON(w, http.StatusCreated, envelope, nil); err != nil {
		logger.Error("Failed to write JSON response", slog.Any("error", err))
	}
}

func (app *App) UpdateProviderHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	logger := helper.GetContextLoggerFromReq(r)

	gwName := ps.ByName("gwName")
	provName := ps.ByName("provName")
	if gwName == "" || provName == "" {
		app.badRequestResponse(w, r, nil)
		return
	}

	var req models.UpdateProviderRequest
	if err := app.ReadJSON(w, r, &req); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	result, err := app.repositories.Provider.UpdateProvider(r.Context(), gwName, provName, &req)
	if err != nil {
		logger.Error("Failed to update provider", slog.String("gateway", gwName), slog.String("provider", provName), slog.Any("error", err))
		app.serverErrorResponse(w, r, err)
		return
	}

	envelope := ProviderEnvelope{Data: result}
	if err := app.WriteJSON(w, http.StatusOK, envelope, nil); err != nil {
		logger.Error("Failed to write JSON response", slog.Any("error", err))
	}
}

func (app *App) DeleteProviderHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	logger := helper.GetContextLoggerFromReq(r)

	gwName := ps.ByName("gwName")
	provName := ps.ByName("provName")
	if gwName == "" || provName == "" {
		app.badRequestResponse(w, r, nil)
		return
	}

	if err := app.repositories.Provider.DeleteProvider(r.Context(), gwName, provName); err != nil {
		logger.Error("Failed to delete provider", slog.String("gateway", gwName), slog.String("provider", provName), slog.Any("error", err))
		app.notFoundResponse(w, r)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (app *App) ListProviderProfilesHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	ctx := r.Context()
	logger := helper.GetContextLoggerFromReq(r)

	gwName := ps.ByName("gwName")
	if gwName == "" {
		app.badRequestResponse(w, r, nil)
		return
	}

	result, err := app.repositories.Provider.ListProfiles(ctx, gwName)
	if err != nil {
		logger.Error("Failed to list provider profiles", slog.String("gateway", gwName), slog.Any("error", err))
		app.serverErrorResponse(w, r, err)
		return
	}

	envelope := ProviderProfileListEnvelope{Data: result}
	if err := app.WriteJSON(w, http.StatusOK, envelope, nil); err != nil {
		logger.Error("Failed to write JSON response", slog.Any("error", err))
	}
}
