package api

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/gen-ai/internal/constants"
	"github.com/opendatahub-io/gen-ai/internal/integrations"
	"github.com/opendatahub-io/gen-ai/internal/integrations/bffclient"
	kubernetes "github.com/opendatahub-io/gen-ai/internal/integrations/kubernetes"
	"github.com/opendatahub-io/gen-ai/internal/models"
	k8svalidation "k8s.io/apimachinery/pkg/util/validation"
)

type AgentDeploymentCreateEnvelope = Envelope[models.AgentDeploymentCreateResponse, None]

const sandboxRollbackTimeout = 30 * time.Second

const mockSandboxOGXImage = "example.com/ogx:mock"

const (
	sandboxNameSuffixLength    = 5 // hyphen plus four random hexadecimal characters
	sandboxServiceSuffixLength = len("-ext")
	dnsLabelMaxLength          = 63
)

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
	if err := validateSandboxDeploymentName(req.Name, namespace); err != nil {
		app.badRequestResponse(w, r, &integrations.HTTPError{
			StatusCode: http.StatusBadRequest,
			ErrorResponse: integrations.ErrorResponse{
				Code:    "invalid_name",
				Message: err.Error(),
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
	mcpServerAuth, err := normalizeMCPServerAuth(req.MCPServerAuth)
	if err != nil {
		app.badRequestResponse(w, r, err)
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
	systemPrompt, err := app.resolveSandboxSystemPrompt(ctx, namespace, profile.Spec.Prompt)
	if err != nil {
		var bffErr *bffclient.BFFClientError
		if errors.As(err, &bffErr) {
			app.handleBFFClientError(w, r, err)
		} else {
			app.badRequestResponse(w, r, err)
		}
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
	mcpServers, err := app.resolveSandboxMCPServers(ctx, k8sClient, profile, mcpServerAuth)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}
	mcpServersJSON, err := json.Marshal(mcpServers)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}
	vectorStoreIDsJSON, err := json.Marshal(kubernetes.SandboxVectorStoreIDs(profile))
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

	// Require the OGX core image — injected by the operator via RELATED_IMAGE_ODH_OGX_CORE_IMAGE.
	ogxImage := app.config.OGXCoreImage
	if ogxImage == "" && app.config.MockK8sClient {
		// Mock mode persists a simulated Sandbox but never starts a pod, so it does
		// not receive the operator-injected RELATED_IMAGE_ODH_OGX_CORE_IMAGE environment value.
		ogxImage = mockSandboxOGXImage
	}
	if ogxImage == "" {
		rollback()
		app.serverErrorResponse(w, r, &integrations.HTTPError{
			StatusCode: 500,
			ErrorResponse: integrations.ErrorResponse{
				Code:    "missing_image",
				Message: "OGX core image not configured; set RELATED_IMAGE_ODH_OGX_CORE_IMAGE or --ogx-core-image",
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
	sandboxName := req.Name + "-" + sandboxSuffix

	var mcpAuthSecrets []kubernetes.SandboxSecretEnvVar
	for _, server := range mcpServers {
		if server.AuthorizationEnvVar == "" {
			continue
		}
		authorization := mcpServerAuth[server.ServerLabel]
		secret, secretErr := k8sClient.CreateSandboxMCPAuthSecret(ctx, namespace, server.ServerLabel, authorization)
		if secretErr != nil {
			rollback()
			if httpErr, ok := secretErr.(*integrations.HTTPError); ok && httpErr.StatusCode == http.StatusForbidden {
				app.forbiddenResponse(w, r, httpErr.Message)
				return
			}
			app.serverErrorResponse(w, r, secretErr)
			return
		}
		resources.MCPAuthSecretNames = append(resources.MCPAuthSecretNames, secret.Name)
		mcpAuthSecrets = append(mcpAuthSecrets, kubernetes.SandboxSecretEnvVar{Name: server.AuthorizationEnvVar, SecretName: secret.Name})
	}

	var modelAuthSecret *kubernetes.SandboxSecretEnvVar
	if profile.Spec.Model.SourceType == string(models.ModelSourceTypeCustomEndpoint) {
		credentials := profile.Spec.Model.Authorization
		if credentials == nil || credentials.CredentialsRef == nil || credentials.CredentialsRef.Kind != "Secret" || credentials.CredentialsRef.Name == "" || credentials.CredentialsRef.Key == "" {
			rollback()
			app.badRequestResponse(w, r, fmt.Errorf("custom endpoint model requires a Secret credentialsRef"))
			return
		}
		apiKey, secretErr := k8sClient.GetSecretValue(ctx, nil, namespace, credentials.CredentialsRef.Name, credentials.CredentialsRef.Key)
		if secretErr != nil {
			rollback()
			app.serverErrorResponse(w, r, secretErr)
			return
		}
		secret, secretErr := k8sClient.CreateSandboxModelAuthSecret(ctx, namespace, apiKey)
		if secretErr != nil {
			rollback()
			if httpErr, ok := secretErr.(*integrations.HTTPError); ok && httpErr.StatusCode == http.StatusForbidden {
				app.forbiddenResponse(w, r, httpErr.Message)
				return
			}
			app.serverErrorResponse(w, r, secretErr)
			return
		}
		resources.MCPAuthSecretNames = append(resources.MCPAuthSecretNames, secret.Name)
		modelAuthSecret = &kubernetes.SandboxSecretEnvVar{Name: "AGENT_MODEL_API_KEY", SecretName: secret.Name}
	}

	// Build Sandbox CR options from the profile snapshot and BFF config.
	sandboxOpts := kubernetes.SandboxCROptions{
		Name:                    sandboxName,
		ProfileID:               req.AgentProfileID,
		LlamaStackConfigMapName: lsCM.Name,
		WrapperAppConfigMapName: waCM.Name,
		Image:                   ogxImage,
		MaaSGatewayURL:          app.config.MaaSURL,
		AgentConfigJSON:         string(agentConfigJSON),
		OGXModelID:              kubernetes.SandboxOGXModelID(profile.Spec.Model.ID),
		ModelSourceType:         profile.Spec.Model.SourceType,
		SystemPrompt:            systemPrompt,
		MCPServersJSON:          string(mcpServersJSON),
		VectorStoreIDsJSON:      string(vectorStoreIDsJSON),
		MCPAuthSecrets:          mcpAuthSecrets,
		ModelAuthSecret:         modelAuthSecret,
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
	sandboxName, err = k8sClient.CreateSandboxCR(ctx, namespace, sandboxOpts)
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
	if err := k8sClient.SetSandboxMCPAuthSecretsOwner(ctx, namespace, sandboxName, resources.MCPAuthSecretNames...); err != nil {
		rollback()
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

// validateSandboxDeploymentName ensures the user-provided base name remains valid after the
// generated suffixes needed by the Sandbox, its Service, and OpenShift's default Route host.
func validateSandboxDeploymentName(name, namespace string) error {
	if errors := k8svalidation.IsDNS1123Label(name); len(errors) > 0 {
		return fmt.Errorf("name must be a DNS-1123 label: %s", strings.Join(errors, "; "))
	}

	// The derived Service is <name>-<4 hex>-ext and must be a DNS label. OpenShift's
	// generated Route host begins <sandbox-name>-<namespace>, which is also one DNS label.
	serviceMaxLength := dnsLabelMaxLength - sandboxNameSuffixLength - sandboxServiceSuffixLength
	routeMaxLength := dnsLabelMaxLength - sandboxNameSuffixLength - 1 - len(namespace)
	maxLength := min(serviceMaxLength, routeMaxLength)
	if maxLength < 1 {
		return fmt.Errorf("namespace %q leaves no valid length for a deployment name", namespace)
	}
	if len(name) > maxLength {
		return fmt.Errorf("name must be at most %d characters for namespace %q", maxLength, namespace)
	}
	return nil
}

// normalizeMCPServerAuth accepts either a raw OAuth token or an Authorization header value.
// OGX adds the "Bearer " scheme itself when it connects to MCP servers, so Secrets must hold
// only the token value to avoid sending "Bearer Bearer <token>".
func normalizeMCPServerAuth(authorizations map[string]string) (map[string]string, error) {
	if len(authorizations) == 0 {
		return nil, nil
	}

	normalized := make(map[string]string, len(authorizations))
	for serverID, authorization := range authorizations {
		value := strings.TrimSpace(authorization)
		if strings.EqualFold(value, "Bearer") {
			value = ""
		} else if len(value) >= len("Bearer ") && strings.EqualFold(value[:len("Bearer ")], "Bearer ") {
			value = strings.TrimSpace(value[len("Bearer "):])
		}
		if value == "" {
			return nil, fmt.Errorf("mcpServerAuth[%q] cannot be empty", serverID)
		}
		normalized[serverID] = value
	}
	return normalized, nil
}

func (app *App) resolveSandboxMCPServers(
	ctx context.Context,
	k8sClient kubernetes.KubernetesClientInterface,
	profile *models.AgentProfile,
	authorizations map[string]string,
) ([]kubernetes.SandboxMCPServer, error) {
	if len(profile.Spec.MCPServers) == 0 {
		if len(authorizations) > 0 {
			return nil, fmt.Errorf("mcpServerAuth was provided but the AgentProfile has no MCP servers")
		}
		return nil, nil
	}

	registryServers, err := app.repositories.MCPClient.GetMCPServersFromDashboardConfig(
		k8sClient, ctx, app.dashboardNamespace, constants.MCPServerName,
	)
	if err != nil {
		return nil, err
	}
	registryByID := make(map[string]models.MCPServerConfig, len(registryServers))
	for _, server := range registryServers {
		registryByID[server.Name] = server.Config
	}

	selectedIDs := make(map[string]struct{}, len(profile.Spec.MCPServers))
	servers := make([]kubernetes.SandboxMCPServer, 0, len(profile.Spec.MCPServers))
	for i, selected := range profile.Spec.MCPServers {
		if selected.ServerRef.Kind != "ConfigMap" || selected.ServerRef.Name != constants.MCPServerName {
			return nil, fmt.Errorf("spec.mcpServers[%d] must reference ConfigMap %q", i, constants.MCPServerName)
		}
		serverID := selected.ServerRef.Key
		config, found := registryByID[serverID]
		if !found || config.URL == "" {
			return nil, fmt.Errorf("MCP server %q was not found in dashboard ConfigMap %q", serverID, constants.MCPServerName)
		}
		selectedIDs[serverID] = struct{}{}
		server := kubernetes.SandboxMCPServer{ServerLabel: serverID, ServerURL: config.URL}
		if selected.AllowedTools != nil {
			server.AllowedTools = &selected.AllowedTools
		}
		if authorization, found := authorizations[serverID]; found {
			if strings.TrimSpace(authorization) == "" {
				return nil, fmt.Errorf("mcpServerAuth[%q] cannot be empty", serverID)
			}
			server.AuthorizationEnvVar = fmt.Sprintf("MCP_AUTH_%d", i+1)
		}
		servers = append(servers, server)
	}
	for serverID := range authorizations {
		if _, selected := selectedIDs[serverID]; !selected {
			return nil, fmt.Errorf("mcpServerAuth[%q] does not match a selected MCP server", serverID)
		}
	}
	return servers, nil
}
