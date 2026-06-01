package repositories

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	neturl "net/url"
	"os"
	"strings"

	"github.com/kubeflow/model-registry/pkg/openapi"
	"github.com/opendatahub-io/automl-library/bff/internal/integrations/modelregistry"
	"github.com/opendatahub-io/automl-library/bff/internal/models"
	corek8s "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/kubernetes"
	corepipelines "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/pipelines"
	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	metameta "k8s.io/apimachinery/pkg/api/meta"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
)

// ErrModelRegistryForbidden is returned when the caller lacks permission to list
// ModelRegistry CRs. Handlers check this with errors.Is to return 403.
var ErrModelRegistryForbidden = errors.New("forbidden: cannot list ModelRegistries")

// ErrModelRegistryNotFound is returned when no ModelRegistry CR matches the requested UID.
var ErrModelRegistryNotFound = errors.New("model registry not found")

// ErrModelRegistryNotReady is returned when the matching CR exists but IsReady is false.
var ErrModelRegistryNotReady = errors.New("model registry is not ready")

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

	// modelRegistryServicePort is the HTTPS port of the kube-rbac-proxy deployed in
	// front of every ModelRegistry service by the model-registry-operator.
	modelRegistryServicePort = 8443

	// defaultModelRegistryClusterDomain is the fallback cluster-internal DNS search domain.
	// Override with MODEL_REGISTRY_CLUSTER_DOMAIN env var for non-standard clusters.
	defaultModelRegistryClusterDomain = "svc.cluster.local"

	// defaultModelRegistryRESTAPIPath is the REST API path prefix served by the Model Registry
	// service. Note: this is the Kubeflow Model Registry REST API version (v1alpha3), which is
	// distinct from the modelregistry.opendatahub.io CRD API version (v1beta1) used to list
	// ModelRegistry CRs. Override with MODEL_REGISTRY_REST_API_PATH env var if the operator
	// upgrades the REST API version.
	defaultModelRegistryRESTAPIPath = "/api/model_registry/v1alpha3"
)

// modelRegistryRESTAPIPath returns the REST API path prefix for the Model Registry service,
// reading from MODEL_REGISTRY_REST_API_PATH env var with a default of "/api/model_registry/v1alpha3".
func modelRegistryRESTAPIPath() string {
	if v := os.Getenv("MODEL_REGISTRY_REST_API_PATH"); v != "" {
		return v
	}
	return defaultModelRegistryRESTAPIPath
}

// modelRegistryClusterDomain returns the cluster DNS domain, reading from
// MODEL_REGISTRY_CLUSTER_DOMAIN env var with a default of "svc.cluster.local".
func modelRegistryClusterDomain() string {
	if v := os.Getenv("MODEL_REGISTRY_CLUSTER_DOMAIN"); v != "" {
		return v
	}
	return defaultModelRegistryClusterDomain
}

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

// ModelRegistryRepository handles Model Registry API operations and cluster discovery.
type ModelRegistryRepository struct {
	client           modelregistry.ModelRegistryClientInterface
	k8sService       *corek8s.Service
	pipelinesService *corepipelines.Service
}

// NewModelRegistryRepository creates a new ModelRegistryRepository.
func NewModelRegistryRepository(
	client modelregistry.ModelRegistryClientInterface,
	k8sService *corek8s.Service,
	pipelinesService *corepipelines.Service,
) *ModelRegistryRepository {
	return &ModelRegistryRepository{
		client:           client,
		k8sService:       k8sService,
		pipelinesService: pipelinesService,
	}
}

// buildModelRegistryURI constructs the S3 URI format expected by the Model Registry UI:
// s3://{bucket}/{key}?endpoint={endpoint}&defaultRegion={region}
// The Model Registry UI parses this format back into endpoint, bucket, region, and path
// for display (see model-registry uriToStorageFields).
func buildModelRegistryURI(bucket, key, endpoint, region string) string {
	// Strip leading slashes from the key to avoid double slashes
	key = strings.TrimLeft(key, "/")
	params := neturl.Values{}
	params.Set("endpoint", endpoint)
	if region != "" {
		params.Set("defaultRegion", region)
	}
	return fmt.Sprintf("s3://%s/%s?%s", bucket, key, params.Encode())
}

