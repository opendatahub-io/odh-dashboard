package repositories

import (
	"context"

	"github.com/opendatahub-io/gen-ai/internal/integrations"
	"github.com/opendatahub-io/gen-ai/internal/integrations/bffclient"
	"github.com/opendatahub-io/gen-ai/internal/integrations/kubernetes"
	"github.com/opendatahub-io/gen-ai/internal/models"
	corev1 "k8s.io/api/core/v1"
)

type OGXServerRepository struct{}

func NewOGXServerRepository() *OGXServerRepository {
	return &OGXServerRepository{}
}

// GetOGXServerStatus checks for the status of the OGXServer CR in the given namespace.
func (r *OGXServerRepository) GetOGXServerStatus(
	client kubernetes.KubernetesClientInterface,
	ctx context.Context,
	identity *integrations.RequestIdentity,
	namespace string,
) (*models.OGXServerModel, error) {
	ogxList, err := client.GetOGXServers(ctx, identity, namespace)
	if err != nil {
		return nil, err
	}

	if len(ogxList.Items) == 0 {
		return nil, nil
	}

	ogxServer := ogxList.Items[0]

	name := ogxServer.Name
	phase := string(ogxServer.Status.Phase)
	version := ogxServer.Status.Version.ServerVersion

	distributionConfig := map[string]interface{}{
		"activeDistribution":     ogxServer.Status.DistributionConfig.ActiveDistribution,
		"providers":              ogxServer.Status.DistributionConfig.Providers,
		"availableDistributions": ogxServer.Status.DistributionConfig.AvailableDistributions,
	}

	ogxModel := &models.OGXServerModel{
		Name:               name,
		Phase:              phase,
		Version:            version,
		DistributionConfig: distributionConfig,
		TracingEnabled:     ogxServer.Spec.Workload != nil && ogxServer.Spec.Workload.Overrides != nil && hasOTelEnvVar(ogxServer.Spec.Workload.Overrides.Env),
	}

	return ogxModel, nil
}

// hasOTelEnvVar infers whether the OGXServer was created with tracing enabled
// by checking for OTel env vars in the workload overrides. This avoids a CR
// schema change; if the tracing env var setup changes in ogxEnvVars(), this
// check must be updated to match.
func hasOTelEnvVar(envs []corev1.EnvVar) bool {
	for _, e := range envs {
		if e.Name == "OTEL_SERVICE_NAME" {
			return true
		}
	}
	return false
}

// InstallOGXServer installs an OGXServer with the specified models.
func (r *OGXServerRepository) InstallOGXServer(
	client kubernetes.KubernetesClientInterface,
	ctx context.Context,
	identity *integrations.RequestIdentity,
	namespace string,
	installmodels []models.InstallModel,
	vectorStores []models.InstallVectorStore,
	enableTracing bool,
	bffClient bffclient.BFFClientInterface,
) (*models.OGXServerInstallModel, error) {
	ogxServer, err := client.InstallOGXServer(ctx, identity, namespace, installmodels, vectorStores, enableTracing, bffClient)
	if err != nil {
		return nil, err
	}

	installModel := &models.OGXServerInstallModel{
		Name:       ogxServer.Name,
		HTTPStatus: "200",
	}

	return installModel, nil
}

// DeleteOGXServer deletes an OGXServer with the specified name.
func (r *OGXServerRepository) DeleteOGXServer(
	client kubernetes.KubernetesClientInterface,
	ctx context.Context,
	identity *integrations.RequestIdentity,
	namespace string,
	name string,
) (*models.OGXServerDeleteResponse, error) {
	_, err := client.DeleteOGXServer(ctx, identity, namespace, name)
	if err != nil {
		return nil, err
	}

	deleteModel := &models.OGXServerDeleteResponse{
		Data: "OGXServer deleted successfully",
	}

	return deleteModel, nil
}
