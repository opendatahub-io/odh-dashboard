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
