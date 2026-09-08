package api

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/gen-ai/internal/constants"
	"github.com/opendatahub-io/gen-ai/internal/integrations"
	kubernetes "github.com/opendatahub-io/gen-ai/internal/integrations/kubernetes"
	"github.com/opendatahub-io/gen-ai/internal/models"
)

type AgentDeploymentCreateEnvelope = Envelope[models.AgentDeploymentCreateResponse, None]

const sandboxRollbackTimeout = 30 * time.Second

// CreateAgentDeploymentHandler handles POST /api/v1/agent-deployments.
// It loads the agent profile, builds the llama-stack-config ConfigMap from the profile's
// model and vector store configuration, and creates it in the target namespace.
func (app *App) CreateAgentDeploymentHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

	namespace, ok := ctx.Value(constants.NamespaceQueryParameterKey).(string)
	if !ok || namespace == "" {
		app.badRequestResponse(w, r, &integrations.HTTPError{
			StatusCode: 400,
			ErrorResponse: integrations.ErrorResponse{
				Code:    "missing_namespace",
				Message: "namespace parameter is required",
			},
		})
		return
	}

	var req models.AgentDeploymentCreateRequest
	if err := app.ReadJSON(w, r, &req); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	if req.Name == "" {
		app.badRequestResponse(w, r, &integrations.HTTPError{
			StatusCode: 400,
			ErrorResponse: integrations.ErrorResponse{
				Code:    "missing_name",
				Message: "name is required",
			},
		})
		return
	}
	if req.AgentProfileID == "" {
		app.badRequestResponse(w, r, &integrations.HTTPError{
			StatusCode: 400,
			ErrorResponse: integrations.ErrorResponse{
				Code:    "missing_agent_profile_id",
				Message: "agentProfileId is required",
			},
		})
		return
	}
	if _, err := uuid.Parse(req.AgentProfileID); err != nil {
		app.badRequestResponse(w, r, &integrations.HTTPError{
			StatusCode: 400,
			ErrorResponse: integrations.ErrorResponse{
				Code:    "invalid_agent_profile_id",
				Message: "agentProfileId must be a valid UUID",
			},
		})
		return
	}

	k8sClient, err := app.kubernetesClientFactory.GetClient(ctx)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}
	resources := kubernetes.SandboxDeploymentResources{}
	rollback := func() {
		rollbackCtx, cancel := context.WithTimeout(context.Background(), sandboxRollbackTimeout)
		defer cancel()
		k8sClient.RollbackSandboxDeployment(rollbackCtx, namespace, resources)
	}

	// Load the agent profile (snapshot at deploy time).
	profile, err := k8sClient.GetAgentProfile(ctx, namespace, req.AgentProfileID)
	if err != nil {
		if httpErr, ok := err.(*integrations.HTTPError); ok {
			switch httpErr.StatusCode {
			case 403:
				app.forbiddenResponse(w, r, httpErr.Message)
			case 404:
				app.notFoundResponse(w, r)
			default:
				app.serverErrorResponse(w, r, httpErr)
			}
			return
		}
		app.serverErrorResponse(w, r, err)
		return
	}

	// Load vector stores config if the profile references any.
	var storeDoc *models.ExternalVectorStoresDocument
	if profile.Spec.VectorStores != nil && len(profile.Spec.VectorStores.Stores) > 0 {
		doc, vsErr := k8sClient.GetVectorStoresConfig(ctx, namespace)
		if vsErr == nil {
			storeDoc = doc
		}
		// Absence of the ConfigMap is non-fatal; vector stores will have IDs but no embedding details.
	}

	// Build the llama-stack config.yaml from the profile snapshot.
	lsConfig, err := kubernetes.BuildSandboxLlamaStackConfig(profile, storeDoc)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}
	configYAML, err := lsConfig.ToYAML()
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}
	agentConfigJSON, err := json.Marshal(profile)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	// Create the llama-stack-config ConfigMap.
	lsCM, err := k8sClient.CreateSandboxConfigMap(ctx, namespace, req.AgentProfileID, configYAML)
	if err != nil {
		if httpErr, ok := err.(*integrations.HTTPError); ok {
			switch httpErr.StatusCode {
			case 403:
				app.forbiddenResponse(w, r, httpErr.Message)
			case 409:
				app.conflictResponse(w, r, httpErr)
			default:
				app.serverErrorResponse(w, r, httpErr)
			}
			return
		}
		app.serverErrorResponse(w, r, err)
		return
	}
	resources.LlamaStackConfigMapName = lsCM.Name

	// Create the wrapper-app ConfigMap.
	appPy := kubernetes.GenerateWrapperAppScript()
	waCM, err := k8sClient.CreateWrapperAppConfigMap(ctx, namespace, req.AgentProfileID, appPy)
	if err != nil {
		rollback()
		if httpErr, ok := err.(*integrations.HTTPError); ok {
			switch httpErr.StatusCode {
			case 403:
				app.forbiddenResponse(w, r, httpErr.Message)
			case 409:
				app.conflictResponse(w, r, httpErr)
			default:
				app.serverErrorResponse(w, r, httpErr)
			}
			return
		}
		app.serverErrorResponse(w, r, err)
		return
	}
	resources.WrapperAppConfigMapName = waCM.Name

	// Require the OGX core image — injected by the operator via RELATED_IMAGE_OGX_CORE.
	ogxImage := app.config.OGXCoreImage
	if ogxImage == "" {
		rollback()
		app.serverErrorResponse(w, r, &integrations.HTTPError{
			StatusCode: 500,
			ErrorResponse: integrations.ErrorResponse{
				Code:    "missing_image",
				Message: "OGX core image not configured; set RELATED_IMAGE_OGX_CORE or --ogx-core-image",
			},
		})
		return
	}

	// Append a 4-hex suffix to the Sandbox name to avoid collisions across deployments.
	sandboxSuffix, err := kubernetes.RandomHex4()
	if err != nil {
		rollback()
		app.serverErrorResponse(w, r, err)
		return
	}

	// Build Sandbox CR options from the profile snapshot and BFF config.
	sandboxOpts := kubernetes.SandboxCROptions{
		Name:                    req.Name + "-" + sandboxSuffix,
		ProfileID:               req.AgentProfileID,
		LlamaStackConfigMapName: lsCM.Name,
		WrapperAppConfigMapName: waCM.Name,
		Image:                   ogxImage,
		MaaSGatewayURL:          app.config.MaaSURL,
		AgentConfigJSON:         string(agentConfigJSON),
		PgvectorHost:            app.config.PgvectorHost,
		PgvectorSecretName:      app.config.PgvectorPasswordSecretName,
	}
	if profile.Spec.Model.Authorization != nil {
		sandboxOpts.MaaSSubscription = profile.Spec.Model.Authorization.MaaSSubscription
	}
	if profile.Spec.Prompt != nil && profile.Spec.Prompt.Source == "mlflow" {
		sandboxOpts.MLflowTrackingURI = app.mlflowExternalURL
		sandboxOpts.MLflowPromptName = profile.Spec.Prompt.Name
		sandboxOpts.MLflowPromptVersion = profile.Spec.Prompt.Version
	}

	// Create the Sandbox CR.
	sandboxName, err := k8sClient.CreateSandboxCR(ctx, namespace, sandboxOpts)
	if err != nil {
		rollback()
		if httpErr, ok := err.(*integrations.HTTPError); ok {
			switch httpErr.StatusCode {
			case 403:
				app.forbiddenResponse(w, r, httpErr.Message)
			case 409:
				app.conflictResponse(w, r, httpErr)
			default:
				app.serverErrorResponse(w, r, httpErr)
			}
			return
		}
		app.serverErrorResponse(w, r, err)
		return
	}
	resources.SandboxName = sandboxName

	// The ConfigMaps are created before the Sandbox, so attach their owner references now.
	// The Service, Route, and optional RoleBinding receive the same owner at creation time.
	if err := k8sClient.SetSandboxConfigMapsOwner(ctx, namespace, sandboxName, lsCM.Name, waCM.Name); err != nil {
		rollback()
		if httpErr, ok := err.(*integrations.HTTPError); ok && httpErr.StatusCode == http.StatusForbidden {
			app.forbiddenResponse(w, r, httpErr.Message)
			return
		}
		app.serverErrorResponse(w, r, err)
		return
	}

	// Create the MLflow RoleBinding when the profile references an MLflow prompt.
	if sandboxOpts.MLflowTrackingURI != "" {
		if rbErr := k8sClient.CreateMLflowRoleBinding(ctx, namespace, sandboxName); rbErr != nil {
			rollback()
			if httpErr, ok := rbErr.(*integrations.HTTPError); ok && httpErr.StatusCode == 403 {
				app.forbiddenResponse(w, r, httpErr.Message)
				return
			}
			app.serverErrorResponse(w, r, rbErr)
			return
		}
		resources.MLflowRoleBindingName = "mlflow-" + sandboxName
	}

	// Wait for the Sandbox controller to populate status.selector (required to target the pod
	// from a ClusterIP Service — the headless Service created by the controller cannot back a Route).
	selector, err := k8sClient.WaitForSandboxSelector(ctx, namespace, sandboxName)
	if err != nil {
		rollback()
		app.serverErrorResponse(w, r, err)
		return
	}

	// Create the ClusterIP Service (<sandboxName>-ext) with the sandbox pod selector.
	if err := k8sClient.CreateSandboxService(ctx, namespace, sandboxName, selector); err != nil {
		rollback()
		if httpErr, ok := err.(*integrations.HTTPError); ok && httpErr.StatusCode == 403 {
			app.forbiddenResponse(w, r, httpErr.Message)
			return
		}
		app.serverErrorResponse(w, r, err)
		return
	}
	resources.ServiceName = sandboxName + "-ext"

	// Create the OpenShift Route with TLS edge termination and an explicit host.
	routeURL, err := k8sClient.CreateSandboxRoute(ctx, namespace, sandboxName)
	if err != nil {
		rollback()
		if httpErr, ok := err.(*integrations.HTTPError); ok && httpErr.StatusCode == 403 {
			app.forbiddenResponse(w, r, httpErr.Message)
			return
		}
		app.serverErrorResponse(w, r, err)
		return
	}
	resources.RouteName = sandboxName

	resp := models.AgentDeploymentCreateResponse{
		LlamaStackConfigMapName: lsCM.Name,
		WrapperAppConfigMapName: waCM.Name,
		SandboxName:             sandboxName,
		Namespace:               namespace,
		RouteURL:                routeURL,
		AgentProfileID:          req.AgentProfileID,
	}
	envelope := AgentDeploymentCreateEnvelope{Data: resp}
	if err := app.WriteJSON(w, http.StatusCreated, envelope, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
