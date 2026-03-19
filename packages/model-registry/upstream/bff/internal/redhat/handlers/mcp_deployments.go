package handlers

import (
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"github.com/julienschmidt/httprouter"

	"github.com/kubeflow/model-registry/ui/bff/internal/api"
	"github.com/kubeflow/model-registry/ui/bff/internal/models"
	redhatrepos "github.com/kubeflow/model-registry/ui/bff/internal/redhat/repositories"
)

type McpDeploymentListEnvelope api.Envelope[models.McpDeploymentList, api.None]

const (
	mcpDeploymentListHandlerID   = api.HandlerID("mcpDeployment:list")
	mcpDeploymentDeleteHandlerID = api.HandlerID("mcpDeployment:delete")
)

type mcpDeploymentRepository interface {
	List(namespace string, pageSize int32, nextPageToken string) (models.McpDeploymentList, error)
	Delete(namespace string, name string) error
}

var newMcpDeploymentRepository = func() mcpDeploymentRepository {
	return redhatrepos.NewMcpDeploymentRepository()
}

func init() {
	api.RegisterHandlerOverride(mcpDeploymentListHandlerID, overrideMcpDeploymentList)
	api.RegisterHandlerOverride(mcpDeploymentDeleteHandlerID, overrideMcpDeploymentDelete)
}

func overrideMcpDeploymentList(app *api.App, _ func() httprouter.Handle) httprouter.Handle {
	repo := newMcpDeploymentRepository()

	return app.AttachNamespace(func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
		namespace, ok := namespaceFromContext(app, w, r)
		if !ok {
			return
		}

		var pageSize int32
		if ps := r.URL.Query().Get("pageSize"); ps != "" {
			parsed, err := strconv.ParseInt(ps, 10, 32)
			if err != nil {
				app.BadRequest(w, r, fmt.Errorf("invalid pageSize: %w", err))
				return
			}
			if parsed <= 0 {
				app.BadRequest(w, r, fmt.Errorf("pageSize must be > 0"))
				return
			}
			pageSize = int32(parsed)
		}
		nextPageToken := r.URL.Query().Get("nextPageToken")

		result, err := repo.List(namespace, pageSize, nextPageToken)
		if err != nil {
			app.ServerError(w, r, err)
			return
		}

		resp := McpDeploymentListEnvelope{Data: result}
		if err := app.WriteJSON(w, http.StatusOK, resp, nil); err != nil {
			app.ServerError(w, r, err)
		}
	})
}

func overrideMcpDeploymentDelete(app *api.App, _ func() httprouter.Handle) httprouter.Handle {
	repo := newMcpDeploymentRepository()

	return app.AttachNamespace(func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		namespace, ok := namespaceFromContext(app, w, r)
		if !ok {
			return
		}

		name := strings.TrimSpace(ps.ByName(api.McpDeploymentName))
		if name == "" {
			app.BadRequest(w, r, fmt.Errorf("missing MCP deployment name"))
			return
		}

		if err := repo.Delete(namespace, name); err != nil {
			if errors.Is(err, redhatrepos.ErrMcpDeploymentNotFound) {
				app.NotFound(w, r)
				return
			}
			app.ServerError(w, r, err)
			return
		}

		w.WriteHeader(http.StatusNoContent)
	})
}
