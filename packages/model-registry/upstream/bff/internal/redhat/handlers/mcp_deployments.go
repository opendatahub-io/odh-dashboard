package handlers

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"strings"

	"github.com/julienschmidt/httprouter"
	apierrors "k8s.io/apimachinery/pkg/api/errors"

	"github.com/kubeflow/hub/ui/bff/internal/api"
	k8s "github.com/kubeflow/hub/ui/bff/internal/integrations/kubernetes"
	"github.com/kubeflow/hub/ui/bff/internal/models"
	redhatrepos "github.com/kubeflow/hub/ui/bff/internal/redhat/repositories"
)

type McpDeploymentListEnvelope api.Envelope[models.McpDeploymentList, api.None]
type McpDeploymentEnvelope api.Envelope[models.McpDeployment, api.None]
type McpDeploymentCreateEnvelope api.Envelope[models.McpDeploymentCreateRequest, api.None]
type McpDeploymentUpdateEnvelope api.Envelope[models.McpDeploymentUpdateRequest, api.None]

const (
	mcpDeploymentListHandlerID   = api.HandlerID("mcpDeployment:list")
	mcpDeploymentGetHandlerID    = api.HandlerID("mcpDeployment:get")
	mcpDeploymentCreateHandlerID = api.HandlerID("mcpDeployment:create")
	mcpDeploymentUpdateHandlerID = api.HandlerID("mcpDeployment:update")
	mcpDeploymentDeleteHandlerID = api.HandlerID("mcpDeployment:delete")
)

type mcpDeploymentRepository interface {
	List(ctx context.Context, client k8s.KubernetesClientInterface, namespace string) (models.McpDeploymentList, error)
	Get(ctx context.Context, client k8s.KubernetesClientInterface, namespace string, name string) (models.McpDeployment, error)
	Create(ctx context.Context, client k8s.KubernetesClientInterface, namespace string, req models.McpDeploymentCreateRequest) (models.McpDeployment, error)
	Update(ctx context.Context, client k8s.KubernetesClientInterface, namespace string, name string, req models.McpDeploymentUpdateRequest) (models.McpDeployment, error)
	Delete(ctx context.Context, client k8s.KubernetesClientInterface, namespace string, name string) error
}

var newMcpDeploymentRepository = func(app *api.App) mcpDeploymentRepository {
	if app == nil {
		return redhatrepos.NewMcpDeploymentRepository(nil)
	}
	return redhatrepos.NewMcpDeploymentRepository(app.Logger())
}

func init() {
	api.RegisterHandlerOverride(mcpDeploymentListHandlerID, overrideMcpDeploymentList)
	api.RegisterHandlerOverride(mcpDeploymentGetHandlerID, overrideMcpDeploymentGet)
	api.RegisterHandlerOverride(mcpDeploymentCreateHandlerID, overrideMcpDeploymentCreate)
	api.RegisterHandlerOverride(mcpDeploymentUpdateHandlerID, overrideMcpDeploymentUpdate)
	api.RegisterHandlerOverride(mcpDeploymentDeleteHandlerID, overrideMcpDeploymentDelete)
}

func overrideMcpDeploymentList(app *api.App, buildDefault func() httprouter.Handle) httprouter.Handle {
	if !shouldUseRedHatOverrides(app) {
		return buildDefault()
	}

	repo := newMcpDeploymentRepository(app)

	return app.AttachNamespace(func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
		namespace, ok := namespaceFromContext(app, w, r)
		if !ok {
			return
		}

		if !requireMcpDeploymentAccess(app, w, r, namespace, "list") {
			return
		}

		client, ok := getKubernetesClient(app, w, r)
		if !ok {
			return
		}

		result, err := repo.List(r.Context(), client, namespace)
		if err != nil {
			handleMcpDeploymentError(app, w, r, err)
			return
		}

		resp := McpDeploymentListEnvelope{Data: result}
		if err := app.WriteJSON(w, http.StatusOK, resp, nil); err != nil {
			app.ServerError(w, r, err)
		}
	})
}

func overrideMcpDeploymentGet(app *api.App, buildDefault func() httprouter.Handle) httprouter.Handle {
	if !shouldUseRedHatOverrides(app) {
		return buildDefault()
	}

	repo := newMcpDeploymentRepository(app)

	return app.AttachNamespace(func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		namespace, ok := namespaceFromContext(app, w, r)
		if !ok {
			return
		}

		if !requireMcpDeploymentAccess(app, w, r, namespace, "get") {
			return
		}

		name := strings.TrimSpace(ps.ByName(api.McpDeploymentName))
		if name == "" {
			app.BadRequest(w, r, fmt.Errorf("missing MCP deployment name"))
			return
		}

		client, ok := getKubernetesClient(app, w, r)
		if !ok {
			return
		}

		result, err := repo.Get(r.Context(), client, namespace, name)
		if err != nil {
			handleMcpDeploymentError(app, w, r, err)
			return
		}

		resp := McpDeploymentEnvelope{Data: result}
		if err := app.WriteJSON(w, http.StatusOK, resp, nil); err != nil {
			app.ServerError(w, r, err)
		}
	})
}

