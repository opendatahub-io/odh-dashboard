package repositories

import (
	"testing"

	"github.com/opendatahub-io/automl-library/bff/internal/integrations/modelregistry"
	"github.com/opendatahub-io/automl-library/bff/internal/models"
	"github.com/stretchr/testify/assert"
)

func TestModelRegistryRepository_RegisterModel(t *testing.T) {
	repo := NewModelRegistryRepository()

	t.Run("creates registered model, version, and artifact in sequence", func(t *testing.T) {
		req := models.RegisterModelRequest{
			S3Path:             "s3://my-bucket/models/model.bin",
			ModelName:          "automl-model",
			ModelDescription:   "AutoML trained model",
			VersionName:        "v1",
			VersionDescription: "Initial version",
			ArtifactName:       "model-artifact",
			ModelFormatName:    "onnx",
		}
		mockClient := modelregistry.NewSuccessMockClient(req.ModelName, req.VersionName, req.S3Path)

		artifact, err := repo.RegisterModel(mockClient, req)

		assert.NoError(t, err)
		assert.NotNil(t, artifact)
		assert.NotEmpty(t, artifact.GetId())
		assert.Equal(t, req.VersionName, artifact.GetName()) // mock returns version name
		assert.Equal(t, req.S3Path, artifact.GetUri())

		assert.Equal(t, 3, mockClient.PostCallCount)
		mockClient.AssertRegisterModelFlow(t, req.ModelName)
	})

	t.Run("uses version name as artifact name when artifact_name is empty", func(t *testing.T) {
		req := models.RegisterModelRequest{
			S3Path:      "s3://bucket/path/model",
			ModelName:   "my-model",
			VersionName: "v2",
		}
		mockClient := modelregistry.NewSuccessMockClient(req.ModelName, req.VersionName, req.S3Path)

		artifact, err := repo.RegisterModel(mockClient, req)

		assert.NoError(t, err)
		assert.NotNil(t, artifact)
		assert.Equal(t, "v2", artifact.GetName())
	})

	t.Run("propagates HTTP error from model registry API", func(t *testing.T) {
		req := models.RegisterModelRequest{
			S3Path:      "s3://bucket/path/model",
			ModelName:   "my-model",
			VersionName: "v1",
		}
		mockClient := modelregistry.NewFailingMockClient(409, "409", "model name already exists")

		artifact, err := repo.RegisterModel(mockClient, req)

		assert.Error(t, err)
		assert.Nil(t, artifact)
		var httpErr *modelregistry.HTTPError
		assert.True(t, assert.ErrorAs(t, err, &httpErr))
		assert.Equal(t, 409, httpErr.StatusCode)
		assert.Contains(t, httpErr.Message, "already exists")
	})

	t.Run("propagates error when first POST fails", func(t *testing.T) {
		req := models.RegisterModelRequest{
			S3Path:      "s3://bucket/path/model",
			ModelName:   "my-model",
			VersionName: "v1",
		}
		mockClient := modelregistry.NewFailingMockClient(503, "503", "service unavailable")

		_, err := repo.RegisterModel(mockClient, req)

		assert.Error(t, err)
		assert.Equal(t, 1, mockClient.PostCallCount)
	})
}
