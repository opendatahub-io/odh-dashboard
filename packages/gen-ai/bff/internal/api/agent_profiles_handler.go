package api

import (
	"net/http"

	"github.com/google/uuid"
	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/gen-ai/internal/constants"
	"github.com/opendatahub-io/gen-ai/internal/integrations"
	"github.com/opendatahub-io/gen-ai/internal/models"
)

type AgentProfileCreateEnvelope = Envelope[models.AgentProfileCreateResponse, None]
type AgentProfileListEnvelope = Envelope[models.AgentProfileListResponse, None]
type AgentProfileEnvelope = Envelope[models.AgentProfile, None]
type AgentProfileUpdateEnvelope = Envelope[models.AgentProfileUpdateResponse, None]

// CreateAgentProfileHandler handles POST requests to create an agent profile
func (app *App) CreateAgentProfileHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	// Parse the request body
	var request models.AgentProfileCreateRequest
	if err := app.ReadJSON(w, r, &request); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	ctx := r.Context()

	// Extract namespace from context (set by AttachNamespace middleware)
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

	// Get the Kubernetes client
	k8sClient, err := app.kubernetesClientFactory.GetClient(ctx)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	// Generate UUID for the profile
	profileID := uuid.New().String()

	// Build the complete AgentProfile with auto-generated metadata.name
	profile := &models.AgentProfile{
		APIVersion: "genai.redhat.com/v1alpha1",
		Kind:       "AgentProfile",
		Metadata: models.AgentProfileMetadata{
			Name: profileID,
		},
		Spec: request.Spec,
	}

	// Create the agent profile
	response, err := k8sClient.CreateAgentProfile(ctx, namespace, profile)
	if err != nil {
		// Handle error based on type
		if httpErr, ok := err.(*integrations.HTTPError); ok {
			switch httpErr.StatusCode {
			case 400:
				app.badRequestResponse(w, r, httpErr)
			case 403:
				app.forbiddenResponse(w, r, httpErr.Message)
			case 409:
				app.conflictResponse(w, r, httpErr)
			default:
				app.serverErrorResponse(w, r, httpErr)
			}
			return
		}
		// Unexpected error type
		app.serverErrorResponse(w, r, err)
		return
	}

	// Enhance response with displayName for UI convenience
	response.ProfileID = profileID
	response.DisplayName = request.Spec.DisplayName

	// Return success response
	envelope := AgentProfileCreateEnvelope{
		Data: *response,
	}

	if err := app.WriteJSON(w, http.StatusCreated, envelope, nil); err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}
}

// ListAgentProfilesHandler handles GET requests to list agent profiles
func (app *App) ListAgentProfilesHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

	// Extract namespace from context (set by AttachNamespace middleware)
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

	// Get the Kubernetes client
	k8sClient, err := app.kubernetesClientFactory.GetClient(ctx)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	// List agent profiles
	response, err := k8sClient.ListAgentProfiles(ctx, namespace)
	if err != nil {
		// Handle error based on type
		if httpErr, ok := err.(*integrations.HTTPError); ok {
			switch httpErr.StatusCode {
			case 403:
				app.forbiddenResponse(w, r, httpErr.Message)
			default:
				app.serverErrorResponse(w, r, httpErr)
			}
			return
		}
		// Unexpected error type
		app.serverErrorResponse(w, r, err)
		return
	}

	// Return success response
	envelope := AgentProfileListEnvelope{
		Data: *response,
	}

	if err := app.WriteJSON(w, http.StatusOK, envelope, nil); err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}
}

// GetAgentProfileHandler handles GET requests to retrieve a single agent profile by ID
func (app *App) GetAgentProfileHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	ctx := r.Context()

	// Extract namespace from context
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

	// Extract profile ID from path
	profileID := ps.ByName("id")
	if profileID == "" {
		app.badRequestResponse(w, r, &integrations.HTTPError{
			StatusCode: 400,
			ErrorResponse: integrations.ErrorResponse{
				Code:    "missing_id",
				Message: "profile ID is required",
			},
		})
		return
	}

	// Validate profile ID is a valid UUID
	if _, err := uuid.Parse(profileID); err != nil {
		app.badRequestResponse(w, r, &integrations.HTTPError{
			StatusCode: 400,
			ErrorResponse: integrations.ErrorResponse{
				Code:    "invalid_id",
				Message: "profile ID must be a valid UUID",
			},
		})
		return
	}

	// Get the Kubernetes client
	k8sClient, err := app.kubernetesClientFactory.GetClient(ctx)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	// Get agent profile
	profile, err := k8sClient.GetAgentProfile(ctx, namespace, profileID)
	if err != nil {
		// Handle error based on type
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
		// Unexpected error type
		app.serverErrorResponse(w, r, err)
		return
	}

	// Return success response
	envelope := AgentProfileEnvelope{
		Data: *profile,
	}

	if err := app.WriteJSON(w, http.StatusOK, envelope, nil); err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}
}

