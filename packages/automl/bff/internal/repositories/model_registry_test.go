package repositories

import (
	"context"
	"io"
	"log/slog"
	"testing"

	k8s "github.com/opendatahub-io/automl-library/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/automl-library/bff/internal/integrations/modelregistry"
	"github.com/opendatahub-io/automl-library/bff/internal/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

const mockDefaultModelRegistryUID = "a1b2c3d4-e5f6-7890-abcd-111111111111"

var testDSPAStorage = &models.DSPAObjectStorage{
	Bucket:      "my-bucket",
	EndpointURL: "https://s3.amazonaws.com",
	Region:      "us-east-1",
	SecretName:  "my-secret",
}

func TestModelRegistryRepository_RegisterModel(t *testing.T) {
	repo := NewModelRegistryRepository()

	t.Run("creates registered model, version, and artifact in sequence", func(t *testing.T) {
		req := models.RegisterModelRequest{
			S3Path:             "pipeline/run/models/model.bin",
			ModelName:          "automl-model",
			ModelDescription:   "AutoML trained model",
			VersionName:        "v1",
			VersionDescription: "Initial version",
			ArtifactName:       "model-artifact",
			ModelFormatName:    "onnx",
		}
		expectedURI := "s3://my-bucket/pipeline/run/models/model.bin?defaultRegion=us-east-1&endpoint=https%3A%2F%2Fs3.amazonaws.com"
		mockClient := modelregistry.NewSuccessMockClient(req.ModelName, req.VersionName, req.ArtifactName, expectedURI)

		regModelID, artifact, err := repo.RegisterModel(context.Background(), mockClient, req, testDSPAStorage)

		assert.NoError(t, err)
		assert.NotEmpty(t, regModelID)
		assert.NotNil(t, artifact)
		assert.NotEmpty(t, artifact.GetId())
		assert.Equal(t, req.ArtifactName, artifact.GetName())
		assert.Equal(t, expectedURI, artifact.GetUri())

		assert.Equal(t, 3, mockClient.PostCallCount)
		mockClient.AssertRegisterModelFlow(t, req.ModelName)
	})

	t.Run("uses version name as artifact name when artifact_name is empty", func(t *testing.T) {
		req := models.RegisterModelRequest{
			S3Path:      "path/to/model",
			ModelName:   "my-model",
			VersionName: "v2",
		}
		expectedURI := "s3://my-bucket/path/to/model?defaultRegion=us-east-1&endpoint=https%3A%2F%2Fs3.amazonaws.com"
		mockClient := modelregistry.NewSuccessMockClient(req.ModelName, req.VersionName, req.ArtifactName, expectedURI)

		_, artifact, err := repo.RegisterModel(context.Background(), mockClient, req, testDSPAStorage)

		assert.NoError(t, err)
		assert.NotNil(t, artifact)
		assert.Equal(t, "v2", artifact.GetName())
	})

	t.Run("propagates HTTP error from model registry API", func(t *testing.T) {
		req := models.RegisterModelRequest{
			S3Path:      "path/to/model",
			ModelName:   "my-model",
			VersionName: "v1",
		}
		mockClient := modelregistry.NewFailingMockClient(409, "409", "model name already exists")

		_, artifact, err := repo.RegisterModel(context.Background(), mockClient, req, testDSPAStorage)

		assert.Error(t, err)
		assert.Nil(t, artifact)
		var httpErr *modelregistry.HTTPError
		assert.True(t, assert.ErrorAs(t, err, &httpErr))
		assert.Equal(t, 409, httpErr.StatusCode)
		assert.Contains(t, httpErr.Message, "already exists")
	})

	t.Run("propagates error when first POST fails", func(t *testing.T) {
		req := models.RegisterModelRequest{
			S3Path:      "path/to/model",
			ModelName:   "my-model",
			VersionName: "v1",
		}
		mockClient := modelregistry.NewFailingMockClient(503, "503", "service unavailable")

		_, _, err := repo.RegisterModel(context.Background(), mockClient, req, testDSPAStorage)

		assert.Error(t, err)
		assert.Equal(t, 1, mockClient.PostCallCount)
	})

	t.Run("returns error when DSPA storage is nil", func(t *testing.T) {
		req := models.RegisterModelRequest{
			S3Path:      "path/to/model",
			ModelName:   "my-model",
			VersionName: "v1",
		}
		mockClient := modelregistry.NewSuccessMockClient(req.ModelName, req.VersionName, req.ArtifactName, "")

		_, _, err := repo.RegisterModel(context.Background(), mockClient, req, nil)

		assert.Error(t, err)
		assert.Contains(t, err.Error(), "DSPA object storage config is required")
	})

	t.Run("returns error when DSPA storage missing bucket", func(t *testing.T) {
		req := models.RegisterModelRequest{
			S3Path:      "path/to/model",
			ModelName:   "my-model",
			VersionName: "v1",
		}
		mockClient := modelregistry.NewSuccessMockClient(req.ModelName, req.VersionName, req.ArtifactName, "")
		noBucket := &models.DSPAObjectStorage{EndpointURL: "https://s3.amazonaws.com"}

		_, _, err := repo.RegisterModel(context.Background(), mockClient, req, noBucket)

		assert.Error(t, err)
		assert.Contains(t, err.Error(), "missing bucket")
	})

	t.Run("returns error when DSPA storage missing endpoint URL", func(t *testing.T) {
		req := models.RegisterModelRequest{
			S3Path:      "path/to/model",
			ModelName:   "my-model",
			VersionName: "v1",
		}
		mockClient := modelregistry.NewSuccessMockClient(req.ModelName, req.VersionName, req.ArtifactName, "")
		noEndpoint := &models.DSPAObjectStorage{Bucket: "my-bucket"}

		_, _, err := repo.RegisterModel(context.Background(), mockClient, req, noEndpoint)

		assert.Error(t, err)
		assert.Contains(t, err.Error(), "missing endpoint")
	})

	t.Run("handles valid relative s3_path", func(t *testing.T) {
		req := models.RegisterModelRequest{
			S3Path:      "leading/slash/model",
			ModelName:   "my-model",
			VersionName: "v1",
		}
		expectedURI := "s3://my-bucket/leading/slash/model?defaultRegion=us-east-1&endpoint=https%3A%2F%2Fs3.amazonaws.com"
		mockClient := modelregistry.NewSuccessMockClient(req.ModelName, req.VersionName, req.ArtifactName, expectedURI)

		_, artifact, err := repo.RegisterModel(context.Background(), mockClient, req, testDSPAStorage)

		assert.NoError(t, err)
		assert.NotNil(t, artifact)
		assert.Equal(t, expectedURI, artifact.GetUri())
	})
}

func TestBuildModelRegistryURI(t *testing.T) {
	t.Run("builds URI with all fields", func(t *testing.T) {
		uri := buildModelRegistryURI("my-bucket", "path/to/model", "https://s3.amazonaws.com", "us-east-1")
		assert.Equal(t, "s3://my-bucket/path/to/model?defaultRegion=us-east-1&endpoint=https%3A%2F%2Fs3.amazonaws.com", uri)
	})

	t.Run("builds URI without region", func(t *testing.T) {
		uri := buildModelRegistryURI("my-bucket", "path/to/model", "https://s3.amazonaws.com", "")
		assert.Equal(t, "s3://my-bucket/path/to/model?endpoint=https%3A%2F%2Fs3.amazonaws.com", uri)
	})

	t.Run("strips leading slashes from key", func(t *testing.T) {
		uri := buildModelRegistryURI("bucket", "/path/to/model", "https://s3.example.com", "")
		assert.Equal(t, "s3://bucket/path/to/model?endpoint=https%3A%2F%2Fs3.example.com", uri)
	})
}

func TestModelRegistryRepository_ResolveModelRegistryByUID(t *testing.T) {
	repo := NewModelRegistryRepository()
	ctx := context.Background()
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	identity := &k8s.RequestIdentity{UserID: "test-user"}

	reg, err := repo.ResolveModelRegistryByUID(ctx, nil, identity, true, mockDefaultModelRegistryUID, logger)
	require.NoError(t, err)
	require.NotNil(t, reg)
	assert.Equal(t, "default-modelregistry", reg.Name)
	assert.Contains(t, reg.ServerURL, "/api/model_registry/")

	_, err = repo.ResolveModelRegistryByUID(ctx, nil, identity, true, "00000000-0000-0000-0000-000000000000", logger)
	assert.ErrorIs(t, err, ErrModelRegistryNotFound)
}
