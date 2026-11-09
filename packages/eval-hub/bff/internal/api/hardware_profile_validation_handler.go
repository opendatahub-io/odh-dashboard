package api

import (
	"context"
	"fmt"
	"net/http"
	"sort"
	"strings"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/eval-hub/bff/internal/constants"
	"github.com/opendatahub-io/eval-hub/bff/internal/integrations/evalhub"
	"github.com/opendatahub-io/eval-hub/bff/internal/models"
	"k8s.io/apimachinery/pkg/api/resource"
)

type HardwareProfileValidationEnvelope Envelope[models.HardwareProfileValidationResponse, None]

const maxProviderPages = 100

// ValidateHardwareProfilesHandler compares the selected HardwareProfiles'
// resources against the evaluation providers' minimum resource requirements.
// Profiles come from the EvalHub service info API (already tenant-filtered —
// queue-backed profiles only appear while their LocalQueue exists); provider
// requirements come from the EvalHub service. No Kubernetes reads and no
// service-account credentials are involved.
func (app *App) ValidateHardwareProfilesHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

	evalHubClient, ok := ctx.Value(constants.EvalHubClientKey).(evalhub.EvalHubClientInterface)
	if !ok || evalHubClient == nil {
		app.serverErrorResponse(w, r, fmt.Errorf("EvalHub client not available in context"))
		return
	}
	namespace, _ := ctx.Value(constants.NamespaceHeaderParameterKey).(string)

	var input models.HardwareProfileValidationRequest
	if err := app.ReadJSON(w, r, &input); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}
	hardwareProfileNames, err := normalizeHardwareProfileNames(input.HardwareProfiles)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}
	providerIDs, err := normalizeProviderIDs(input.ProviderIDs)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	info, err := evalHubClient.GetInfo(ctx, namespace)
	if err != nil {
		app.evalHubErrorResponse(w, r, err, "failed to load tenant hardware profiles for validation")
		return
	}
	profilesByName := make(map[string]evalhub.HardwareProfileInfo, len(info.HardwareProfiles))
	for _, profile := range info.HardwareProfiles {
		profilesByName[profile.Name] = profile
	}
	selectedProfiles := make([]evalhub.HardwareProfileInfo, 0, len(hardwareProfileNames))
	for _, hardwareProfileName := range hardwareProfileNames {
		profile, found := profilesByName[hardwareProfileName]
		if !found {
			app.badRequestResponse(w, r, fmt.Errorf(
				"HardwareProfile %q is not available in namespace %q",
				hardwareProfileName,
				namespace,
			))
			return
		}
		selectedProfiles = append(selectedProfiles, profile)
	}

	providers, missingProviderIDs, err := listSelectedProviders(ctx, evalHubClient, namespace, providerIDs)
	if err != nil {
		app.evalHubErrorResponse(w, r, err, "failed to load evaluation providers for HardwareProfile validation")
		return
	}
	if len(missingProviderIDs) > 0 {
		app.badRequestResponse(w, r, fmt.Errorf("evaluation provider %q was not found", missingProviderIDs[0]))
		return
	}

	items := make([]models.HardwareProfileValidationResult, 0, len(selectedProfiles))
	for _, profile := range selectedProfiles {
		items = append(items, buildHardwareProfileValidation(profile, providers))
	}
	result := models.HardwareProfileValidationResponse{Items: items}

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
		return nil, fmt.Errorf("provider_ids must contain at least one provider")
	}
	return providerIDs, nil
}

func buildHardwareProfileValidation(profile evalhub.HardwareProfileInfo, providers []evalhub.Provider) models.HardwareProfileValidationResult {
	result := models.HardwareProfileValidationResult{
		Compatible:      true,
		HardwareProfile: profile.Name,
		Mismatches:      []models.HardwareProfileResourceMismatch{},
	}
	for _, provider := range providers {
		for _, mismatch := range validateProfileAgainstProvider(profile, provider) {
			result.Compatible = false
			result.Mismatches = append(result.Mismatches, mismatch)
		}
	}
	return result
}

// listSelectedProviders retrieves only the requested providers while following
// the EvalHub provider endpoint's pagination. A provider can be selected by
// resource ID or name, preserving the identifiers accepted by the UI.
func listSelectedProviders(
	ctx context.Context,
	client evalhub.EvalHubClientInterface,
	namespace string,
	requested map[string]struct{},
) ([]evalhub.Provider, []string, error) {
	remaining := make(map[string]struct{}, len(requested))
	for id := range requested {
		remaining[id] = struct{}{}
	}

	providers := make([]evalhub.Provider, 0, len(requested))
	for offset, page := 0, 0; len(remaining) > 0 && page < maxProviderPages; page, offset = page+1, offset+maxProvidersLimit {
		response, err := client.ListProviders(ctx, namespace, maxProvidersLimit, offset)
		if err != nil {
			return nil, nil, err
		}
		for _, provider := range response.Items {
			providerID := providerID(provider)
			_, selectedByID := remaining[providerID]
			_, selectedByName := remaining[provider.Name]
			if !selectedByID && !selectedByName {
				continue
			}
			providers = append(providers, provider)
			delete(remaining, providerID)
			delete(remaining, provider.Name)
		}

		if len(remaining) == 0 || len(response.Items) < maxProvidersLimit {
			break
		}
		if response.TotalCount > 0 && offset+len(response.Items) >= response.TotalCount {
			break
		}
	}

	missing := make([]string, 0, len(remaining))
	for id := range remaining {
		missing = append(missing, id)
	}
	sort.Strings(missing)
	return providers, missing, nil
}

