package repositories

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	neturl "net/url"
	"os"
	"strings"

	"github.com/kubeflow/model-registry/pkg/openapi"
	k8s "github.com/opendatahub-io/automl-library/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/automl-library/bff/internal/integrations/modelregistry"
	"github.com/opendatahub-io/automl-library/bff/internal/models"
	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	metameta "k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/rest"
)

const (
	registeredModelsPath = "/registered_models"
	versionsPath         = "versions"
	modelVersionsPath    = "/model_versions"
	artifactsPath        = "artifacts"

	// Default artifact type for Model Registry model-artifact resources.
	defaultModelArtifactType = "model-artifact"
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
type ModelRegistryRepository struct{}

// NewModelRegistryRepository creates a new ModelRegistryRepository.
func NewModelRegistryRepository() *ModelRegistryRepository {
	return &ModelRegistryRepository{}
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
func (r *ModelRegistryRepository) RegisterModel(
	ctx context.Context,
	client modelregistry.HTTPClientInterface,
	req models.RegisterModelRequest,
	dspaStorage *models.DSPAObjectStorage,
) (string, *openapi.ModelArtifact, error) {
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
	regModelCreate := openapi.RegisteredModelCreate{
		Name: req.ModelName,
	}
	if req.ModelDescription != "" {
		regModelCreate.Description = &req.ModelDescription
	}

	regModelJSON, err := json.Marshal(regModelCreate)
	if err != nil {
		return "", nil, fmt.Errorf("error marshaling registered model: %w", err)
	}

	regModelResp, err := client.POST(ctx, registeredModelsPath, bytes.NewBuffer(regModelJSON))
	if err != nil {
		return "", nil, fmt.Errorf("error creating registered model: %w", err)
	}

	var regModel openapi.RegisteredModel
	if err := json.Unmarshal(regModelResp, &regModel); err != nil {
		return "", nil, fmt.Errorf("error decoding registered model response: %w", err)
	}

	regModelID := regModel.GetId()
	if regModelID == "" {
		return "", nil, fmt.Errorf("registered model created but ID is empty")
	}

	// 2. Create ModelVersion under the RegisteredModel
	versionsURL, err := neturl.JoinPath(registeredModelsPath, regModelID, versionsPath)
	if err != nil {
		return "", nil, fmt.Errorf("error building versions path: %w", err)
	}

	versionCreate := openapi.ModelVersionCreate{
		Name:              req.VersionName,
		RegisteredModelId: regModelID,
	}
	if req.VersionDescription != "" {
		versionCreate.Description = &req.VersionDescription
	}

	versionJSON, err := json.Marshal(versionCreate)
	if err != nil {
		return "", nil, fmt.Errorf("error marshaling model version: %w", err)
	}

	versionResp, err := client.POST(ctx, versionsURL, bytes.NewBuffer(versionJSON))
	if err != nil {
		return "", nil, fmt.Errorf("error creating model version: %w", err)
	}

	var modelVersion openapi.ModelVersion
	if err := json.Unmarshal(versionResp, &modelVersion); err != nil {
		return "", nil, fmt.Errorf("error decoding model version response: %w", err)
	}

	versionID := modelVersion.GetId()
	if versionID == "" {
		return "", nil, fmt.Errorf("model version created but ID is empty")
	}

	// 3. Create ModelArtifact pointing to the S3 URI
	artifactsURL, err := neturl.JoinPath(modelVersionsPath, versionID, artifactsPath)
	if err != nil {
		return "", nil, fmt.Errorf("error building artifacts path: %w", err)
	}

	artifactName := req.ArtifactName
	if artifactName == "" {
		artifactName = req.VersionName
	}

	// Build the full S3 URI in the format the Model Registry UI expects:
	// s3://{bucket}/{key}?endpoint={endpoint}&defaultRegion={region}
	if dspaStorage == nil {
		return "", nil, fmt.Errorf("DSPA object storage config is required to construct the artifact URI")
	}
	if dspaStorage.Bucket == "" {
		return "", nil, fmt.Errorf("DSPA object storage config is missing bucket name")
	}
	if dspaStorage.EndpointURL == "" {
		return "", nil, fmt.Errorf("DSPA object storage config is missing endpoint URL")
	}
	parsedEndpoint, err := neturl.Parse(dspaStorage.EndpointURL)
	if err != nil || parsedEndpoint.Host == "" || (parsedEndpoint.Scheme != "http" && parsedEndpoint.Scheme != "https") {
		return "", nil, fmt.Errorf("DSPA object storage config has invalid endpoint URL: %s", dspaStorage.EndpointURL)
	}
	artifactURI := buildModelRegistryURI(dspaStorage.Bucket, req.S3Path, dspaStorage.EndpointURL, dspaStorage.Region)

	artifactType := defaultModelArtifactType
	artifactCreate := openapi.ModelArtifactCreate{
		Name:         &artifactName,
		Uri:          &artifactURI,
		ArtifactType: &artifactType,
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

	artifactJSON, err := json.Marshal(artifactCreate)
	if err != nil {
		return "", nil, fmt.Errorf("error marshaling model artifact: %w", err)
	}

	artifactResp, err := client.POST(ctx, artifactsURL, bytes.NewBuffer(artifactJSON))
	if err != nil {
		return "", nil, fmt.Errorf("error creating model artifact: %w", err)
	}

	var modelArtifact openapi.ModelArtifact
	if err := json.Unmarshal(artifactResp, &modelArtifact); err != nil {
		return "", nil, fmt.Errorf("error decoding model artifact response: %w", err)
	}

	return regModelID, &modelArtifact, nil
}

// ResolveModelRegistryByUID lists ModelRegistry CRs visible to the caller and returns the one
// whose ID matches registryUID. The registry must be ready (Available=True).
func (r *ModelRegistryRepository) ResolveModelRegistryByUID(
	ctx context.Context,
	client k8s.KubernetesClientInterface,
	identity *k8s.RequestIdentity,
	mockK8Client bool,
	registryUID string,
	logger *slog.Logger,
) (*models.ModelRegistry, error) {
	data, err := r.ListModelRegistries(ctx, client, identity, mockK8Client, logger)
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
// Uses modelregistry.opendatahub.io/v1beta1 which represents individual user-created registries
// (distinct from the platform-level components.platform.opendatahub.io operator config CR).
// In mock mode, realistic test fixtures are returned without touching the cluster.
// Returns ErrModelRegistryForbidden when the caller lacks RBAC permission.
// Returns an empty list (not an error) when the ModelRegistry CRD is not installed.
//
// Authorization: the dynamic client is scoped to the requesting user's identity.
// For user_token auth the user's Bearer token is used directly; for internal
// (SA) auth the SA impersonates the requesting user so RBAC is evaluated against
// that user rather than the service account.
func (r *ModelRegistryRepository) ListModelRegistries(
	ctx context.Context,
	client k8s.KubernetesClientInterface,
	identity *k8s.RequestIdentity,
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

	// Scope the dynamic client to the requesting user so RBAC is evaluated against
	// their permissions, not the service account's.
	userConfig := rest.CopyConfig(restConfig)
	if identity != nil {
		if identity.Token != "" {
			// user_token auth: the identity already carries the user's Bearer token;
			// use it directly instead of the SA token in the base config.
			userConfig.BearerToken = identity.Token
			userConfig.BearerTokenFile = ""
			userConfig.Impersonate = rest.ImpersonationConfig{}
		} else if identity.UserID != "" {
			// internal auth: impersonate the requesting user so K8s enforces their RBAC.
			userConfig.Impersonate = rest.ImpersonationConfig{
				UserName: identity.UserID,
				Groups:   identity.Groups,
			}
		}
	}
	// Clear client certificates to prevent credential leakage across user boundaries
	userConfig.CertData = nil
	userConfig.CertFile = ""
	userConfig.KeyData = nil
	userConfig.KeyFile = ""

	dynamicClient, err := dynamic.NewForConfig(userConfig)
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
				ExternalURL: "https://default-modelregistry-rest.apps.example.com/api/model_registry/v1alpha3",
			},
			{
				ID:          "b2c3d4e5-f6a7-8901-bcde-222222222222",
				Name:        "team-modelregistry",
				DisplayName: "Team Model Registry",
				Description: "Dedicated model registry for the ML team",
				IsReady:     true,
				ServerURL:   "https://team-modelregistry.rhoai-model-registries.svc.cluster.local:8443/api/model_registry/v1alpha3",
				ExternalURL: "https://team-modelregistry-rest.apps.example.com/api/model_registry/v1alpha3",
			},
		},
	}
}