// UpdateAgentProfileHandler handles PUT requests to update an agent profile
func (app *App) UpdateAgentProfileHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	ctx := r.Context()

	// Extract namespace from context
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

	// Extract profile ID from path
	profileID := ps.ByName("id")
	if profileID == "" {
		app.badRequestResponse(w, r, &integrations.HTTPError{
			StatusCode: 400,
			ErrorResponse: integrations.ErrorResponse{
				Code:    "missing_id",
				Message: "profile ID is required",
			},
		})
		return
	}

	// Validate profile ID is a valid UUID
	if _, err := uuid.Parse(profileID); err != nil {
		app.badRequestResponse(w, r, &integrations.HTTPError{
			StatusCode: 400,
			ErrorResponse: integrations.ErrorResponse{
				Code:    "invalid_id",
				Message: "profile ID must be a valid UUID",
			},
		})
		return
	}

	// Parse the request body
	var request models.AgentProfileUpdateRequest
	if err := app.ReadJSON(w, r, &request); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	// Validate resourceVersion is provided
	if request.ResourceVersion == "" {
		app.badRequestResponse(w, r, &integrations.HTTPError{
			StatusCode: 400,
			ErrorResponse: integrations.ErrorResponse{
				Code:    "missing_resource_version",
				Message: "resourceVersion is required for update",
			},
		})
		return
	}

	// Get the Kubernetes client
	k8sClient, err := app.kubernetesClientFactory.GetClient(ctx)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	// Update agent profile
	response, err := k8sClient.UpdateAgentProfile(ctx, namespace, profileID, &request)
	if err != nil {
		// Handle error based on type
		if httpErr, ok := err.(*integrations.HTTPError); ok {
			switch httpErr.StatusCode {
			case 400:
				app.badRequestResponse(w, r, httpErr)
			case 403:
				app.forbiddenResponse(w, r, httpErr.Message)
			case 404:
				app.notFoundResponse(w, r)
			case 409:
				app.conflictResponse(w, r, httpErr)
			default:
				app.serverErrorResponse(w, r, httpErr)
			}
			return
		}
		// Unexpected error type
		app.serverErrorResponse(w, r, err)
		return
	}

	// Return success response
	envelope := AgentProfileUpdateEnvelope{
		Data: *response,
	}

	if err := app.WriteJSON(w, http.StatusOK, envelope, nil); err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}
}

// DeleteAgentProfileHandler handles DELETE requests to remove an agent profile
func (app *App) DeleteAgentProfileHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	ctx := r.Context()

	// Extract namespace from context
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

	// Extract profile ID from path
	profileID := ps.ByName("id")
	if profileID == "" {
		app.badRequestResponse(w, r, &integrations.HTTPError{
			StatusCode: 400,
			ErrorResponse: integrations.ErrorResponse{
				Code:    "missing_id",
				Message: "profile ID is required",
			},
		})
		return
	}

	// Validate profile ID is a valid UUID
	if _, err := uuid.Parse(profileID); err != nil {
		app.badRequestResponse(w, r, &integrations.HTTPError{
			StatusCode: 400,
			ErrorResponse: integrations.ErrorResponse{
				Code:    "invalid_id",
				Message: "profile ID must be a valid UUID",
			},
		})
		return
	}

	// Get the Kubernetes client
	k8sClient, err := app.kubernetesClientFactory.GetClient(ctx)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	// Delete agent profile
	err = k8sClient.DeleteAgentProfile(ctx, namespace, profileID)
	if err != nil {
		// Handle error based on type
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
		// Unexpected error type
		app.serverErrorResponse(w, r, err)
		return
	}

	// Return 204 No Content on successful deletion
	w.WriteHeader(http.StatusNoContent)
}
