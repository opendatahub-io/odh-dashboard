package repositories

import (
	"context"
	"fmt"
	"testing"

	kubernetes "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/kubernetes"
)

// mockK8sServiceForSecrets only needs GetSecretInfos.
type mockK8sServiceForSecrets struct {
	mockK8sService
	getSecretInfosFn func(ctx context.Context, namespace string) ([]kubernetes.SecretInfo, error)
}

func (m *mockK8sServiceForSecrets) GetSecretInfos(ctx context.Context, namespace string) ([]kubernetes.SecretInfo, error) {
	return m.getSecretInfosFn(ctx, namespace)
}

func s3Secret(name string) kubernetes.SecretInfo {
	return kubernetes.SecretInfo{
		Name: name,
		Data: map[string]string{
			"AWS_ACCESS_KEY_ID":     "AKIA",
			"AWS_SECRET_ACCESS_KEY": "secret",
			"AWS_S3_ENDPOINT":       "https://s3.example.com",
			"AWS_S3_BUCKET":         "my-bucket",
			"AWS_DEFAULT_REGION":    "us-east-1",
		},
	}
}

func nonStorageSecret(name string) kubernetes.SecretInfo {
	return kubernetes.SecretInfo{
		Name: name,
		Data: map[string]string{
			"username": "admin",
			"password": "pass123",
		},
	}
}

func annotatedS3Secret(name, connType string) kubernetes.SecretInfo {
	s := s3Secret(name)
	s.Type = connType
	return s
}

func TestGetFilteredSecrets(t *testing.T) {
	allSecrets := []kubernetes.SecretInfo{
		s3Secret("aws-conn-1"),
		s3Secret("aws-conn-2"),
		nonStorageSecret("db-creds"),
	}

	k8s := &mockK8sServiceForSecrets{
		getSecretInfosFn: func(ctx context.Context, namespace string) ([]kubernetes.SecretInfo, error) {
			return allSecrets, nil
		},
	}
	repo := NewSecretRepository()

	t.Run("empty type returns all secrets with redaction", func(t *testing.T) {
		result, err := repo.GetFilteredSecrets(k8s, context.Background(), "ns", "")
		if err != nil {
			t.Fatal(err)
		}
		if len(result) != 3 {
			t.Fatalf("expected 3 secrets, got %d", len(result))
		}

		// S3 secrets should have sensitive keys redacted, AWS_S3_BUCKET allowed
		for _, s := range result {
			if s.Data["AWS_ACCESS_KEY_ID"] != "" && s.Data["AWS_ACCESS_KEY_ID"] != "[REDACTED]" {
				t.Errorf("AWS_ACCESS_KEY_ID should be redacted in %q, got %q", s.Name, s.Data["AWS_ACCESS_KEY_ID"])
			}
		}
		// Check AWS_S3_BUCKET is visible on S3 secrets
		if result[0].Data["AWS_S3_BUCKET"] != "my-bucket" {
			t.Errorf("AWS_S3_BUCKET should be visible, got %q", result[0].Data["AWS_S3_BUCKET"])
		}
	})

	t.Run("storage type filters to S3-compatible secrets", func(t *testing.T) {
		result, err := repo.GetFilteredSecrets(k8s, context.Background(), "ns", "storage")
		if err != nil {
			t.Fatal(err)
		}
		if len(result) != 2 {
			t.Fatalf("expected 2 storage secrets, got %d", len(result))
		}
		for _, s := range result {
			if s.Name != "aws-conn-1" && s.Name != "aws-conn-2" {
				t.Errorf("unexpected secret: %q", s.Name)
			}
		}
	})

	t.Run("invalid secret type returns error", func(t *testing.T) {
		_, err := repo.GetFilteredSecrets(k8s, context.Background(), "ns", "invalid")
		if err == nil {
			t.Error("expected error for invalid type")
		}
	})

	t.Run("type detection from annotation takes precedence", func(t *testing.T) {
		k8sAnnotated := &mockK8sServiceForSecrets{
			getSecretInfosFn: func(ctx context.Context, namespace string) ([]kubernetes.SecretInfo, error) {
				return []kubernetes.SecretInfo{
					annotatedS3Secret("annotated-conn", "custom-s3"),
				}, nil
			},
		}

		result, err := repo.GetFilteredSecrets(k8sAnnotated, context.Background(), "ns", "storage")
		if err != nil {
			t.Fatal(err)
		}
		if len(result) != 1 {
			t.Fatalf("expected 1, got %d", len(result))
		}
		if result[0].Type != "custom-s3" {
			t.Errorf("Type = %q, annotation type should take precedence", result[0].Type)
		}
	})

	t.Run("type detection falls back to key-based when no annotation", func(t *testing.T) {
		result, err := repo.GetFilteredSecrets(k8s, context.Background(), "ns", "storage")
		if err != nil {
			t.Fatal(err)
		}
		for _, s := range result {
			if s.Type != "s3" {
				t.Errorf("Type = %q, want key-based s3 detection", s.Type)
			}
		}
	})

	t.Run("redaction: only allowed keys visible", func(t *testing.T) {
		result, err := repo.GetFilteredSecrets(k8s, context.Background(), "ns", "storage")
		if err != nil {
			t.Fatal(err)
		}
		for _, s := range result {
			if s.Data["AWS_ACCESS_KEY_ID"] != "[REDACTED]" {
				t.Errorf("%s: AWS_ACCESS_KEY_ID = %q, want [REDACTED]", s.Name, s.Data["AWS_ACCESS_KEY_ID"])
			}
			if s.Data["AWS_SECRET_ACCESS_KEY"] != "[REDACTED]" {
				t.Errorf("%s: AWS_SECRET_ACCESS_KEY = %q, want [REDACTED]", s.Name, s.Data["AWS_SECRET_ACCESS_KEY"])
			}
			if s.Data["AWS_S3_ENDPOINT"] != "[REDACTED]" {
				t.Errorf("%s: AWS_S3_ENDPOINT = %q, want [REDACTED]", s.Name, s.Data["AWS_S3_ENDPOINT"])
			}
			if s.Data["AWS_S3_BUCKET"] != "my-bucket" {
				t.Errorf("%s: AWS_S3_BUCKET = %q, want my-bucket (allowed)", s.Name, s.Data["AWS_S3_BUCKET"])
			}
		}
	})

	t.Run("k8s service error propagated", func(t *testing.T) {
		failing := &mockK8sServiceForSecrets{
			getSecretInfosFn: func(ctx context.Context, namespace string) ([]kubernetes.SecretInfo, error) {
				return nil, fmt.Errorf("forbidden")
			},
		}
		_, err := repo.GetFilteredSecrets(failing, context.Background(), "ns", "")
		if err == nil {
			t.Error("expected error")
		}
	})

	t.Run("empty secrets list", func(t *testing.T) {
		empty := &mockK8sServiceForSecrets{
			getSecretInfosFn: func(ctx context.Context, namespace string) ([]kubernetes.SecretInfo, error) {
				return []kubernetes.SecretInfo{}, nil
			},
		}
		result, err := repo.GetFilteredSecrets(empty, context.Background(), "ns", "storage")
		if err != nil {
			t.Fatal(err)
		}
		if len(result) != 0 {
			t.Errorf("expected 0, got %d", len(result))
		}
	})
}
