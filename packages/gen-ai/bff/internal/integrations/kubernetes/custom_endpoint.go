package kubernetes

import (
	"fmt"
	"strings"

	"github.com/opendatahub-io/gen-ai/internal/constants"
	"github.com/opendatahub-io/gen-ai/internal/models"
)

// ResolveCustomEndpointModelProvider finds the registered custom-endpoint model
// and its provider. Bare model IDs must be unique across providers to avoid
// routing a request with another provider's credentials.
func ResolveCustomEndpointModelProvider(config *models.ExternalModelsConfig, modelID string) (*models.RegisteredModel, *models.InferenceProvider, error) {
	if config == nil {
		return nil, nil, fmt.Errorf("external models configuration is missing")
	}

	lookupModelID := strings.TrimPrefix(modelID, constants.PassthroughProviderID+"/")
	var foundModel *models.RegisteredModel
	if strings.Contains(lookupModelID, "/") && !strings.HasPrefix(modelID, constants.PassthroughProviderID+"/") {
		parts := strings.SplitN(lookupModelID, "/", 2)
		if len(parts) == 2 && parts[0] != "" && parts[1] != "" {
			for i := range config.RegisteredResources.Models {
				model := &config.RegisteredResources.Models[i]
				if model.ProviderID == parts[0] && model.ModelID == parts[1] {
					foundModel = model
					break
				}
			}
		}
	}

	if foundModel == nil {
		var matches []*models.RegisteredModel
		for i := range config.RegisteredResources.Models {
			model := &config.RegisteredResources.Models[i]
			if model.ModelID == lookupModelID {
				matches = append(matches, model)
			}
		}
		switch len(matches) {
		case 1:
			foundModel = matches[0]
		case 0:
			return nil, nil, fmt.Errorf("custom endpoint model %q is not registered", modelID)
		default:
			return nil, nil, fmt.Errorf("custom endpoint model %q is ambiguous across %d providers", modelID, len(matches))
		}
	}

	for i := range config.Providers.Inference {
		provider := &config.Providers.Inference[i]
		if provider.ProviderID == foundModel.ProviderID {
			return foundModel, provider, nil
		}
	}
	return nil, nil, fmt.Errorf("provider %q is not registered for custom endpoint model %q", foundModel.ProviderID, modelID)
}
