package mocks

import (
	"github.com/opendatahub-io/maas-library/bff/internal/models"
)

// GetMockExternalProviderSummaries returns mock ExternalProvider summaries.
func GetMockExternalProviderSummaries() []models.ExternalProviderSummary {
	return []models.ExternalProviderSummary{
		{
			Name:                "openai-prod",
			Namespace:           "maas-models",
			DisplayName:         "OpenAI Production",
			Description:         "Production OpenAI endpoint for chat models.",
			EndpointUrl:         "api.openai.com",
			AuthMechanism:       models.AuthMechanismAPIKey,
			CredentialSecretRef: "openai-api-key",
			Provider:            "openai",
			Phase:               "Ready",
			StatusMessage:       "External provider is ready",
		},
		{
			Name:                "anthropic-dev",
			Namespace:           "maas-models",
			DisplayName:         "Anthropic Development",
			Description:         "Development Anthropic endpoint.",
			EndpointUrl:         "api.anthropic.com",
			AuthMechanism:       models.AuthMechanismAPIKey,
			CredentialSecretRef: "anthropic-api-key",
			Provider:            "anthropic",
			Phase:               "Ready",
		},
		{
			Name:                "bedrock-us-east",
			Namespace:           "maas-models",
			DisplayName:         "AWS Bedrock US East",
			Description:         "SigV4-authenticated Bedrock endpoint.",
			EndpointUrl:         "bedrock.us-east-1.amazonaws.com",
			AuthMechanism:       models.AuthMechanismSigV4,
			CredentialSecretRef: "bedrock-credentials",
			Provider:            "aws-bedrock",
			Config: map[string]string{
				"region": "us-east-1",
			},
			Phase: "Pending",
		},
	}
}

// GetMockExternalModelSummaries returns mock ExternalModel summaries.
func GetMockExternalModelSummaries() []models.ExternalModelSummary {
	return []models.ExternalModelSummary{
		{
			Name:        "gpt-4o-external",
			Namespace:   "maas-models",
			DisplayName: "GPT-4o External",
			Description: "External GPT-4o model routed through OpenAI provider.",
			ModelName:   "gpt-4o",
			ProviderRefs: []models.ProviderRef{
				{
					ProviderName: "openai-prod",
					Weight:       100,
					APIFormat:    "openai-chat",
					Path:         "/v1/chat/completions",
					TargetModel:  "gpt-4o",
				},
			},
			Phase:         "Ready",
			StatusMessage: "External model is ready",
		},
		{
			Name:        "claude-split",
			Namespace:   "maas-models",
			DisplayName: "Claude A/B Split",
			Description: "Weighted routing across Anthropic and Bedrock providers.",
			ModelName:   "claude-sonnet",
			ProviderRefs: []models.ProviderRef{
				{
					ProviderName: "anthropic-dev",
					Weight:       60,
					APIFormat:    "messages",
					Path:         "/v1/messages",
					TargetModel:  "claude-sonnet-4-5-20241022",
				},
				{
					ProviderName: "bedrock-us-east",
					Weight:       40,
					APIFormat:    "messages",
					Path:         "/v1/messages",
					TargetModel:  "anthropic.claude-3-sonnet",
					Config: map[string]string{
						"region": "us-east-1",
					},
				},
			},
			Phase:         "Ready",
			StatusMessage: "External model is ready",
		},
	}
}
