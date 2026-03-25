package maasmocks

import (
	"context"
	"time"

	"github.com/opendatahub-io/gen-ai/internal/constants"
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
func (m *MockMaaSClient) ListModels(ctx context.Context, apiKey string) ([]models.MaaSModel, error) {
	// Special case: empty-test-namespace should return no models for testing empty state
	// Check context for namespace (set by namespace middleware)
	if namespace, ok := ctx.Value(constants.NamespaceQueryParameterKey).(string); ok && namespace == "empty-test-namespace" {
		return []models.MaaSModel{}, nil
	}

	// Create timestamp for consistent mock data
	created := time.Date(2023, 1, 1, 0, 0, 0, 0, time.UTC).Unix()

	return []models.MaaSModel{
		{
			ID:          "llama-2-7b-chat",
			Object:      "model",
			Created:     created,
			OwnedBy:     "model-namespace",
			Ready:       true,
			URL:         "https://llama-2-7b-chat.apps.example.openshift.com/v1",
			DisplayName: "Llama 2 7B Chat",
			Description: "Meta Llama 2 7B model fine-tuned for conversational AI and chat applications",
			Usecase:     "Chat, Question answering",
		},
		{
			ID:          "llama-2-13b-chat",
			Object:      "model",
			Created:     created,
			OwnedBy:     "model-namespace",
			Ready:       true,
			URL:         "https://llama-2-13b-chat.apps.example.openshift.com/v1",
			DisplayName: "Llama 2 13B Chat",
			Description: "Meta Llama 2 13B model with enhanced reasoning capabilities for complex conversations",
			Usecase:     "Chat, Reasoning, Question answering",
		},
		{
			ID:          "mistral-7b-instruct",
			Object:      "model",
			Created:     created,
			OwnedBy:     "model-namespace",
			Ready:       false,
			URL:         "https://mistral-7b-instruct.apps.example.openshift.com/v1",
			DisplayName: "Mistral 7B Instruct",
			Description: "Mistral AI 7B model optimized for instruction following and task completion",
			Usecase:     "Text generation, Instruction following",
		},
		{
			ID:          "granite-7b-lab",
			Object:      "model",
			Created:     created,
			OwnedBy:     "model-namespace",
			Ready:       true,
			URL:         "https://granite-7b-lab.apps.example.openshift.com/v1",
			DisplayName: "Granite 7B Lab",
			Description: "IBM Granite 7B model optimized for enterprise lab experiments and testing",
			Usecase:     "Code generation, Text completion",
		},
		{
			ID:          "nomic-embed-text-v1",
			Object:      "model",
			Created:     created,
			OwnedBy:     "model-namespace",
			Ready:       true,
			URL:         "https://nomic-embed-text-v1.apps.example.openshift.com/v1",
			DisplayName: "Nomic Embed Text v1",
			Description: "High-performance text embedding model for semantic search and retrieval",
			Usecase:     "Embedding, Semantic search",
		},
	}, nil
}

// IssueToken returns a mock API key response
func (m *MockMaaSClient) IssueToken(ctx context.Context, request models.MaaSTokenRequest) (*models.MaaSTokenResponse, error) {
	return &models.MaaSTokenResponse{
		Key:       "sk-oai-mock-api-key-for-testing-purposes-only",
		ExpiresAt: time.Now().Add(90 * 24 * time.Hour).UTC().Format(time.RFC3339),
	}, nil
}

// RevokeAllTokens simulates revoking all tokens (always succeeds in mock)
func (m *MockMaaSClient) RevokeAllTokens(ctx context.Context) error {
	// Mock implementation always succeeds
	return nil
}
