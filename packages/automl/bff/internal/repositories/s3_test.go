package repositories

import (
	"context"
	"testing"

	"github.com/opendatahub-io/automl-library/bff/internal/models"
	"github.com/stretchr/testify/assert"
)

// TestMockS3Repository_GetS3CredentialsFromDSPA_FastFailChecks verifies that the mock
// mirrors the real implementation's fast-fail checks for missing SecretName and EndpointURL.
func TestMockS3Repository_GetS3CredentialsFromDSPA_MissingSecretName(t *testing.T) {
	mock := NewMockS3Repository()
	_, err := mock.GetS3CredentialsFromDSPA(context.Background(), nil, "ns", &models.DSPAObjectStorage{
		SecretName: "", // missing
	}, nil)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "SecretName")
}

func TestMockS3Repository_GetS3CredentialsFromDSPA_MissingEndpointURL(t *testing.T) {
	mock := NewMockS3Repository()
	_, err := mock.GetS3CredentialsFromDSPA(context.Background(), nil, "ns", &models.DSPAObjectStorage{
		SecretName:  "some-secret",
		EndpointURL: "", // missing
	}, nil)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "endpoint")
}
