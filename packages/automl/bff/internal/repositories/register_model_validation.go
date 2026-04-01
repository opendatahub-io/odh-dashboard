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
	s3Path := strings.TrimSpace(req.S3Path)
	if s3Path == "" {
		return errors.New("s3_path is required and cannot be empty")
	}
	// s3_path must be a relative key — reject URI schemes, path traversal, and query/fragment syntax.
	if strings.Contains(s3Path, "://") {
		return errors.New("s3_path must be a relative S3 object key, not a full URI")
	}
	if strings.HasPrefix(s3Path, "/") || strings.HasPrefix(s3Path, "./") || strings.HasPrefix(s3Path, "../") {
		return errors.New("s3_path must be a relative path without leading '/', './', or '../'")
	}
	if strings.Contains(s3Path, "/../") || strings.HasSuffix(s3Path, "/..") {
		return errors.New("s3_path must not contain path traversal sequences")
	}
	if strings.ContainsAny(s3Path, "?#@") {
		return errors.New("s3_path must not contain query, fragment, or host delimiters ('?', '#', '@')")
	}
	if strings.TrimSpace(req.ModelName) == "" {
		return errors.New("model_name is required and cannot be empty")
	}
	if strings.TrimSpace(req.VersionName) == "" {
		return errors.New("version_name is required and cannot be empty")
	}
	return nil
}
