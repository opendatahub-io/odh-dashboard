package maasmocks

import (
	"context"
	"time"

	"github.com/opendatahub-io/gen-ai/internal/models"
)

// MockMaaSClient provides a mock implementation of the MaaSClient for testing
type MockMaaSClient struct {
	// Add fields here if you need to store state for testing
}

// NewMockMaaSClient creates a new mock MaaS client
func NewMockMaaSClient() *MockMaaSClient {
	return &MockMaaSClient{}
}

// ListModels returns mock MaaS model data
func (m *MockMaaSClient) ListModels(ctx context.Context) ([]models.MaaSModel, error) {
	// Create timestamp for consistent mock data
	created := time.Date(2023, 1, 1, 0, 0, 0, 0, time.UTC).Unix()

	return []models.MaaSModel{
		{
			ID:      "llama-2-7b-chat",
			Object:  "model",
			Created: created,
			OwnedBy: "model-namespace",
			Ready:   true,
			URL:     "http://llama-2-7b-chat.openshift-ai-inference-tier-premium.svc.cluster.local",
		},
		{
			ID:      "llama-2-13b-chat",
			Object:  "model",
			Created: created,
			OwnedBy: "model-namespace",
			Ready:   true,
			URL:     "http://llama-2-13b-chat.openshift-ai-inference-tier-premium.svc.cluster.local",
		},
		{
			ID:      "mistral-7b-instruct",
			Object:  "model",
			Created: created,
			OwnedBy: "model-namespace",
			Ready:   false,
			URL:     "http://mistral-7b-instruct.openshift-ai-inference-tier-premium.svc.cluster.local",
		},
		{
			ID:      "granite-7b-lab",
			Object:  "model",
			Created: created,
			OwnedBy: "model-namespace",
			Ready:   true,
			URL:     "http://granite-7b-lab.openshift-ai-inference-tier-premium.svc.cluster.local",
		},
	}, nil
}

// IssueToken returns a mock token response
func (m *MockMaaSClient) IssueToken(ctx context.Context, request models.MaaSTokenRequest) (*models.MaaSTokenResponse, error) {
	// Set default TTL if not provided
	ttl := request.TTL
	if ttl == "" {
		ttl = "4h"
	}

	// Parse the TTL duration and calculate expiration time
	duration, err := time.ParseDuration(ttl)
	if err != nil {
		// Fallback to default if TTL is invalid
		duration = 4 * time.Hour
	}
	expiresAt := time.Now().Add(duration).Unix()

	return &models.MaaSTokenResponse{
		Token:     "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJtb2NrLXVzZXIiLCJleHAiOjE3MzU0MDY0MDB9.mock-signature-data-here",
		ExpiresAt: expiresAt,
	}, nil
}

// RevokeAllTokens simulates revoking all tokens (always succeeds in mock)
func (m *MockMaaSClient) RevokeAllTokens(ctx context.Context) error {
	// Mock implementation always succeeds
	return nil
}