func handleMcpDeploymentError(app *api.App, w http.ResponseWriter, r *http.Request, err error) {
	switch {
	case errors.Is(err, redhatrepos.ErrMcpDeploymentValidation):
		app.BadRequest(w, r, err)
	case errors.Is(err, redhatrepos.ErrMcpDeploymentNotFound):
		app.NotFound(w, r)
	case errors.Is(err, redhatrepos.ErrMcpDeploymentConflict):
		app.Conflict(w, r, err.Error())
	case apierrors.IsForbidden(err) || apierrors.IsUnauthorized(err):
		app.Forbidden(w, r, err.Error())
	default:
		app.ServerError(w, r, err)
	}
}

func overrideMcpDeploymentCreate(app *api.App, buildDefault func() httprouter.Handle) httprouter.Handle {
	if !shouldUseRedHatOverrides(app) {
		return buildDefault()
	}

	repo := newMcpDeploymentRepository(app)

	return app.AttachNamespace(func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
		namespace, ok := namespaceFromContext(app, w, r)
		if !ok {
			return
		}

		if !requireMcpDeploymentAccess(app, w, r, namespace, "create") {
			return
		}

		client, ok := getKubernetesClient(app, w, r)
		if !ok {
			return
		}

		var envelope McpDeploymentCreateEnvelope
		if err := app.ReadJSON(w, r, &envelope); err != nil {
			app.BadRequest(w, r, err)
			return
		}

		result, err := repo.Create(r.Context(), client, namespace, envelope.Data)
		if err != nil {
			handleMcpDeploymentError(app, w, r, err)
			return
		}

		resp := McpDeploymentEnvelope{Data: result}
		if err := app.WriteJSON(w, http.StatusCreated, resp, nil); err != nil {
			app.ServerError(w, r, err)
		}
	})
}

func overrideMcpDeploymentUpdate(app *api.App, buildDefault func() httprouter.Handle) httprouter.Handle {
	if !shouldUseRedHatOverrides(app) {
		return buildDefault()
	}

	repo := newMcpDeploymentRepository(app)

	return app.AttachNamespace(func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		namespace, ok := namespaceFromContext(app, w, r)
		if !ok {
			return
		}

		if !requireMcpDeploymentAccess(app, w, r, namespace, "update") {
			return
		}

		name := strings.TrimSpace(ps.ByName(api.McpDeploymentName))
		if name == "" {
			app.BadRequest(w, r, fmt.Errorf("missing MCP deployment name"))
			return
		}

		client, ok := getKubernetesClient(app, w, r)
		if !ok {
			return
		}

		var envelope McpDeploymentUpdateEnvelope
		if err := app.ReadJSON(w, r, &envelope); err != nil {
			app.BadRequest(w, r, err)
			return
		}

		result, err := repo.Update(r.Context(), client, namespace, name, envelope.Data)
		if err != nil {
			handleMcpDeploymentError(app, w, r, err)
			return
		}

		resp := McpDeploymentEnvelope{Data: result}
		if err := app.WriteJSON(w, http.StatusOK, resp, nil); err != nil {
			app.ServerError(w, r, err)
		}
	})
}

func overrideMcpDeploymentDelete(app *api.App, buildDefault func() httprouter.Handle) httprouter.Handle {
	if !shouldUseRedHatOverrides(app) {
		return buildDefault()
	}

	repo := newMcpDeploymentRepository(app)

	return app.AttachNamespace(func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		namespace, ok := namespaceFromContext(app, w, r)
		if !ok {
			return
		}

		if !requireMcpDeploymentAccess(app, w, r, namespace, "delete") {
			return
		}

		name := strings.TrimSpace(ps.ByName(api.McpDeploymentName))
		if name == "" {
			app.BadRequest(w, r, fmt.Errorf("missing MCP deployment name"))
			return
		}

		client, ok := getKubernetesClient(app, w, r)
		if !ok {
			return
		}

		if err := repo.Delete(r.Context(), client, namespace, name); err != nil {
			handleMcpDeploymentError(app, w, r, err)
			return
		}

		w.WriteHeader(http.StatusNoContent)
	})
}
