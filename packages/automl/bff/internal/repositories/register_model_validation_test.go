package repositories

import (
	"testing"

	"github.com/opendatahub-io/automl-library/bff/internal/models"
	"github.com/stretchr/testify/assert"
)

func TestValidateRegisterModelRequest(t *testing.T) {
	validReq := models.RegisterModelRequest{
		S3Path:      "s3://my-bucket/path/to/model.bin",
		ModelName:   "my-model",
		VersionName: "v1",
	}

	t.Run("valid request passes", func(t *testing.T) {
		err := ValidateRegisterModelRequest(validReq)
		assert.NoError(t, err)
	})

	t.Run("valid s3a path passes", func(t *testing.T) {
		req := validReq
		req.S3Path = "s3a://bucket/path/model"
		err := ValidateRegisterModelRequest(req)
		assert.NoError(t, err)
	})

	t.Run("rejects empty s3_path", func(t *testing.T) {
		req := validReq
		req.S3Path = ""
		err := ValidateRegisterModelRequest(req)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "s3_path")
	})

	t.Run("rejects whitespace-only s3_path", func(t *testing.T) {
		req := validReq
		req.S3Path = "   "
		err := ValidateRegisterModelRequest(req)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "s3_path")
	})

	t.Run("rejects invalid s3 path format", func(t *testing.T) {
		invalidPaths := []string{
			"https://bucket.s3.amazonaws.com/path",
			"/local/path/to/model",
			"s3://",
			"s3://bucket",
			"s3://bucket/",
		}
		for _, path := range invalidPaths {
			req := validReq
			req.S3Path = path
			err := ValidateRegisterModelRequest(req)
			assert.Error(t, err, "expected error for path %q", path)
			assert.Contains(t, err.Error(), "s3_path", "path %q", path)
		}
	})

	t.Run("rejects empty model_name", func(t *testing.T) {
		req := validReq
		req.ModelName = ""
		err := ValidateRegisterModelRequest(req)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "model_name")
	})

	t.Run("rejects whitespace-only model_name", func(t *testing.T) {
		req := validReq
		req.ModelName = "   "
		err := ValidateRegisterModelRequest(req)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "model_name")
	})

	t.Run("rejects empty version_name", func(t *testing.T) {
		req := validReq
		req.VersionName = ""
		err := ValidateRegisterModelRequest(req)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "version_name")
	})

	t.Run("rejects whitespace-only version_name", func(t *testing.T) {
		req := validReq
		req.VersionName = "   "
		err := ValidateRegisterModelRequest(req)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "version_name")
	})
}
