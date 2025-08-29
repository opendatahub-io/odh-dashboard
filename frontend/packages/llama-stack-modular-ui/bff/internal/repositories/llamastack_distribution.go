package repositories

import (
	"context"

	"github.com/opendatahub-io/llama-stack-modular-ui/internal/integrations"
	"github.com/opendatahub-io/llama-stack-modular-ui/internal/integrations/kubernetes"
	"github.com/opendatahub-io/llama-stack-modular-ui/internal/models"
	// Import the typed LlamaStackDistribution types
)

type LlamaStackDistributionRepository struct{}

func NewLlamaStackDistributionRepository() *LlamaStackDistributionRepository {
	return &LlamaStackDistributionRepository{}
}

// GetLlamaStackDistributionStatus checks for the status of LSD in the given namespace
func (r *LlamaStackDistributionRepository) GetLlamaStackDistributionStatus(
	client kubernetes.KubernetesClientInterface,
	ctx context.Context,
	identity *integrations.RequestIdentity,
	namespace string,
) (*models.LlamaStackDistributionModel, error) {
	// Get the raw LSD list from the client
	lsdList, err := client.GetLlamaStackDistributions(ctx, identity, namespace)
	if err != nil {
		return nil, err
	}

	// If no LSD resources found, return nil (this is not an error, just an empty list)
	if len(lsdList.Items) == 0 {
		return nil, nil
	}

	// Get the first LSD resource (assuming one per namespace)
	lsd := lsdList.Items[0]

	// Extract the required fields directly from the typed struct
	name := lsd.Name
	phase := string(lsd.Status.Phase)
	version := lsd.Status.Version.LlamaStackServerVersion

	distributionConfig := map[string]interface{}{
		"activeDistribution":     lsd.Status.DistributionConfig.ActiveDistribution,
		"providers":              lsd.Status.DistributionConfig.Providers,
		"availableDistributions": lsd.Status.DistributionConfig.AvailableDistributions,
	}

	// Create the model
	lsdModel := &models.LlamaStackDistributionModel{
		Name:               name,
		Phase:              phase,
		Version:            version,
		DistributionConfig: distributionConfig,
	}

	return lsdModel, nil
}
