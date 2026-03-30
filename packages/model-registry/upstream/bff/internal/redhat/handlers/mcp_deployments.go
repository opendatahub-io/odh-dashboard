package handlers

import (
	"errors"
	"fmt"
	"net/http"
	"regexp"
	"strconv"
	"strings"

	"github.com/julienschmidt/httprouter"

	"github.com/kubeflow/model-registry/ui/bff/internal/api"
	"github.com/kubeflow/model-registry/ui/bff/internal/models"
	redhatrepos "github.com/kubeflow/model-registry/ui/bff/internal/redhat/repositories"
)

type McpDeploymentListEnvelope api.Envelope[models.McpDeploymentList, api.None]
type McpDeploymentEnvelope api.Envelope[models.McpDeployment, api.None]
type McpDeploymentCreateEnvelope api.Envelope[models.McpDeploymentCreateRequest, api.None]
type McpDeploymentUpdateEnvelope api.Envelope[models.McpDeploymentUpdateRequest, api.None]

var k8sNameRegexp = regexp.MustCompile(`^[a-z0-9]([a-z0-9\-]*[a-z0-9])?$`)

const (
	mcpDeploymentListHandlerID   = api.HandlerID("mcpDeployment:list")
	mcpDeploymentGetHandlerID    = api.HandlerID("mcpDeployment:get")
	mcpDeploymentCreateHandlerID = api.HandlerID("mcpDeployment:create")
	mcpDeploymentUpdateHandlerID = api.HandlerID("mcpDeployment:update")
	mcpDeploymentDeleteHandlerID = api.HandlerID("mcpDeployment:delete")
)

type mcpDeploymentRepository interface {
	List(namespace string, pageSize int32, nextPageToken string) (models.McpDeploymentList, error)
	Get(namespace string, name string) (models.McpDeployment, error)
	Create(namespace string, req models.McpDeploymentCreateRequest) (models.McpDeployment, error)
	Update(namespace string, name string, req models.McpDeploymentUpdateRequest) (models.McpDeployment, error)
	Delete(namespace string, name string) error
}

var newMcpDeploymentRepository = func() mcpDeploymentRepository {
	return redhatrepos.NewMcpDeploymentRepository()
}

// sharedMcpDeploymentRepo holds the lazily-initialized singleton so all CRUD
// handlers operate on the same in-memory data store.
var sharedMcpDeploymentRepo mcpDeploymentRepository

func getSharedMcpDeploymentRepo() mcpDeploymentRepository {
	if sharedMcpDeploymentRepo == nil {
		sharedMcpDeploymentRepo = newMcpDeploymentRepository()
	}
	return sharedMcpDeploymentRepo
}

func init() {
	api.RegisterHandlerOverride(mcpDeploymentListHandlerID, overrideMcpDeploymentList)
	api.RegisterHandlerOverride(mcpDeploymentGetHandlerID, overrideMcpDeploymentGet)
	api.RegisterHandlerOverride(mcpDeploymentCreateHandlerID, overrideMcpDeploymentCreate)
	api.RegisterHandlerOverride(mcpDeploymentUpdateHandlerID, overrideMcpDeploymentUpdate)
	api.RegisterHandlerOverride(mcpDeploymentDeleteHandlerID, overrideMcpDeploymentDelete)
}

func overrideMcpDeploymentList(app *api.App, _ func() httprouter.Handle) httprouter.Handle {
	repo := getSharedMcpDeploymentRepo()

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

func overrideMcpDeploymentGet(app *api.App, _ func() httprouter.Handle) httprouter.Handle {
	repo := getSharedMcpDeploymentRepo()

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

		result, err := repo.Get(namespace, name)
		if err != nil {
			if errors.Is(err, redhatrepos.ErrMcpDeploymentNotFound) {
				app.NotFound(w, r)
				return
			}
			app.ServerError(w, r, err)
			return
		}

		resp := McpDeploymentEnvelope{Data: result}
		if err := app.WriteJSON(w, http.StatusOK, resp, nil); err != nil {
			app.ServerError(w, r, err)
		}
	})
}

func validateMcpDeploymentName(name string) error {
	if len(name) > 253 {
		return fmt.Errorf("name must be no more than 253 characters")
	}
	if !k8sNameRegexp.MatchString(name) {
		return fmt.Errorf("name must consist of lowercase alphanumeric characters or '-', and must start and end with an alphanumeric character")
	}
	return nil
}

func overrideMcpDeploymentCreate(app *api.App, _ func() httprouter.Handle) httprouter.Handle {
	repo := getSharedMcpDeploymentRepo()

	return app.AttachNamespace(func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
		namespace, ok := namespaceFromContext(app, w, r)
		if !ok {
			return
		}

		var envelope McpDeploymentCreateEnvelope
		if err := app.ReadJSON(w, r, &envelope); err != nil {
			app.BadRequest(w, r, err)
			return
		}

		req := envelope.Data

		if strings.TrimSpace(req.Image) == "" {
			app.BadRequest(w, r, fmt.Errorf("image is required"))
			return
		}

		if req.Name != "" {
			if err := validateMcpDeploymentName(req.Name); err != nil {
				app.BadRequest(w, r, fmt.Errorf("invalid name: %w", err))
				return
			}
		}

		if req.Port != 0 && (req.Port < 1 || req.Port > 65535) {
			app.BadRequest(w, r, fmt.Errorf("port must be between 1 and 65535"))
			return
		}

		result, err := repo.Create(namespace, req)
		if err != nil {
			if errors.Is(err, redhatrepos.ErrMcpDeploymentConflict) {
				app.Conflict(w, r, err.Error())
				return
			}
			app.ServerError(w, r, err)
			return
		}

		resp := McpDeploymentEnvelope{Data: result}
		if err := app.WriteJSON(w, http.StatusCreated, resp, nil); err != nil {
			app.ServerError(w, r, err)
		}
	})
}

func overrideMcpDeploymentUpdate(app *api.App, _ func() httprouter.Handle) httprouter.Handle {
	repo := getSharedMcpDeploymentRepo()

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

		var envelope McpDeploymentUpdateEnvelope
		if err := app.ReadJSON(w, r, &envelope); err != nil {
			app.BadRequest(w, r, err)
			return
		}

		req := envelope.Data

		if req.Image != nil && strings.TrimSpace(*req.Image) == "" {
			app.BadRequest(w, r, fmt.Errorf("image must not be empty"))
			return
		}

		if req.Port != nil && (*req.Port < 1 || *req.Port > 65535) {
			app.BadRequest(w, r, fmt.Errorf("port must be between 1 and 65535"))
			return
		}

		result, err := repo.Update(namespace, name, req)
		if err != nil {
			if errors.Is(err, redhatrepos.ErrMcpDeploymentNotFound) {
				app.NotFound(w, r)
				return
			}
			app.ServerError(w, r, err)
			return
		}

		resp := McpDeploymentEnvelope{Data: result}
		if err := app.WriteJSON(w, http.StatusOK, resp, nil); err != nil {
			app.ServerError(w, r, err)
		}
	})
}

func overrideMcpDeploymentDelete(app *api.App, _ func() httprouter.Handle) httprouter.Handle {
	repo := getSharedMcpDeploymentRepo()

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
