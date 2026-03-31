package repositories

import (
	"errors"
	"regexp"
	"strings"

	"github.com/opendatahub-io/automl-library/bff/internal/models"
)

// S3 path pattern: s3://bucket-name/path or s3a://bucket/path (must have bucket and path).
// s3a:// is Hadoop's S3-compatible URI scheme; included for compatibility with Spark/ML pipelines.
var s3PathRegex = regexp.MustCompile(`^s3[a]?://[^/]+/.+`)

// ValidateRegisterModelRequest validates the RegisterModelRequest body fields.
// The registry ID is validated by the handler from the path parameter, not here.
func ValidateRegisterModelRequest(req models.RegisterModelRequest) error {
	if strings.TrimSpace(req.S3Path) == "" {
		return errors.New("s3_path is required and cannot be empty")
	}
	if !s3PathRegex.MatchString(strings.TrimSpace(req.S3Path)) {
		return errors.New("s3_path must be a valid S3 URI (e.g., s3://bucket-name/path/to/model)")
	}
	if strings.TrimSpace(req.ModelName) == "" {
		return errors.New("model_name is required and cannot be empty")
	}
	if strings.TrimSpace(req.VersionName) == "" {
		return errors.New("version_name is required and cannot be empty")
	}
	return nil
}
