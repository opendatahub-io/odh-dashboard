package mocks

import (
	"time"

	"github.com/opendatahub-io/maas-library/bff/internal/models"
)

// GetMockAPIKeyResponse returns a static API key response for create operations
func GetMockAPIKeyResponse() models.APIKeyResponse {
	return models.APIKeyResponse{
		Token:       "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJtYWFzLWFwaSIsInN1YiI6InRlc3QtdXNlciIsImF1ZCI6WyJtYWFzLWFwaSJdLCJleHAiOjE2NzI1NDU2MDAsIm5iZiI6MTY3MjUzMTIwMCwiaWF0IjoxNjcyNTMxMjAwfQ.mock-signature",
		Expiration:  "4h",
		ExpiresAt:   time.Now().Add(4 * time.Hour).Unix(),
		JTI:         "mock-jti-abc123def456",
		Name:        "new-api-key",
		Description: "Newly created API key",
	}
}

// GetMockAPIKeyMetadata returns a static API key metadata for get operations
func GetMockAPIKeyMetadata() models.APIKeyMetadata {
	return models.APIKeyMetadata{
		ID:             "key-prod-backend-001",
		Name:           "production-backend",
		Description:    "Production API key for backend service",
		CreationDate:   time.Now().Add(-7 * 24 * time.Hour),
		ExpirationDate: time.Now().Add(23 * 24 * time.Hour),
		Status:         models.APIKeyStatusActive,
	}
}

// GetMockAPIKeyMetadataList returns a static list of API key metadata
func GetMockAPIKeyMetadataList() []models.APIKeyMetadata {
	now := time.Now()

	return []models.APIKeyMetadata{
		{
			ID:             "key-prod-backend-001",
			Name:           "production-backend",
			Description:    "Production API key for backend service",
			CreationDate:   now.Add(-7 * 24 * time.Hour),
			ExpirationDate: now.Add(23 * 24 * time.Hour),
			Status:         models.APIKeyStatusActive,
		},
		{
			ID:             "key-dev-testing-002",
			Name:           "development-testing",
			Description:    "Development API key for testing purposes",
			CreationDate:   now.Add(-2 * time.Hour),
			ExpirationDate: now.Add(22 * time.Hour),
			Status:         models.APIKeyStatusActive,
		},
		{
			ID:             "key-ci-pipeline-003",
			Name:           "ci-pipeline",
			Description:    "API key for CI/CD pipeline automation",
			CreationDate:   now.Add(-3 * 24 * time.Hour),
			ExpirationDate: now.Add(4 * 24 * time.Hour),
			Status:         models.APIKeyStatusActive,
		},
		{
			ID:             "key-expired-old-004",
			Name:           "old-service-key",
			Description:    "Expired API key from previous deployment",
			CreationDate:   now.Add(-30 * 24 * time.Hour),
			ExpirationDate: now.Add(-1 * 24 * time.Hour),
			Status:         models.APIKeyStatusExpired,
		},
	}
}
