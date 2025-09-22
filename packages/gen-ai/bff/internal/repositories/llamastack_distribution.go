package repositories

import (
	"context"

	"github.com/opendatahub-io/gen-ai/internal/integrations"
	"github.com/opendatahub-io/gen-ai/internal/integrations/kubernetes"
	"github.com/opendatahub-io/gen-ai/internal/models"
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

// InstallLlamaStackDistribution installs a new LlamaStackDistribution with the specified models
func (r *LlamaStackDistributionRepository) InstallLlamaStackDistribution(
	client kubernetes.KubernetesClientInterface,
	ctx context.Context,
	identity *integrations.RequestIdentity,
	namespace string,
	installmodels []string,
) (*models.LlamaStackDistributionInstallModel, error) {
	// Call the Kubernetes client to install the LSD
	lsd, err := client.InstallLlamaStackDistribution(ctx, identity, namespace, installmodels)
	if err != nil {
		return nil, err
	}

	// Create the response model
	installModel := &models.LlamaStackDistributionInstallModel{
		Name:       lsd.Name,
		HTTPStatus: "200",
	}

	return installModel, nil
}

// DeleteLlamaStackDistribution deletes a LlamaStackDistribution with the specified name
func (r *LlamaStackDistributionRepository) DeleteLlamaStackDistribution(
	client kubernetes.KubernetesClientInterface,
	ctx context.Context,
	identity *integrations.RequestIdentity,
	namespace string,
	name string,
) (*models.LlamaStackDistributionDeleteResponse, error) {
	// Call the Kubernetes client to delete the LSD (validation logic is now in the client)
	_, err := client.DeleteLlamaStackDistribution(ctx, identity, namespace, name)
	if err != nil {
		return nil, err
	}

	// Create the response model
	deleteModel := &models.LlamaStackDistributionDeleteResponse{
		Data: "LlamaStackDistribution deleted successfully",
	}

	return deleteModel, nil
}
