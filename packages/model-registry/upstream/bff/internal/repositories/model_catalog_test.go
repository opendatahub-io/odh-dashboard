package repositories

import (
	"context"

	k8s "github.com/kubeflow/hub/ui/bff/internal/integrations/kubernetes"
	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
)

type modelCatalogKubernetesClient struct {
	k8s.KubernetesClientInterface
	serviceDetails k8s.ServiceDetails
}

func (client *modelCatalogKubernetesClient) GetServiceDetailsByName(sessionCtx context.Context, namespace string, serviceName string, serviceType string) (k8s.ServiceDetails, error) {
	return client.serviceDetails, nil
}

var _ = Describe("ModelCatalogRepository", func() {
	It("uses the in-cluster service address in federated mode", func() {
		client := &modelCatalogKubernetesClient{
			serviceDetails: k8s.ServiceDetails{
				Name:                "model-catalog",
				ClusterIP:           "10.0.0.15",
				ServiceDNSName:      "model-catalog.rhoai-model-registries.svc",
				HTTPPort:            8443,
				IsHTTPS:             true,
				ExternalAddressRest: "rh-ai.apps.example.com/catalog",
			},
		}

		modelCatalog, err := NewCatalogRepository().GetModelCatalog(ctx, client, "rhoai-model-registries")

		Expect(err).NotTo(HaveOccurred())
		Expect(modelCatalog.ServerAddress).To(Equal("https://model-catalog.rhoai-model-registries.svc:8443/api/model_catalog/v1alpha1"))
	})

	It("resolves all catalog API paths", func() {
		repository := NewCatalogRepository()

		Expect(repository.ResolveServerAddress("model-catalog.test.svc.cluster.local", 8443, true, ModelCatalogAPIPath)).
			To(Equal("https://model-catalog.test.svc.cluster.local:8443/api/model_catalog/v1alpha1"))
		Expect(repository.ResolveServerAddress("model-catalog.test.svc.cluster.local", 8443, true, McpCatalogAPIPath)).
			To(Equal("https://model-catalog.test.svc.cluster.local:8443/api/mcp_catalog/v1alpha1"))
		Expect(repository.ResolveServerAddress("model-catalog.test.svc.cluster.local", 8443, true, AgentCatalogAPIPath)).
			To(Equal("https://model-catalog.test.svc.cluster.local:8443/api/agent_catalog/v1alpha1"))
	})

	It("falls back to the portable service DNS suffix", func() {
		client := &modelCatalogKubernetesClient{
			serviceDetails: k8s.ServiceDetails{
				Name:     "model-catalog",
				HTTPPort: 8443,
				IsHTTPS:  true,
			},
		}

		modelCatalog, err := NewCatalogRepository().GetModelCatalog(ctx, client, "rhoai-model-registries")

		Expect(err).NotTo(HaveOccurred())
		Expect(modelCatalog.ServerAddress).To(Equal("https://model-catalog.rhoai-model-registries.svc:8443/api/model_catalog/v1alpha1"))
	})
})
