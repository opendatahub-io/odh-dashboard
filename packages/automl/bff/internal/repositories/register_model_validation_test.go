package repositories

import (
	"strings"
	"testing"

	"github.com/opendatahub-io/automl-library/bff/internal/models"
)

func TestValidateRegisterModelRequest(t *testing.T) {
	valid := models.RegisterModelRequest{
		S3Path:      "pipeline/run/models/predictor",
		ModelName:   "my-model",
		VersionName: "v1",
	}

	t.Run("valid request", func(t *testing.T) {
		if err := ValidateRegisterModelRequest(valid); err != nil {
			t.Fatal(err)
		}
	})

	t.Run("valid deep relative path", func(t *testing.T) {
		req := valid
		req.S3Path = "autogluon-training/run-123/models/model-1/predictor"
		if err := ValidateRegisterModelRequest(req); err != nil {
			t.Fatal(err)
		}
	})

	t.Run("empty s3_path", func(t *testing.T) {
		req := valid
		req.S3Path = ""
		err := ValidateRegisterModelRequest(req)
		if err == nil || !strings.Contains(err.Error(), "s3_path") {
			t.Errorf("expected s3_path error, got %v", err)
		}
	})

	t.Run("whitespace-only s3_path", func(t *testing.T) {
		req := valid
		req.S3Path = "   "
		err := ValidateRegisterModelRequest(req)
		if err == nil {
			t.Error("expected error")
		}
	})

	t.Run("rejects URI schemes", func(t *testing.T) {
		for _, path := range []string{"s3://bucket/key", "https://example.com/model", "s3a://bucket/key"} {
			req := valid
			req.S3Path = path
			err := ValidateRegisterModelRequest(req)
			if err == nil || !strings.Contains(err.Error(), "relative") {
				t.Errorf("path %q: expected relative error, got %v", path, err)
			}
		}
	})

	t.Run("rejects path traversal", func(t *testing.T) {
		for _, path := range []string{"/absolute/path", "./relative", "../parent", "a/../../escape"} {
			req := valid
			req.S3Path = path
			err := ValidateRegisterModelRequest(req)
			if err == nil {
				t.Errorf("path %q should be rejected", path)
			}
		}
	})

	t.Run("rejects query/fragment/host delimiters", func(t *testing.T) {
		for _, path := range []string{"path?query=1", "path#fragment", "user@host/path"} {
			req := valid
			req.S3Path = path
			err := ValidateRegisterModelRequest(req)
			if err == nil {
				t.Errorf("path %q should be rejected", path)
			}
		}
	})

	t.Run("empty model_name", func(t *testing.T) {
		req := valid
		req.ModelName = ""
		err := ValidateRegisterModelRequest(req)
		if err == nil || !strings.Contains(err.Error(), "model_name") {
			t.Errorf("expected model_name error, got %v", err)
		}
	})

	t.Run("whitespace-only model_name", func(t *testing.T) {
		req := valid
		req.ModelName = "   "
		err := ValidateRegisterModelRequest(req)
		if err == nil {
			t.Error("expected error")
		}
	})

	t.Run("empty version_name", func(t *testing.T) {
		req := valid
		req.VersionName = ""
		err := ValidateRegisterModelRequest(req)
		if err == nil || !strings.Contains(err.Error(), "version_name") {
			t.Errorf("expected version_name error, got %v", err)
		}
	})

	t.Run("whitespace-only version_name", func(t *testing.T) {
		req := valid
		req.VersionName = "   "
		err := ValidateRegisterModelRequest(req)
		if err == nil {
			t.Error("expected error")
		}
	})
}
