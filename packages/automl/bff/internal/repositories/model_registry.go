package repositories

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"strings"

	k8s "github.com/opendatahub-io/automl-library/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/automl-library/bff/internal/models"
	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	metameta "k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/dynamic"
)

// ErrModelRegistryForbidden is returned when the caller lacks permission to list
// ModelRegistry CRs. Handlers check this with errors.Is to return 403.
var ErrModelRegistryForbidden = errors.New("forbidden: cannot list ModelRegistries")

const (
	// modelRegistryGroup/Version/Resource identify individual ModelRegistry instance CRs.
	//
	// Note: two separate CRDs share the "modelregistries" resource name:
	//   - components.platform.opendatahub.io/v1alpha1 — cluster-scoped RHOAI operator
	//     configuration CR (one per cluster, controls where to deploy registries).
	//   - modelregistry.opendatahub.io/v1beta1 — individual registry instances created
	//     by admins via the RHOAI dashboard. Conceptually global (all registries are
	//     accessible across projects), but stored in modelRegistriesNamespace by the
	//     model-registry-operator.
	// We list the latter to discover user-created registry instances.
	modelRegistryGroup    = "modelregistry.opendatahub.io"
	modelRegistryVersion  = "v1beta1"
	modelRegistryResource = "modelregistries"

	// modelRegistriesNamespace is the operator-managed namespace where all ModelRegistry
	// instance CRs and their backing services are deployed. Registries are presented as
	// global in the RHOAI UX; this namespace is their physical home on the cluster.
	modelRegistriesNamespace = "rhoai-model-registries"

	// modelRegistryAPIPath is the REST API path prefix served by the Model Registry.
	// NOTE: this reflects v1beta1 of the Kubeflow Model Registry REST API. If the
	// operator upgrades the REST API version this constant must be updated accordingly.
	modelRegistryAPIPath = "/api/model_registry/v1beta1"

	// modelRegistryServicePort is the HTTPS port of the kube-rbac-proxy deployed in
	// front of every ModelRegistry service by the model-registry-operator.
	modelRegistryServicePort = 8443

	// modelRegistryClusterDomain is the cluster-internal DNS search domain used to
	// construct in-cluster service URLs. Clusters with a non-default search domain
	// will need this adjusted.
	modelRegistryClusterDomain = "svc.cluster.local"
)

var modelRegistryGVR = schema.GroupVersionResource{
	Group:    modelRegistryGroup,
	Version:  modelRegistryVersion,
	Resource: modelRegistryResource,
}

// modelRegistryCR is an intermediate struct for unmarshalling the relevant fields
// of a modelregistry.opendatahub.io/v1beta1 ModelRegistry CR.
type modelRegistryCR struct {
	Metadata struct {
		Name        string            `json:"name"`
		Namespace   string            `json:"namespace"`
		UID         string            `json:"uid"`
		Annotations map[string]string `json:"annotations"`
	} `json:"metadata"`
	Status struct {
		// The v1beta1 CRD reports readiness via conditions.
		// Available=True indicates the registry service is ready to serve requests.
		Conditions []struct {
			Type   string `json:"type"`
			Status string `json:"status"`
		} `json:"conditions"`
		// Hosts contains all valid hostnames for this registry as set by the operator:
		//   [0] external Route hostname (if serviceRoute enabled)
		//   [1] full in-cluster FQDN  (e.g. name.namespace.svc.cluster.local)
		//   [2] short in-cluster name (e.g. name.namespace)
		//   [3] minimal short name    (e.g. name)
		// Using the operator-provided hosts avoids constructing URLs with hardcoded
		// cluster domain assumptions.
		Hosts []string `json:"hosts"`
	} `json:"status"`
}

// ModelRegistryRepository handles listing ModelRegistry CRs from the cluster.
type ModelRegistryRepository struct{}

func NewModelRegistryRepository() *ModelRegistryRepository {
	return &ModelRegistryRepository{}
}

