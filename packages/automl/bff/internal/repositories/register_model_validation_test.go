package repositories

import (
	"testing"

	"github.com/opendatahub-io/automl-library/bff/internal/models"
	"github.com/stretchr/testify/assert"
)

func TestValidateRegisterModelRequest(t *testing.T) {
	validReq := models.RegisterModelRequest{
		S3Path:      "pipeline/run/models/predictor",
		ModelName:   "my-model",
		VersionName: "v1",
	}

	t.Run("valid request passes", func(t *testing.T) {
		err := ValidateRegisterModelRequest(validReq)
		assert.NoError(t, err)
	})

	t.Run("valid relative path passes", func(t *testing.T) {
		req := validReq
		req.S3Path = "autogluon-training/run-123/models/model-1/predictor"
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