// RegisterModel creates a RegisteredModel, ModelVersion, and ModelArtifact in sequence.
// The s3_path in the request is a relative S3 object key; the DSPA object storage config
// provides bucket, endpoint, and region to construct the full URI in the format expected
// by the Model Registry UI.
//
// Note: No rollback on partial failure — if step 2 (ModelVersion) or step 3 (ModelArtifact)
// fails, resources created in prior steps remain in the registry. The Model Registry API
// would need DELETE support to implement cleanup; consider manual cleanup of orphaned
// RegisteredModels if failures occur.
// RegisterModel resolves the target registry, discovers DSPA storage, and creates
// a RegisteredModel + ModelVersion + ModelArtifact in sequence. It is the single
// repo call for the register model handler.
func (r *ModelRegistryRepository) RegisterModel(
	ctx context.Context,
	registryUID string,
	req models.RegisterModelRequest,
	namespace string,
) (string, *openapi.ModelArtifact, error) {
	// Resolve registry and get its URL.
	reg, err := r.ResolveModelRegistryByUID(ctx, registryUID, nil)
	if err != nil {
		return "", nil, err
	}
	baseURL := strings.TrimSpace(reg.ExternalURL)
	if baseURL == "" {
		baseURL = strings.TrimSpace(reg.ServerURL)
	}
	if baseURL == "" {
		return "", nil, fmt.Errorf("model registry %q has no usable URL", reg.Name)
	}

	// Discover DSPA object storage for artifact URI construction.
	dspa, err := r.pipelinesService.DiscoverReadyDSPA(ctx, namespace)
	if err != nil {
		return "", nil, fmt.Errorf("failed to discover DSPA in namespace %s: %w", namespace, err)
	}
	if dspa.ObjectStorage == nil {
		return "", nil, fmt.Errorf("DSPA %q in namespace %s has no object storage configured", dspa.Name, namespace)
	}

	// Normalize fields — validation checked for non-blank, now trim for clean API payloads.
	req.S3Path = strings.TrimSpace(req.S3Path)
	req.ModelName = strings.TrimSpace(req.ModelName)
	req.ModelDescription = strings.TrimSpace(req.ModelDescription)
	req.VersionName = strings.TrimSpace(req.VersionName)
	req.VersionDescription = strings.TrimSpace(req.VersionDescription)
	req.ArtifactName = strings.TrimSpace(req.ArtifactName)
	req.ArtifactDescription = strings.TrimSpace(req.ArtifactDescription)
	req.ModelFormatName = strings.TrimSpace(req.ModelFormatName)
	req.ModelFormatVersion = strings.TrimSpace(req.ModelFormatVersion)

	// 1. Create RegisteredModel
	regModelCreate := openapi.RegisteredModelCreate{Name: req.ModelName}
	if req.ModelDescription != "" {
		regModelCreate.Description = &req.ModelDescription
	}
	regModel, err := r.client.CreateRegisteredModel(ctx, baseURL, regModelCreate)
	if err != nil {
		return "", nil, err
	}
	regModelID := regModel.GetId()
	if regModelID == "" {
		return "", nil, fmt.Errorf("registered model created but ID is empty")
	}

	// 2. Create ModelVersion under the RegisteredModel
	versionCreate := openapi.ModelVersionCreate{
		Name:              req.VersionName,
		RegisteredModelId: regModelID,
	}
	if req.VersionDescription != "" {
		versionCreate.Description = &req.VersionDescription
	}
	modelVersion, err := r.client.CreateModelVersion(ctx, baseURL, regModelID, versionCreate)
	if err != nil {
		return "", nil, err
	}
	versionID := modelVersion.GetId()
	if versionID == "" {
		return "", nil, fmt.Errorf("model version created but ID is empty")
	}

	// 3. Create ModelArtifact pointing to the S3 URI
	objectStorage := dspa.ObjectStorage
	if objectStorage.Bucket == "" {
		return "", nil, fmt.Errorf("DSPA %q object storage is missing bucket name — contact your administrator", dspa.Name)
	}
	if objectStorage.EndpointURL == "" {
		return "", nil, fmt.Errorf("DSPA %q object storage is missing endpoint URL — contact your administrator", dspa.Name)
	}
	parsedEndpoint, err := neturl.Parse(objectStorage.EndpointURL)
	if err != nil || parsedEndpoint.Host == "" || (parsedEndpoint.Scheme != "http" && parsedEndpoint.Scheme != "https") {
		return "", nil, fmt.Errorf("DSPA %q object storage has invalid endpoint URL: %s", dspa.Name, objectStorage.EndpointURL)
	}
	artifactURI := buildModelRegistryURI(objectStorage.Bucket, req.S3Path, objectStorage.EndpointURL, objectStorage.Region)

	artifactName := req.ArtifactName
	if artifactName == "" {
		artifactName = req.VersionName
	}
	artifactCreate := openapi.ModelArtifactCreate{
		Name: &artifactName,
		Uri:  &artifactURI,
	}
	if req.ArtifactDescription != "" {
		artifactCreate.Description = &req.ArtifactDescription
	}
	if req.ModelFormatName != "" {
		artifactCreate.ModelFormatName = &req.ModelFormatName
	}
	if req.ModelFormatVersion != "" {
		artifactCreate.ModelFormatVersion = &req.ModelFormatVersion
	}
	modelArtifact, err := r.client.CreateModelArtifact(ctx, baseURL, versionID, artifactCreate)
	if err != nil {
		return "", nil, err
	}

	return regModelID, modelArtifact, nil
}