// ListModelRegistries lists all ModelRegistry instance CRs in the model registries namespace.
// Uses modelregistry.opendatahub.io/v1beta1 which represents individual user-created registries
// (distinct from the platform-level components.platform.opendatahub.io operator config CR).
// In mock mode, realistic test fixtures are returned without touching the cluster.
// Returns ErrModelRegistryForbidden when the caller lacks RBAC permission.
// Returns an empty list (not an error) when the ModelRegistry CRD is not installed.
func (r *ModelRegistryRepository) ListModelRegistries(
	ctx context.Context,
	client k8s.KubernetesClientInterface,
	mockK8Client bool,
	logger *slog.Logger,
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

	// All ModelRegistry instance CRs live in the operator-managed registries namespace.
	unstructuredList, err := dynamicClient.Resource(modelRegistryGVR).
		Namespace(modelRegistriesNamespace).
		List(ctx, metav1.ListOptions{})
	if err != nil {
		// CRD not installed: metameta.IsNoMatchError covers NoKindMatchError and
		// NoResourceMatchError, which the dynamic client returns when the resource
		// type is unknown. Return an empty list rather than an error.
		if metameta.IsNoMatchError(err) || k8serrors.IsNotFound(err) {
			logger.Debug("ModelRegistry CRD not found on this cluster, returning empty list")
			return &models.ModelRegistriesData{ModelRegistries: []models.ModelRegistry{}}, nil
		}
		if k8serrors.IsForbidden(err) {
			return nil, ErrModelRegistryForbidden
		}
		return nil, fmt.Errorf("failed to list ModelRegistries: %w", err)
	}

	registries := make([]models.ModelRegistry, 0, len(unstructuredList.Items))
	for _, item := range unstructuredList.Items {
		rawJSON, err := item.MarshalJSON()
		if err != nil {
			logger.Warn("Failed to marshal ModelRegistry item, skipping",
				"name", item.GetName(),
				"uid", item.GetUID(),
				"error", err)
			continue
		}

		var cr modelRegistryCR
		if err := json.Unmarshal(rawJSON, &cr); err != nil {
			logger.Warn("Failed to unmarshal ModelRegistry item, skipping",
				"name", item.GetName(),
				"uid", item.GetUID(),
				"error", err)
			continue
		}

		displayName := cr.Metadata.Annotations["openshift.io/display-name"]
		if displayName == "" {
			displayName = cr.Metadata.Name
		}
		description := cr.Metadata.Annotations["openshift.io/description"]

		// The v1beta1 CRD reports readiness via the Available condition.
		isReady := false
		for _, cond := range cr.Status.Conditions {
			if cond.Type == "Available" && cond.Status == "True" {
				isReady = true
				break
			}
		}

		// Derive server and external URLs from status.hosts, which the operator populates
		// with all valid hostnames. This avoids hardcoding the cluster DNS domain.
		// Expected order: [external-route, full-fqdn, short-fqdn, minimal-name]
		serverURL, externalURL := buildRegistryURLs(cr.Metadata.Name, cr.Status.Hosts, logger)

		registries = append(registries, models.ModelRegistry{
			ID:          cr.Metadata.UID,
			Name:        cr.Metadata.Name,
			DisplayName: displayName,
			Description: description,
			IsReady:     isReady,
			ServerURL:   serverURL,
			ExternalURL: externalURL,
		})
	}

	return &models.ModelRegistriesData{ModelRegistries: registries}, nil
}

// buildRegistryURLs derives the in-cluster server URL and optional external URL from
// the operator-populated status.hosts slice. The operator sets hosts in this order:
//
//	[0] external Route hostname (present only when serviceRoute is enabled)
//	[1] full in-cluster FQDN   (name.namespace.svc.cluster.local)
//	[2] short in-cluster name  (name.namespace)
//	[3] minimal short name     (name)
//
// We prefer the full in-cluster FQDN for serverURL and the Route hostname for externalURL.
// When status.hosts is absent or empty we fall back to constructing the in-cluster URL
// from the service name and the standard registries namespace.
func buildRegistryURLs(name string, hosts []string, logger *slog.Logger) (serverURL, externalURL string) {
	// Identify the full in-cluster FQDN (contains "svc.cluster") and the external
	// Route host (ends in ".apps." or is the first non-svc entry).
	for _, host := range hosts {
		if strings.Contains(host, ".svc.") && serverURL == "" {
			serverURL = fmt.Sprintf("https://%s:%d%s", host, modelRegistryServicePort, modelRegistryAPIPath)
		} else if !strings.Contains(host, ".svc.") && !strings.Contains(host, " ") &&
			strings.Contains(host, ".") && externalURL == "" {
			// The external route hostname contains dots and is not a cluster-local address.
			externalURL = fmt.Sprintf("https://%s%s", host, modelRegistryAPIPath)
		}
	}

	// Fall back to constructing the in-cluster URL if status.hosts was not populated
	// (e.g. the CR was just created and the operator has not yet reconciled).
	if serverURL == "" {
		logger.Warn("ModelRegistry status.hosts is empty, constructing fallback in-cluster URL",
			"name", name)
		serverURL = fmt.Sprintf(
			"https://%s.%s.%s:%d%s",
			name,
			modelRegistriesNamespace,
			modelRegistryClusterDomain,
			modelRegistryServicePort,
			modelRegistryAPIPath,
		)
	}

	return serverURL, externalURL
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
				ServerURL:   "https://default-modelregistry.rhoai-model-registries.svc.cluster.local:8443/api/model_registry/v1beta1",
				ExternalURL: "https://default-modelregistry-rest.apps.example.com/api/model_registry/v1beta1",
			},
			{
				ID:          "b2c3d4e5-f6a7-8901-bcde-222222222222",
				Name:        "team-modelregistry",
				DisplayName: "Team Model Registry",
				Description: "Dedicated model registry for the ML team",
				IsReady:     true,
				ServerURL:   "https://team-modelregistry.rhoai-model-registries.svc.cluster.local:8443/api/model_registry/v1beta1",
				ExternalURL: "https://team-modelregistry-rest.apps.example.com/api/model_registry/v1beta1",
			},
		},
	}
}
