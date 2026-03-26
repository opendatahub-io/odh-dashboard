package maasmocks

import (
	"context"
	"fmt"
	"time"

	"github.com/opendatahub-io/gen-ai/internal/constants"
	"github.com/opendatahub-io/gen-ai/internal/integrations/maas"
	"github.com/opendatahub-io/gen-ai/internal/models"
)

// ValidMockSubscriptions defines the set of subscription names that the mock
// considers valid. These match the subscriptions returned by ListModels.
var ValidMockSubscriptions = map[string]bool{
	"basic-subscription":   true,
	"premium-subscription": true,
}

// MockMaaSClient provides a mock implementation of the MaaSClient for testing
type MockMaaSClient struct {
	LastAuthToken string
}

// NewMockMaaSClient creates a new mock MaaS client
func NewMockMaaSClient() *MockMaaSClient {
	return &MockMaaSClient{}
}

// ListModels returns mock MaaS model data
func (m *MockMaaSClient) ListModels(ctx context.Context, authToken string) ([]models.MaaSModel, error) {
	// Special case: empty-test-namespace should return no models for testing empty state
	// Check context for namespace (set by namespace middleware)
	if namespace, ok := ctx.Value(constants.NamespaceQueryParameterKey).(string); ok && namespace == "empty-test-namespace" {
		return []models.MaaSModel{}, nil
	}
	m.LastAuthToken = authToken
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
			Subscriptions: []models.SubscriptionInfo{
				{Name: "basic-subscription", DisplayName: "Basic Tier"},
				{Name: "premium-subscription", DisplayName: "Premium Tier", Description: "Premium subscription with higher rate limits"},
			},
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
			Subscriptions: []models.SubscriptionInfo{
				{Name: "premium-subscription", DisplayName: "Premium Tier", Description: "Premium subscription with higher rate limits"},
			},
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
			Subscriptions: []models.SubscriptionInfo{
				{Name: "premium-subscription", DisplayName: "Premium Tier", Description: "Premium subscription with higher rate limits"},
			},
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
			Subscriptions: []models.SubscriptionInfo{
				{Name: "basic-subscription", DisplayName: "Basic Tier"},
			},
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
			Subscriptions: []models.SubscriptionInfo{
				{Name: "basic-subscription", DisplayName: "Basic Tier"},
			},
		},
	}, nil
}

// IssueToken returns a mock ephemeral API key response.
// Respects request.ExpiresIn when provided; defaults to 1h.
// When Subscription is non-empty, the key name reflects the subscription and
// invalid subscriptions are rejected with a MaaSError (mirroring real MaaS 400).
func (m *MockMaaSClient) IssueToken(ctx context.Context, request models.MaaSTokenRequest) (*models.MaaSTokenResponse, error) {
	if request.Subscription != "" && !ValidMockSubscriptions[request.Subscription] {
		return nil, maas.NewMaaSError(
			maas.ErrCodeInvalidResponse,
			`API request failed with status 400: {"code":"invalid_subscription","error":"Unable to resolve a subscription for this API key"}`,
			400,
		)
	}

	ttl := 1 * time.Hour
	if request.ExpiresIn != "" {
		if parsed, err := time.ParseDuration(request.ExpiresIn); err == nil {
			ttl = parsed
		}
	}

	keyName := "sk-mock-api-key"
	if request.Subscription != "" {
		keyName = fmt.Sprintf("sk-mock-%s-key", request.Subscription)
	}

	return &models.MaaSTokenResponse{
		Key:       keyName,
		ExpiresAt: time.Now().Add(ttl).UTC().Format(time.RFC3339),
	}, nil
}

// RevokeAllTokens simulates revoking all tokens (always succeeds in mock)
func (m *MockMaaSClient) RevokeAllTokens(ctx context.Context) error {
	// Mock implementation always succeeds
	return nil
}
