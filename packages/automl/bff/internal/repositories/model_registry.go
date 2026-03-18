package repositories

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/url"

	"github.com/kubeflow/model-registry/pkg/openapi"
	"github.com/opendatahub-io/automl-library/bff/internal/integrations/modelregistry"
	"github.com/opendatahub-io/automl-library/bff/internal/models"
)

const (
	registeredModelsPath = "/registered_models"
	versionsPath         = "versions"
	modelVersionsPath    = "/model_versions"
	artifactsPath        = "artifacts"
)

// ModelRegistryRepository handles Model Registry API operations.
type ModelRegistryRepository struct{}

// NewModelRegistryRepository creates a new ModelRegistryRepository.
func NewModelRegistryRepository() *ModelRegistryRepository {
	return &ModelRegistryRepository{}
}

// RegisterModel creates a RegisteredModel, ModelVersion, and ModelArtifact in sequence,
// linking the artifact to the provided S3 URI.
func (m *ModelRegistryRepository) RegisterModel(
	client modelregistry.HTTPClientInterface,
	req models.RegisterModelRequest,
) (*openapi.ModelArtifact, error) {
	// 1. Create RegisteredModel
	regModelCreate := openapi.RegisteredModelCreate{
		Name: req.ModelName,
	}
	if req.ModelDescription != "" {
		regModelCreate.Description = &req.ModelDescription
	}

	regModelJSON, err := json.Marshal(regModelCreate)
	if err != nil {
		return nil, fmt.Errorf("error marshaling registered model: %w", err)
	}

	regModelResp, err := client.POST(registeredModelsPath, bytes.NewBuffer(regModelJSON))
	if err != nil {
		return nil, fmt.Errorf("error creating registered model: %w", err)
	}

	var regModel openapi.RegisteredModel
	if err := json.Unmarshal(regModelResp, &regModel); err != nil {
		return nil, fmt.Errorf("error decoding registered model response: %w", err)
	}

	regModelID := regModel.GetId()
	if regModelID == "" {
		return nil, fmt.Errorf("registered model created but ID is empty")
	}

	// 2. Create ModelVersion under the RegisteredModel
	versionsURL, err := url.JoinPath(registeredModelsPath, regModelID, versionsPath)
	if err != nil {
		return nil, fmt.Errorf("error building versions path: %w", err)
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
		return nil, fmt.Errorf("error marshaling model version: %w", err)
	}

	versionResp, err := client.POST(versionsURL, bytes.NewBuffer(versionJSON))
	if err != nil {
		return nil, fmt.Errorf("error creating model version: %w", err)
	}

	var modelVersion openapi.ModelVersion
	if err := json.Unmarshal(versionResp, &modelVersion); err != nil {
		return nil, fmt.Errorf("error decoding model version response: %w", err)
	}

	versionID := modelVersion.GetId()
	if versionID == "" {
		return nil, fmt.Errorf("model version created but ID is empty")
	}

	// 3. Create ModelArtifact pointing to the S3 URI
	artifactsURL, err := url.JoinPath(modelVersionsPath, versionID, artifactsPath)
	if err != nil {
		return nil, fmt.Errorf("error building artifacts path: %w", err)
	}

	artifactName := req.ArtifactName
	if artifactName == "" {
		artifactName = req.VersionName
	}

	artifactCreate := openapi.ModelArtifactCreate{
		Name: &artifactName,
		Uri:  &req.S3Path,
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
		return nil, fmt.Errorf("error marshaling model artifact: %w", err)
	}

	artifactResp, err := client.POST(artifactsURL, bytes.NewBuffer(artifactJSON))
	if err != nil {
		return nil, fmt.Errorf("error creating model artifact: %w", err)
	}

	var modelArtifact openapi.ModelArtifact
	if err := json.Unmarshal(artifactResp, &modelArtifact); err != nil {
		return nil, fmt.Errorf("error decoding model artifact response: %w", err)
	}

	return &modelArtifact, nil
}