// ResolveModelRegistryByUID lists ModelRegistry CRs visible to the caller and returns the one
// whose ID matches registryUID. The registry must be ready (Available=True).
func (r *ModelRegistryRepository) ResolveModelRegistryByUID(
	ctx context.Context,
	registryUID string,
	logger *slog.Logger,
) (*models.ModelRegistry, error) {
	data, err := r.ListModelRegistries(ctx, logger)
	if err != nil {
		return nil, err
	}
	uid := strings.TrimSpace(registryUID)
	for i := range data.ModelRegistries {
		if data.ModelRegistries[i].ID != uid {
			continue
		}
		if !data.ModelRegistries[i].IsReady {
			return nil, ErrModelRegistryNotReady
		}
		return &data.ModelRegistries[i], nil
	}
	return nil, ErrModelRegistryNotFound
}

// ListModelRegistries lists all ModelRegistry instance CRs in the model registries namespace.
// Uses modelregistry.opendatahub.io/v1beta1 which represents individual user-created registries.
// Returns ErrModelRegistryForbidden when the caller lacks RBAC permission.
// Returns an empty list (not an error) when the ModelRegistry CRD is not installed.
//
// Authorization: the autox-core K8sService scopes the request to the calling user's identity
// from context — Bearer token for user_token auth, SA impersonation for internal auth.
func (r *ModelRegistryRepository) ListModelRegistries(
	ctx context.Context,
	logger *slog.Logger,
) (*models.ModelRegistriesData, error) {
	// All ModelRegistry instance CRs live in the operator-managed registries namespace.
	// Identity is extracted from context by the autox-core K8s client automatically.
	unstructuredList, err := r.k8sService.ListResources(ctx, modelRegistryGVR, modelRegistriesNamespace)
	if err != nil {
		// CRD not installed: metameta.IsNoMatchError covers NoKindMatchError and
		// NoResourceMatchError, which the dynamic client returns when the resource
		// type is unknown. Return an empty list rather than an error.
		if metameta.IsNoMatchError(err) || k8serrors.IsNotFound(err) {
			logger.Debug("ModelRegistry CRD not found on this cluster, returning empty list")
			return &models.ModelRegistriesData{ModelRegistries: []models.ModelRegistry{}}, nil
		}
		if k8serrors.IsForbidden(err) {
			// Join sentinel with original so errors.Is(err, ErrModelRegistryForbidden)
			// succeeds in the handler while the API server message is retained for logs.
			return nil, errors.Join(ErrModelRegistryForbidden, err)
		}
		return nil, fmt.Errorf("failed to list ModelRegistries: %w", err)
	}

	registries := make([]models.ModelRegistry, 0, len(unstructuredList.Items))
	for _, item := range unstructuredList.Items {
		var cr modelRegistryCR
		if err := runtime.DefaultUnstructuredConverter.FromUnstructured(item.Object, &cr); err != nil {
			logger.Warn("Failed to convert ModelRegistry item, skipping",
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
	// Short forms injected by the operator that are not external routes.
	shortForm := fmt.Sprintf("%s.%s", name, modelRegistriesNamespace)
	for _, host := range hosts {
		// Classify the host.
		// Internal: contains ".svc." or ".cluster.local" (cluster-DNS FQDN).
		// External: not internal, not a short form (bare name or name.namespace),
		//           and contains no spaces — avoids hardcoding platform-specific
		//           suffixes like ".apps." that do not apply outside OpenShift.
		isInternal := strings.Contains(host, ".svc.") || strings.Contains(host, ".cluster.local")
		isExternal := !isInternal && host != name && host != shortForm && !strings.Contains(host, " ")

		if isInternal && serverURL == "" {
			serverURL = fmt.Sprintf("https://%s:%d%s", host, modelRegistryServicePort, modelRegistryRESTAPIPath())
		} else if isExternal && externalURL == "" {
			externalURL = fmt.Sprintf("https://%s%s", host, modelRegistryRESTAPIPath())
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
			modelRegistryClusterDomain(),
			modelRegistryServicePort,
			modelRegistryRESTAPIPath(),
		)
	}

	return serverURL, externalURL
}
