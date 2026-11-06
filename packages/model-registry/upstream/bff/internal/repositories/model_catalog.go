package repositories

import (
	"context"
	"fmt"

	k8s "github.com/kubeflow/hub/ui/bff/internal/integrations/kubernetes"
	"github.com/kubeflow/hub/ui/bff/internal/models"
)

const (
	ModelCatalogServiceName      = "model-catalog"
	ModelCatalogAPIPath          = "/api/model_catalog/v1alpha1"
	ModelCatalogV1APIPath        = "/api/model_catalog/v1"
	McpCatalogAPIPath            = "/api/mcp_catalog/v1alpha1"
	AgentCatalogAPIPath          = "/api/agent_catalog/v1alpha1"
	ServingRuntimeCatalogAPIPath = "/api/serving_runtime_catalog/v1"
)

type ModelCatalogRepository struct {
}

func NewCatalogRepository() *ModelCatalogRepository {
	return &ModelCatalogRepository{}
}

func (m *ModelCatalogRepository) GetModelCatalog(sessionCtx context.Context, client k8s.KubernetesClientInterface, namespace string) (models.ModelCatalogModel, error) {

	s, err := client.GetServiceDetailsByName(sessionCtx, namespace, ModelCatalogServiceName, k8s.ComponentLabelValueCatalog)
	if err != nil {
		return models.ModelCatalogModel{}, fmt.Errorf("error fetching model catalog: %w", err)
	}

	// Resolve the catalog via its in-cluster service DNS name rather than s.ClusterIP
	// or s.ExternalAddressRest. Routing through the external address can hairpin
	// through an external NLB and be silently dropped on some platforms (e.g. ROSA
	// HCP), so those fields are intentionally not used for address resolution here
	// (RHOAIENG-101859). Fall back to a namespace-scoped .svc name for older clients
	// that do not populate ServiceDNSName.
	serviceHost := s.ServiceDNSName
	if serviceHost == "" {
		serviceHost = fmt.Sprintf("%s.%s.svc", ModelCatalogServiceName, namespace)
	}
	modelCatalog := models.ModelCatalogModel{
		Name:          s.Name,
		Description:   s.Description,
		DisplayName:   s.DisplayName,
		ServerAddress: m.ResolveServerAddress(serviceHost, s.HTTPPort, s.IsHTTPS, ModelCatalogAPIPath),
		IsHTTPS:       s.IsHTTPS,
	}
	return modelCatalog, nil
}

func (m *ModelCatalogRepository) ResolveServerAddress(host string, port int32, isHTTPS bool, apiPath string) string {
	protocol := "http"
	if isHTTPS {
		protocol = "https"
	}
	return fmt.Sprintf("%s://%s:%d%s", protocol, host, port, apiPath)
}
