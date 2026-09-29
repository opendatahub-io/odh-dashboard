package api

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/gen-ai/internal/constants"
	"github.com/opendatahub-io/gen-ai/internal/integrations"
	"github.com/opendatahub-io/gen-ai/internal/models"
)

type AgentDeploymentListEnvelope = Envelope[models.AgentDeploymentListResponse, None]
type AgentDeploymentEnvelope = Envelope[models.AgentDeploymentSummary, None]

const (
	agentDeploymentConfigTimeout  = 10 * time.Second
	maxAgentDeploymentConfigBytes = 1 << 20
)

// ListAgentDeploymentsHandler handles GET /api/v1/agent-deployments.
func (app *App) ListAgentDeploymentsHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	if !app.isSandboxAvailable() {
		app.sandboxUnavailableResponse(w, r)
		return
	}

	ctx := r.Context()
	namespace, ok := ctx.Value(constants.NamespaceQueryParameterKey).(string)
	if !ok || namespace == "" {
		app.badRequestResponse(w, r, &integrations.HTTPError{
			StatusCode: http.StatusBadRequest,
			ErrorResponse: integrations.ErrorResponse{
				Code:    "missing_namespace",
				Message: "namespace parameter is required",
			},
		})
		return
	}

	k8sClient, err := app.kubernetesClientFactory.GetClient(ctx)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	response, err := k8sClient.ListAgentDeployments(ctx, namespace, r.URL.Query().Get("agentProfileId"))
	if err != nil {
		if httpErr, ok := err.(*integrations.HTTPError); ok {
			switch httpErr.StatusCode {
			case http.StatusForbidden:
				app.forbiddenResponse(w, r, httpErr.Message)
			case http.StatusServiceUnavailable:
				app.errorResponse(w, r, httpErr)
			default:
				app.serverErrorResponse(w, r, httpErr)
			}
			return
		}
		app.serverErrorResponse(w, r, err)
		return
	}

	if err := app.WriteJSON(w, http.StatusOK, AgentDeploymentListEnvelope{Data: *response}, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// GetAgentDeploymentHandler handles GET /api/v1/agent-deployments/:id.
func (app *App) GetAgentDeploymentHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	if !app.isSandboxAvailable() {
		app.sandboxUnavailableResponse(w, r)
		return
	}

	ctx := r.Context()
	namespace, ok := ctx.Value(constants.NamespaceQueryParameterKey).(string)
	if !ok || namespace == "" {
		app.badRequestResponse(w, r, &integrations.HTTPError{
			StatusCode: http.StatusBadRequest,
			ErrorResponse: integrations.ErrorResponse{
				Code:    "missing_namespace",
				Message: "namespace parameter is required",
			},
		})
		return
	}

	name := ps.ByName("id")
	if name == "" {
		app.badRequestResponse(w, r, &integrations.HTTPError{
			StatusCode: http.StatusBadRequest,
			ErrorResponse: integrations.ErrorResponse{
				Code:    "missing_id",
				Message: "deployment ID is required",
			},
		})
		return
	}

	k8sClient, err := app.kubernetesClientFactory.GetClient(ctx)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	deployment, err := k8sClient.GetAgentDeployment(ctx, namespace, name)
	if err != nil {
		if httpErr, ok := err.(*integrations.HTTPError); ok {
			switch httpErr.StatusCode {
			case http.StatusForbidden:
				app.forbiddenResponse(w, r, httpErr.Message)
			case http.StatusNotFound, http.StatusServiceUnavailable:
				app.errorResponse(w, r, httpErr)
			default:
				app.serverErrorResponse(w, r, httpErr)
			}
			return
		}
		app.serverErrorResponse(w, r, err)
		return
	}
	if deployment.RouteURL != "" {
		config, configErr := app.getAgentDeploymentConfig(ctx, deployment.RouteURL)
		if configErr != nil {
			app.logger.Warn("failed to get agent deployment config", "name", name, "namespace", namespace, "error", configErr)
		} else {
			deployment.Config = config
		}
	}

	if err := app.WriteJSON(w, http.StatusOK, AgentDeploymentEnvelope{Data: *deployment}, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// DeleteAgentDeploymentHandler handles DELETE /api/v1/agent-deployments/:id.
// The Sandbox is the controller owner for all deployment resources, so foreground
// deletion garbage-collects the ConfigMaps, credential Secrets, external Service,
// and Route without manipulating the Sandbox operating mode or Pod directly.
func (app *App) DeleteAgentDeploymentHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	if !app.isSandboxAvailable() {
		app.sandboxUnavailableResponse(w, r)
		return
	}

	ctx := r.Context()
	namespace, ok := ctx.Value(constants.NamespaceQueryParameterKey).(string)
	if !ok || namespace == "" {
		app.badRequestResponse(w, r, &integrations.HTTPError{
			StatusCode: http.StatusBadRequest,
			ErrorResponse: integrations.ErrorResponse{
				Code:    "missing_namespace",
				Message: "namespace parameter is required",
			},
		})
		return
	}

	name := ps.ByName("id")
	if name == "" {
		app.badRequestResponse(w, r, &integrations.HTTPError{
			StatusCode: http.StatusBadRequest,
			ErrorResponse: integrations.ErrorResponse{
				Code:    "missing_id",
				Message: "deployment ID is required",
			},
		})
		return
	}

	k8sClient, err := app.kubernetesClientFactory.GetClient(ctx)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}
	if err := k8sClient.DeleteAgentDeployment(ctx, namespace, name); err != nil {
		if httpErr, ok := err.(*integrations.HTTPError); ok {
			switch httpErr.StatusCode {
			case http.StatusForbidden:
				app.forbiddenResponse(w, r, httpErr.Message)
			case http.StatusNotFound, http.StatusServiceUnavailable:
				app.errorResponse(w, r, httpErr)
			default:
				app.serverErrorResponse(w, r, httpErr)
			}
			return
		}
		app.serverErrorResponse(w, r, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (app *App) getAgentDeploymentConfig(
	ctx context.Context,
	routeURL string,
) (*models.AgentProfile, error) {
	identity, ok := ctx.Value(constants.RequestIdentityKey).(*integrations.RequestIdentity)
	if !ok || identity == nil || identity.Token == "" {
		return nil, fmt.Errorf("request identity is unavailable")
	}

	configCtx, cancel := context.WithTimeout(ctx, agentDeploymentConfigTimeout)
	defer cancel()
	requestURL := strings.TrimRight(routeURL, "/") + "/internal/agent_config"
	req, err := http.NewRequestWithContext(configCtx, http.MethodGet, requestURL, nil)
	if err != nil {
		return nil, fmt.Errorf("create agent config request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+identity.Token)

	httpClient := app.httpClient
	if httpClient == nil {
		httpClient = http.DefaultClient
	}
	resp, err := httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request agent config: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		_, _ = io.Copy(io.Discard, io.LimitReader(resp.Body, maxAgentDeploymentConfigBytes))
		return nil, fmt.Errorf("agent config endpoint returned HTTP %d", resp.StatusCode)
	}

	body, err := io.ReadAll(io.LimitReader(resp.Body, maxAgentDeploymentConfigBytes+1))
	if err != nil {
		return nil, fmt.Errorf("read agent config response: %w", err)
	}
	if len(body) > maxAgentDeploymentConfigBytes {
		return nil, fmt.Errorf("agent config response exceeds %d bytes", maxAgentDeploymentConfigBytes)
	}

	var config models.AgentProfile
	if err := json.Unmarshal(body, &config); err != nil {
		return nil, fmt.Errorf("decode agent config response: %w", err)
	}
	return &config, nil
}
