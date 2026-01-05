package api

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

	"github.com/julienschmidt/httprouter"

	"github.com/opendatahub-io/maas-library/bff/internal/constants"
	"github.com/opendatahub-io/maas-library/bff/internal/models"
	"github.com/opendatahub-io/maas-library/bff/internal/repositories"
)

type AppHandler func(app *App, w http.ResponseWriter, r *http.Request, params httprouter.Params)

func handlerWithApp(app *App, handle AppHandler) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, p httprouter.Params) {
		handle(app, w, r, p)
	}
}

func attachTierHandlers(apiRouter *httprouter.Router, app *App) {
	apiRouter.GET(constants.TiersListPath, handlerWithApp(app, GetTiersListHandler))
	apiRouter.GET(constants.TierNamePath, handlerWithApp(app, GetTierHandler))
	apiRouter.POST(constants.TierCreatePath, handlerWithApp(app, CreateTierHandler))
	apiRouter.PUT(constants.TierNamePath, handlerWithApp(app, UpdateTierHandler))
	apiRouter.DELETE(constants.TierNamePath, handlerWithApp(app, DeleteTierHandler))
}

func GetTiersListHandler(app *App, w http.ResponseWriter, r *http.Request, params httprouter.Params) {
	ctx := r.Context()
	tiersList, err := app.repositories.Tiers.GetTiersList(ctx)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	response := Envelope[models.TiersList, None]{
		Data: tiersList,
	}

	responseErr := app.WriteJSON(w, http.StatusOK, response, nil)
	if responseErr != nil {
		app.serverErrorResponse(w, r, responseErr)
	}
}

func GetTierHandler(app *App, w http.ResponseWriter, r *http.Request, params httprouter.Params) {
	ctx := r.Context()
	tierName := params.ByName("name")
	if len(tierName) == 0 {
		app.badRequestResponse(w, r, errors.New("tier name is required"))
		return
	}

	tier, err := app.repositories.Tiers.GetTierByName(ctx, tierName)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	if tier == nil {
		app.notFoundResponse(w, r)
		return
	}

	response := Envelope[*models.Tier, None]{
		Data: tier,
	}

	responseErr := app.WriteJSON(w, http.StatusOK, response, nil)
	if responseErr != nil {
		app.serverErrorResponse(w, r, responseErr)
	}
}

func CreateTierHandler(app *App, w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

	var tier models.Tier
	if err := json.NewDecoder(r.Body).Decode(&tier); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	if err := app.repositories.Tiers.CreateTier(ctx, tier); err != nil {
		if errors.Is(err, repositories.ErrTierExists) || errors.Is(err, repositories.ErrTierLevelConflict) {
			app.errorResponse(w, r, &HTTPError{
				StatusCode: http.StatusUnprocessableEntity,
				Error: ErrorPayload{
					Code:    strconv.Itoa(http.StatusUnprocessableEntity),
					Message: err.Error(),
				},
			})
		} else if errors.Is(err, repositories.ErrUpdateConflict) {
			app.errorResponse(w, r, &HTTPError{
				StatusCode: http.StatusConflict,
				Error: ErrorPayload{
					Code:    strconv.Itoa(http.StatusConflict),
					Message: err.Error(),
				},
			})
		} else {
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	// Fetch the created tier to return the full object with any server-side defaults
	createdTier, err := app.repositories.Tiers.GetTierByName(ctx, tier.Name)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	response := Envelope[*models.Tier, None]{
		Data: createdTier,
	}

	if responseErr := app.WriteJSON(w, http.StatusCreated, response, nil); responseErr != nil {
		app.serverErrorResponse(w, r, responseErr)
	}
}

func UpdateTierHandler(app *App, w http.ResponseWriter, r *http.Request, params httprouter.Params) {
	ctx := r.Context()
	tierName := params.ByName("name")
	if len(tierName) == 0 {
		app.badRequestResponse(w, r, errors.New("tier name is required"))
		return
	}

	var tier models.Tier
	if err := json.NewDecoder(r.Body).Decode(&tier); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	// Sanity check: if the body has a name, it must match.
	if len(tier.Name) == 0 {
		tier.Name = tierName
	} else if tier.Name != tierName {
		app.badRequestResponse(w, r, errors.New("tier name on the JSON body must match with the URL parameter"))
		return
	}

	if err := app.repositories.Tiers.UpdateTier(ctx, tier); err != nil {
		if errors.Is(err, repositories.ErrTierNotFound) {
			app.notFoundResponse(w, r)
		} else if errors.Is(err, repositories.ErrUpdateConflict) {
			app.errorResponse(w, r, &HTTPError{
				StatusCode: http.StatusConflict,
				Error: ErrorPayload{
					Code:    strconv.Itoa(http.StatusConflict),
					Message: err.Error(),
				},
			})
		} else {
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	// Fetch the updated tier to return the full object
	updatedTier, err := app.repositories.Tiers.GetTierByName(ctx, tierName)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	response := Envelope[*models.Tier, None]{
		Data: updatedTier,
	}

	if responseErr := app.WriteJSON(w, http.StatusOK, response, nil); responseErr != nil {
		app.serverErrorResponse(w, r, responseErr)
	}
}

func DeleteTierHandler(app *App, w http.ResponseWriter, r *http.Request, params httprouter.Params) {
	ctx := r.Context()
	tierName := params.ByName("name")
	if len(tierName) == 0 {
		app.badRequestResponse(w, r, errors.New("tier name is required"))
		return
	}

	if err := app.repositories.Tiers.DeleteTierByName(ctx, tierName); err != nil {
		if errors.Is(err, repositories.ErrTierNotFound) {
			app.notFoundResponse(w, r)
		} else if errors.Is(err, repositories.ErrUpdateConflict) {
			app.errorResponse(w, r, &HTTPError{
				StatusCode: http.StatusConflict,
				Error: ErrorPayload{
					Code:    strconv.Itoa(http.StatusConflict),
					Message: err.Error(),
				},
			})
		} else {
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	response := Envelope[None, None]{
		Data: nil,
	}

	if responseErr := app.WriteJSON(w, http.StatusOK, response, nil); responseErr != nil {
		app.serverErrorResponse(w, r, responseErr)
	}
}
