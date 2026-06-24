package api

import (
	"errors"
	"net/http"

	"github.com/julienschmidt/httprouter"
	k8sErrors "k8s.io/apimachinery/pkg/api/errors"

	"github.com/opendatahub-io/maas-library/bff/internal/constants"
	"github.com/opendatahub-io/maas-library/bff/internal/models"
	"github.com/opendatahub-io/maas-library/bff/internal/repositories"
)

// attachYamlHandlers registers the YAML routes.
func attachYamlHandlers(apiRouter *httprouter.Router, app *App) {
	apiRouter.GET(constants.YamlPath, handlerWithApp(app, GetYamlHandler))
}

// GetYamlHandler handles GET /api/v1/maas-governance/yaml
// K8s calls: GET /k8s/v1/maassubscription/:name or GET /k8s/v1/maasauthpolicy/:name
func GetYamlHandler(app *App, w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()
	name := r.URL.Query().Get("name")
	resourceType := r.URL.Query().Get("type")

	if name == "" {
		app.badRequestResponse(w, r, errors.New("name is required"))
		return
	}
	if resourceType == "" {
		app.badRequestResponse(w, r, errors.New("type is required"))
		return
	}

	content, err := app.repositories.Yaml.GetYaml(ctx, name, resourceType)
	if err != nil {
		if errors.Is(err, repositories.ErrInvalidResourceType) {
			app.badRequestResponse(w, r, err)
			return
		}
		if errors.Is(err, repositories.ErrNotFound) || k8sErrors.IsNotFound(err) {
			app.notFoundResponse(w, r)
			return
		}
		app.serverErrorResponse(w, r, err)
		return
	}

	response := models.YamlResponse{Content: content}
	if err := app.WriteJSON(w, http.StatusOK, response, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
