package api

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/eval-hub/bff/internal/models"
)

type HardwareProfileValidationEnvelope Envelope[models.HardwareProfileValidationResponse, None]

// RHOAIENG-99645: the Kueue integration is disabled. Validate the request shape (the
// contract pins the 400 paths), then return an empty result set without querying the
// cluster or the EvalHub service.
func (app *App) ValidateHardwareProfilesHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	var input models.HardwareProfileValidationRequest
	if err := app.ReadJSON(w, r, &input); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}
	if _, err := normalizeHardwareProfileNames(input.HardwareProfiles); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}
	if _, err := normalizeProviderIDs(input.ProviderIDs); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	result := models.HardwareProfileValidationResponse{
		// Non-nil so the field marshals to [] rather than null, per the OpenAPI contract.
		Items: []models.HardwareProfileValidationResult{},
	}
	if err := app.WriteJSON(w, http.StatusOK, HardwareProfileValidationEnvelope{Data: result}, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func normalizeHardwareProfileNames(input []string) ([]string, error) {
	if len(input) == 0 {
		return nil, fmt.Errorf("hardware_profiles must contain at least one HardwareProfile")
	}

	hardwareProfileNames := make([]string, 0, len(input))
	seen := make(map[string]struct{}, len(input))
	for _, hardwareProfileName := range input {
		trimmed := strings.TrimSpace(hardwareProfileName)
		if trimmed == "" {
			continue
		}
		if _, found := seen[trimmed]; found {
			continue
		}
		seen[trimmed] = struct{}{}
		hardwareProfileNames = append(hardwareProfileNames, trimmed)
	}
	if len(hardwareProfileNames) == 0 {
		return nil, fmt.Errorf("hardware_profiles must contain at least one non-empty HardwareProfile")
	}
	return hardwareProfileNames, nil
}

func normalizeProviderIDs(input []string) (map[string]struct{}, error) {
	if len(input) == 0 {
		return nil, fmt.Errorf("provider_ids must contain at least one provider")
	}

	providerIDs := make(map[string]struct{}, len(input))
	for _, providerID := range input {
		if trimmed := strings.TrimSpace(providerID); trimmed != "" {
			providerIDs[trimmed] = struct{}{}
		}
	}
	if len(providerIDs) == 0 {
		return nil, fmt.Errorf("provider_ids must contain at least one non-empty provider")
	}
	return providerIDs, nil
}
