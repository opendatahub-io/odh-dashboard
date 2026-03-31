package repositories

import (
	"errors"
	"strings"

	"github.com/opendatahub-io/automl-library/bff/internal/models"
)

// ValidateRegisterModelRequest validates the RegisterModelRequest body fields.
// The registry ID is validated by the handler from the path parameter, not here.
// s3_path is a relative S3 object key (e.g., "pipeline/run/.../predictor").
// The handler constructs the full URI from the DSPA object storage config.
func ValidateRegisterModelRequest(req models.RegisterModelRequest) error {
	if strings.TrimSpace(req.S3Path) == "" {
		return errors.New("s3_path is required and cannot be empty")
	}
	if strings.TrimSpace(req.ModelName) == "" {
		return errors.New("model_name is required and cannot be empty")
	}
	if strings.TrimSpace(req.VersionName) == "" {
		return errors.New("version_name is required and cannot be empty")
	}
	return nil
}
