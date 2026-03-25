package repositories

import (
	"context"
	"encoding/json"
	"fmt"

	k8s "github.com/opendatahub-io/automl-library/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/automl-library/bff/internal/models"
	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/dynamic"
)

const (
	modelRegistryGroup    = "modelregistry.opendatahub.io"
	modelRegistryVersion  = "v1alpha1"
	modelRegistryResource = "modelregistries"

	// modelRegistryAPIPath is the REST API path prefix used by the Model Registry service.
	modelRegistryAPIPath = "/api/model_registry/v1alpha3"

	// modelRegistryServicePort is the HTTPS port exposed by the auth proxy in front of each registry.
	modelRegistryServicePort = 8443
)

var modelRegistryGVR = schema.GroupVersionResource{
	Group:    modelRegistryGroup,
	Version:  modelRegistryVersion,
	Resource: modelRegistryResource,
}

// modelRegistryCR is an intermediate struct for unmarshalling the relevant fields
// of a ModelRegistry custom resource.
type modelRegistryCR struct {
	Metadata struct {
		Name        string            `json:"name"`
		UID         string            `json:"uid"`
		Annotations map[string]string `json:"annotations"`
	} `json:"metadata"`
	Status struct {
		Phase              string `json:"phase"`
		RegistriesNamespace string `json:"registriesNamespace"`
		Conditions         []struct {
			Type   string `json:"type"`
			Status string `json:"status"`
		} `json:"conditions"`
	} `json:"status"`
}

// ModelRegistryRepository handles listing ModelRegistry CRs from the cluster.
type ModelRegistryRepository struct{}

func NewModelRegistryRepository() *ModelRegistryRepository {
	return &ModelRegistryRepository{}
}

// ListModelRegistries lists all ModelRegistry CRs visible to the caller.
// ModelRegistry CRs are cluster-scoped, so no namespace filter is applied.
// In mock mode, realistic test fixtures are returned without touching the cluster.
func (r *ModelRegistryRepository) ListModelRegistries(
	ctx context.Context,
	client k8s.KubernetesClientInterface,
	mockK8Client bool,
) (*models.ModelRegistriesData, error) {
	if mockK8Client {
		return getMockModelRegistries(), nil
	}

	restConfig := client.GetRestConfig()
	if restConfig == nil {
		return nil, fmt.Errorf("failed to get rest.Config from kubernetes client")
	}

	dynamicClient, err := dynamic.NewForConfig(restConfig)
	if err != nil {
		return nil, fmt.Errorf("failed to create dynamic client: %w", err)
	}

	// ModelRegistry CRs are cluster-scoped — no namespace qualifier.
	unstructuredList, err := dynamicClient.Resource(modelRegistryGVR).List(ctx, metav1.ListOptions{})
	if err != nil {
		if k8serrors.IsNotFound(err) || k8serrors.IsMethodNotSupported(err) {
			// CRD not installed on this cluster — return empty list rather than an error.
			return &models.ModelRegistriesData{ModelRegistries: []models.ModelRegistry{}}, nil
		}
		if k8serrors.IsForbidden(err) {
			return nil, fmt.Errorf("forbidden: cannot list ModelRegistries")
		}
		return nil, fmt.Errorf("failed to list ModelRegistries: %w", err)
	}

	registries := make([]models.ModelRegistry, 0, len(unstructuredList.Items))
	for _, item := range unstructuredList.Items {
		rawJSON, err := item.MarshalJSON()
		if err != nil {
			continue
		}

		var cr modelRegistryCR
		if err := json.Unmarshal(rawJSON, &cr); err != nil {
			continue
		}

		displayName := cr.Metadata.Annotations["openshift.io/display-name"]
		if displayName == "" {
			displayName = cr.Metadata.Name
		}
		description := cr.Metadata.Annotations["openshift.io/description"]

		isReady := cr.Status.Phase == "Ready"
		for _, cond := range cr.Status.Conditions {
			if cond.Type == "Ready" && cond.Status == "True" {
				isReady = true
				break
			}
		}

		registriesNamespace := cr.Status.RegistriesNamespace
		if registriesNamespace == "" {
			registriesNamespace = "rhoai-model-registries"
		}

		serverURL := fmt.Sprintf(
			"https://%s.%s.svc.cluster.local:%d%s",
			cr.Metadata.Name,
			registriesNamespace,
			modelRegistryServicePort,
			modelRegistryAPIPath,
		)

		registries = append(registries, models.ModelRegistry{
			ID:          cr.Metadata.UID,
			Name:        cr.Metadata.Name,
			DisplayName: displayName,
			Description: description,
			IsReady:     isReady,
			ServerURL:   serverURL,
		})
	}

	return &models.ModelRegistriesData{ModelRegistries: registries}, nil
}

// getMockModelRegistries returns realistic mock data for development and testing.
func getMockModelRegistries() *models.ModelRegistriesData {
	return &models.ModelRegistriesData{
		ModelRegistries: []models.ModelRegistry{
			{
				ID:          "a1b2c3d4-e5f6-7890-abcd-111111111111",
				Name:        "default-modelregistry",
				DisplayName: "Default Model Registry",
				Description: "Default shared model registry for the organization",
				IsReady:     true,
				ServerURL:   "https://default-modelregistry.rhoai-model-registries.svc.cluster.local:8443/api/model_registry/v1alpha3",
			},
			{
				ID:          "b2c3d4e5-f6a7-8901-bcde-222222222222",
				Name:        "team-modelregistry",
				DisplayName: "Team Model Registry",
				Description: "Dedicated model registry for the ML team",
				IsReady:     true,
				ServerURL:   "https://team-modelregistry.rhoai-model-registries.svc.cluster.local:8443/api/model_registry/v1alpha3",
			},
		},
	}
}
