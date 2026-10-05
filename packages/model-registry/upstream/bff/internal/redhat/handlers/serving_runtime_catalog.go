package handlers

import (
	"errors"
	"fmt"
	"net/http"

	"github.com/julienschmidt/httprouter"
	"github.com/kubeflow/hub/ui/bff/internal/api"
	"github.com/kubeflow/hub/ui/bff/internal/integrations/httpclient"
	"github.com/kubeflow/hub/ui/bff/internal/models"
	redhatrepos "github.com/kubeflow/hub/ui/bff/internal/redhat/repositories"
)

type ServingRuntimeListEnvelope api.Envelope[*models.ServingRuntimeList, api.None]
type ServingRuntimeEnvelope api.Envelope[*models.ServingRuntime, api.None]
type ServingRuntimeVersionListEnvelope api.Envelope[*models.ServingRuntimeVersionList, api.None]
type ServingRuntimeFilterOptionsEnvelope api.Envelope[*models.FilterOptionsList, api.None]

const (
	// Keep these IDs in sync with the route keys in internal/api/app.go.
	servingRuntimeListHandlerID          = api.HandlerID("servingRuntimeCatalog:list")
	servingRuntimeFilterOptionsHandlerID = api.HandlerID("servingRuntimeCatalog:filterOptions")
	servingRuntimeGetHandlerID           = api.HandlerID("servingRuntimeCatalog:get")
	servingRuntimeVersionsHandlerID      = api.HandlerID("servingRuntimeCatalog:versions")
)

func init() {
	api.RegisterHandlerOverride(servingRuntimeListHandlerID, overrideServingRuntimeList)
	api.RegisterHandlerOverride(servingRuntimeFilterOptionsHandlerID, overrideServingRuntimeFilterOptions)
	api.RegisterHandlerOverride(servingRuntimeGetHandlerID, overrideServingRuntimeGet)
	api.RegisterHandlerOverride(servingRuntimeVersionsHandlerID, overrideServingRuntimeVersions)
}

func overrideServingRuntimeList(app *api.App, buildDefault func() httprouter.Handle) httprouter.Handle {
	if !app.Config().MockMRCatalogClient {
		return buildDefault()
	}
	return app.AttachNamespace(func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		client, ok := app.Repositories().ModelCatalogClient.(redhatrepos.ServingRuntimeCatalogClient)
		if !ok {
			app.ServerError(w, r, fmt.Errorf("serving runtime catalog mock client not found"))
			return
		}
		repo := redhatrepos.NewServingRuntimeCatalogRepository(client)
		data, err := repo.List(r.URL.Query())
		if err != nil {
			servingRuntimeCatalogError(app, w, r, err)
			return
		}
		if err := app.WriteJSON(w, http.StatusOK, ServingRuntimeListEnvelope{Data: data}, nil); err != nil {
			app.ServerError(w, r, err)
		}
	})
}

func overrideServingRuntimeFilterOptions(app *api.App, buildDefault func() httprouter.Handle) httprouter.Handle {
	if !app.Config().MockMRCatalogClient {
		return buildDefault()
	}
	return app.AttachNamespace(func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		client, ok := app.Repositories().ModelCatalogClient.(redhatrepos.ServingRuntimeCatalogClient)
		if !ok {
			app.ServerError(w, r, fmt.Errorf("serving runtime catalog mock client not found"))
			return
		}
		repo := redhatrepos.NewServingRuntimeCatalogRepository(client)
		data, err := repo.FilterOptions()
		if err != nil {
			servingRuntimeCatalogError(app, w, r, err)
			return
		}
		if err := app.WriteJSON(w, http.StatusOK, ServingRuntimeFilterOptionsEnvelope{Data: data}, nil); err != nil {
			app.ServerError(w, r, err)
		}
	})
}

func overrideServingRuntimeGet(app *api.App, buildDefault func() httprouter.Handle) httprouter.Handle {
	if !app.Config().MockMRCatalogClient {
		return buildDefault()
	}
	return app.AttachNamespace(func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		client, ok := app.Repositories().ModelCatalogClient.(redhatrepos.ServingRuntimeCatalogClient)
		if !ok {
			app.ServerError(w, r, fmt.Errorf("serving runtime catalog mock client not found"))
			return
		}
		repo := redhatrepos.NewServingRuntimeCatalogRepository(client)
		id := ps.ByName(api.ServingRuntimeID)
		if id == "" {
			app.BadRequest(w, r, fmt.Errorf("runtime id is required"))
			return
		}
		data, err := repo.Get(id)
		if err != nil {
			servingRuntimeCatalogError(app, w, r, err)
			return
		}
		if err := app.WriteJSON(w, http.StatusOK, ServingRuntimeEnvelope{Data: data}, nil); err != nil {
			app.ServerError(w, r, err)
		}
	})
}

func overrideServingRuntimeVersions(app *api.App, buildDefault func() httprouter.Handle) httprouter.Handle {
	if !app.Config().MockMRCatalogClient {
		return buildDefault()
	}
	return app.AttachNamespace(func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		client, ok := app.Repositories().ModelCatalogClient.(redhatrepos.ServingRuntimeCatalogClient)
		if !ok {
			app.ServerError(w, r, fmt.Errorf("serving runtime catalog mock client not found"))
			return
		}
		repo := redhatrepos.NewServingRuntimeCatalogRepository(client)
		id := ps.ByName(api.ServingRuntimeID)
		if id == "" {
			app.BadRequest(w, r, fmt.Errorf("runtime id is required"))
			return
		}
		data, err := repo.Versions(id, r.URL.Query())
		if err != nil {
			servingRuntimeCatalogError(app, w, r, err)
			return
		}
		if err := app.WriteJSON(w, http.StatusOK, ServingRuntimeVersionListEnvelope{Data: data}, nil); err != nil {
			app.ServerError(w, r, err)
		}
	})
}

func servingRuntimeCatalogError(app *api.App, w http.ResponseWriter, r *http.Request, err error) {
	var httpErr *httpclient.HTTPError
	if errors.As(err, &httpErr) {
		if writeErr := app.WriteJSON(w, httpErr.StatusCode, api.ErrorEnvelope{Error: httpErr}, nil); writeErr != nil {
			app.ServerError(w, r, writeErr)
		}
		return
	}
	app.ServerError(w, r, err)
}
