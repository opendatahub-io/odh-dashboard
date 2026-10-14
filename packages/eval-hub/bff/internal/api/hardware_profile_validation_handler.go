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
	kubernetes "github.com/opendatahub-io/eval-hub/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/eval-hub/bff/internal/models"
	"k8s.io/apimachinery/pkg/api/resource"
)

type HardwareProfileValidationEnvelope Envelope[models.HardwareProfileValidationResponse, None]

const maxProviderPages = 100

func (app *App) ValidateHardwareProfilesHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

	k8sClient, err := app.kubernetesClientFactory.GetClient(ctx)
	if err != nil {
		app.serverErrorResponse(w, r, fmt.Errorf("failed to get Kubernetes client: %w", err))
		return
	}
	evalHubClient, ok := ctx.Value(constants.EvalHubClientKey).(evalhub.EvalHubClientInterface)
	if !ok || evalHubClient == nil {
		app.serverErrorResponse(w, r, fmt.Errorf("EvalHub client not available in context"))
		return
	}
	identity, ok := ctx.Value(constants.RequestIdentityKey).(*kubernetes.RequestIdentity)
	if !ok || identity == nil {
		app.serverErrorResponse(w, r, fmt.Errorf("missing RequestIdentity in context"))
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

	hardwareProfilesNamespace := app.hardwareProfilesNamespace()
	profiles, err := k8sClient.ListHardwareProfiles(ctx, identity, namespace, hardwareProfilesNamespace)
	if err != nil {
		app.serverErrorResponse(w, r, fmt.Errorf("failed to validate HardwareProfiles: %w", err))
		return
	}
	profilesByName := make(map[string]models.HardwareProfile, len(profiles.Items))
	for i := range profiles.Items {
		profilesByName[profiles.Items[i].Name] = profiles.Items[i]
	}
	selectedProfiles := make([]models.HardwareProfile, 0, len(hardwareProfileNames))
	for _, hardwareProfileName := range hardwareProfileNames {
		profile, found := profilesByName[hardwareProfileName]
		if !found {
			missingQueue, queueMissing, err := k8sClient.GetMissingHardwareProfileLocalQueueName(
				ctx,
				identity,
				namespace,
				hardwareProfilesNamespace,
				hardwareProfileName,
			)
			if err != nil {
				app.serverErrorResponse(w, r, fmt.Errorf("failed to verify HardwareProfile LocalQueue: %w", err))
				return
			}
			if queueMissing {
				app.badRequestResponse(w, r, fmt.Errorf(
					"LocalQueue %q configured by HardwareProfile %q is no longer available in namespace %q",
					missingQueue,
					hardwareProfileName,
					namespace,
				))
				return
			}
			app.badRequestResponse(w, r, fmt.Errorf(
				"HardwareProfile %q is not available in platform namespace %q",
				hardwareProfileName,
				hardwareProfilesNamespace,
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
		return nil, fmt.Errorf("provider_ids must contain at least one non-empty provider")
	}
	return providerIDs, nil
}

func buildHardwareProfileValidation(profile models.HardwareProfile, providers []evalhub.Provider) models.HardwareProfileValidationResult {
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

func validateProfileAgainstProvider(profile models.HardwareProfile, provider evalhub.Provider) []models.HardwareProfileResourceMismatch {
	if provider.Runtime == nil || provider.Runtime.K8s == nil {
		return nil
	}
	runtime := provider.Runtime.K8s
	resources := make(map[string]models.HardwareProfileResource, len(profile.Resources))
	for _, resource := range profile.Resources {
		resources[normalizeResourceName(resource.Identifier)] = resource
	}

	var mismatches []models.HardwareProfileResourceMismatch
	compare := func(resourceName, required, available string) {
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

	compare("cpu", runtime.CPURequest, "")
	compare("cpu_limit", runtime.CPULimit, "")
	compare("memory", runtime.MemoryRequest, "")
	compare("memory_limit", runtime.MemoryLimit, "")
	if runtime.GPU != nil && runtime.GPU.Count > 0 {
		resourceName := runtime.GPU.Resource
		if resourceName == "" {
			resourceName = "gpu"
		}
		compare(resourceName, fmt.Sprintf("%d", runtime.GPU.Count), "")
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

func findProfileResource(resources map[string]models.HardwareProfileResource, name string) (models.HardwareProfileResource, bool) {
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
		return models.HardwareProfileResource{}, false
	}

	gpuIdentifiers := make([]string, 0)
	extendedIdentifiers := make([]string, 0)
	for identifier := range resources {
		if strings.Contains(identifier, "gpu") {
			gpuIdentifiers = append(gpuIdentifiers, identifier)
		} else if strings.Contains(identifier, "/") {
			extendedIdentifiers = append(extendedIdentifiers, identifier)
		}
	}
	if len(gpuIdentifiers) > 0 {
		sort.Strings(gpuIdentifiers)
		return resources[gpuIdentifiers[0]], true
	}
	if len(extendedIdentifiers) == 1 {
		return resources[extendedIdentifiers[0]], true
	}
	return models.HardwareProfileResource{}, false
}

func hasResource(resources map[string]models.HardwareProfileResource, name string) bool {
	_, ok := resources[name]
	return ok
}

func profileResourceQuantity(profileResource models.HardwareProfileResource, resourceName string) (*resource.Quantity, string) {
	value := profileResource.Default
	if strings.HasSuffix(normalizeResourceName(resourceName), "_limit") && profileResource.Maximum != "" {
		value = profileResource.Maximum
	}
	if value == "" {
		value = profileResource.Minimum
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