func validateProfileAgainstProvider(profile evalhub.HardwareProfileInfo, provider evalhub.Provider) []models.HardwareProfileResourceMismatch {
	if provider.Runtime == nil || provider.Runtime.K8s == nil {
		return nil
	}
	runtime := provider.Runtime.K8s
	resources := make(map[string]evalhub.HardwareProfileIdentifier, len(profile.Identifiers))
	for _, identifier := range profile.Identifiers {
		resources[normalizeResourceName(identifier.Identifier)] = identifier
	}

	var mismatches []models.HardwareProfileResourceMismatch
	compare := func(resourceName, required string) {
		if strings.TrimSpace(required) == "" {
			return
		}
		profileResource, found := findProfileResource(resources, resourceName)
		if !found {
			mismatches = append(mismatches, models.HardwareProfileResourceMismatch{
				ProviderID: providerID(provider),
				Resource:   resourceName,
				Required:   required,
				Available:  "not configured",
				Message:    fmt.Sprintf("HardwareProfile does not provide the required %s resource", resourceName),
			})
			return
		}
		availableQuantity, availableValue := profileResourceQuantity(profileResource, resourceName)
		requiredQuantity, err := resource.ParseQuantity(required)
		if err != nil {
			mismatches = append(mismatches, models.HardwareProfileResourceMismatch{
				ProviderID: providerID(provider),
				Resource:   resourceName,
				Required:   required,
				Available:  availableValue,
				Message:    fmt.Sprintf("Evaluation provider requires an invalid %s resource quantity", resourceName),
			})
			return
		}
		if availableQuantity == nil || availableQuantity.Cmp(requiredQuantity) < 0 {
			mismatches = append(mismatches, models.HardwareProfileResourceMismatch{
				ProviderID: providerID(provider),
				Resource:   resourceName,
				Required:   required,
				Available:  availableValue,
				Message:    fmt.Sprintf("HardwareProfile provides %s %s, but the provider requires at least %s", resourceName, availableValue, required),
			})
		}
	}

	compare("cpu", runtime.CPURequest)
	compare("cpu_limit", runtime.CPULimit)
	compare("memory", runtime.MemoryRequest)
	compare("memory_limit", runtime.MemoryLimit)
	if runtime.GPU != nil && runtime.GPU.Count > 0 {
		resourceName := runtime.GPU.Resource
		if resourceName == "" {
			resourceName = "gpu"
		}
		compare(resourceName, fmt.Sprintf("%d", runtime.GPU.Count))
	}
	return mismatches
}

func providerID(provider evalhub.Provider) string {
	if provider.Resource.ID != "" {
		return provider.Resource.ID
	}
	return provider.Name
}

func normalizeResourceName(value string) string {
	return strings.ToLower(strings.TrimSpace(value))
}

func findProfileResource(resources map[string]evalhub.HardwareProfileIdentifier, name string) (evalhub.HardwareProfileIdentifier, bool) {
	normalized := normalizeResourceName(name)
	if profileResource, ok := resources[normalized]; ok {
		return profileResource, true
	}
	if normalized == "cpu_limit" {
		return resources["cpu"], hasResource(resources, "cpu")
	}
	if normalized == "memory_limit" {
		return resources["memory"], hasResource(resources, "memory")
	}
	if normalized != "gpu" {
		return evalhub.HardwareProfileIdentifier{}, false
	}

	gpuIdentifiers := make([]string, 0)
	for identifier := range resources {
		if strings.Contains(identifier, "gpu") {
			gpuIdentifiers = append(gpuIdentifiers, identifier)
		}
	}
	if len(gpuIdentifiers) > 0 {
		sort.Strings(gpuIdentifiers)
		return resources[gpuIdentifiers[0]], true
	}
	return evalhub.HardwareProfileIdentifier{}, false
}

func hasResource(resources map[string]evalhub.HardwareProfileIdentifier, name string) bool {
	_, ok := resources[name]
	return ok
}

func profileResourceQuantity(profileResource evalhub.HardwareProfileIdentifier, resourceName string) (*resource.Quantity, string) {
	value := profileResource.DefaultCount
	if strings.HasSuffix(normalizeResourceName(resourceName), "_limit") && profileResource.MaxCount != "" {
		value = profileResource.MaxCount
	}
	if value == "" {
		value = profileResource.MinCount
	}
	if value == "" {
		return nil, "not configured"
	}
	quantity, err := resource.ParseQuantity(value)
	if err != nil {
		return nil, value
	}
	return &quantity, value
}
