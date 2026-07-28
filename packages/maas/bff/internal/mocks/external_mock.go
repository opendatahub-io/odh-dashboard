package mocks

import (
	"github.com/opendatahub-io/maas-library/bff/internal/models"
)

// GetMockExternalProviderSummaries returns mock ExternalProvider summaries.
// Names must match ExternalModel providerRefs so list enrichment can attach provider details.
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
			StatusMessage:       "External provider is ready",
		},
		{
			Name:                "bedrock-us-east",
			Namespace:           "maas-models",
			DisplayName:         "AWS Bedrock US East",
			Description:         "SigV4-authenticated Bedrock endpoint.",
			EndpointUrl:         "bedrock.us-east-1.amazonaws.com",
			AuthMechanism:       models.AuthMechanismSigV4,
			CredentialSecretRef: "bedrock-credentials-us-east",
			Provider:            "aws-bedrock",
			Config: map[string]string{
				"region": "us-east-1",
			},
			Phase:         "Ready",
			StatusMessage: "External provider is ready",
		},
		{
			Name:                "bedrock-us-west",
			Namespace:           "maas-models",
			DisplayName:         "AWS Bedrock US West",
			Description:         "SigV4-authenticated Bedrock endpoint.",
			EndpointUrl:         "bedrock.us-west-2.amazonaws.com",
			AuthMechanism:       models.AuthMechanismSigV4,
			CredentialSecretRef: "bedrock-credentials-us-west",
			Provider:            "aws-bedrock",
			Config: map[string]string{
				"region": "us-west-2",
			},
			Phase:         "Ready",
			StatusMessage: "External provider is ready",
		},
		{
			Name:                "bedrock-eu-west",
			Namespace:           "maas-models",
			DisplayName:         "AWS Bedrock EU West",
			Description:         "SigV4-authenticated Bedrock endpoint.",
			EndpointUrl:         "bedrock.eu-west-1.amazonaws.com",
			AuthMechanism:       models.AuthMechanismOAuth2,
			CredentialSecretRef: "bedrock-credentials-eu-west",
			Provider:            "aws-bedrock",
			Config: map[string]string{
				"region": "eu-west-1",
			},
			Phase:         "Ready",
			StatusMessage: "External provider is ready",
		},
		{
			Name:                "bedrock-ap-southeast",
			Namespace:           "maas-models",
			DisplayName:         "AWS Bedrock Asia Pacific Southeast",
			Description:         "SigV4-authenticated Bedrock endpoint.",
			EndpointUrl:         "bedrock.ap-southeast-1.amazonaws.com",
			AuthMechanism:       models.AuthMechanismOAuth2,
			CredentialSecretRef: "bedrock-credentials-ap-southeast",
			Provider:            "aws-bedrock",
			Config: map[string]string{
				"region": "ap-southeast-1",
			},
			Phase:         "Ready",
			StatusMessage: "External provider is ready",
		},
		{
			Name:                "bedrock-ap-northeast",
			Namespace:           "maas-models",
			DisplayName:         "AWS Bedrock Asia Pacific Northeast",
			Description:         "SigV4-authenticated Bedrock endpoint.",
			EndpointUrl:         "bedrock.ap-northeast-1.amazonaws.com",
			AuthMechanism:       models.AuthMechanismAPIKey,
			CredentialSecretRef: "bedrock-credentials-ap-northeast",
			Provider:            "aws-bedrock",
			Config: map[string]string{
				"region": "ap-northeast-1",
			},
			Phase:         "Ready",
			StatusMessage: "External provider is ready",
		},
		{
			Name:                "bedrock-sa-east",
			Namespace:           "maas-models",
			DisplayName:         "AWS Bedrock South America East",
			Description:         "SigV4-authenticated Bedrock endpoint.",
			EndpointUrl:         "bedrock.sa-east-1.amazonaws.com",
			AuthMechanism:       models.AuthMechanismSigV4,
			CredentialSecretRef: "bedrock-credentials-sa-east",
			Provider:            "aws-bedrock",
			Config: map[string]string{
				"region": "sa-east-1",
			},
			Phase:         "Pending",
			StatusMessage: "Waiting for credential Secret",
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
			Name:        "gpt-4o-external-2",
			Namespace:   "maas-models",
			DisplayName: "Another GPT-4o External",
			Description: "Another external model lacking subs and auth policies.",
			ModelName:   "another-gpt-4o",
			ProviderRefs: []models.ProviderRef{
				{
					ProviderName: "openai-prod",
					Weight:       100,
					APIFormat:    "openai-chat",
					Path:         "/v1/chat/completions",
					TargetModel:  "another-gpt-4o",
				},
			},
			Phase:         "Failed",
			StatusMessage: "External model is failed",
			MaaSModelRef: &models.ExternalModelMaaSModelRefStatus{
				Phase:              "Pending",
				StatusMessage:      "Awaiting governance pairing",
				GovernanceAttached: false,
			},
		},
		{
			Name:        "fake-claude",
			Namespace:   "maas-models",
			DisplayName: "Fake Claude",
			Description: "External Claude model routed through OpenAI provider with no auth but does have subs.",
			ModelName:   "claude-sonnet",
			ProviderRefs: []models.ProviderRef{
				{
					ProviderName: "anthropic-dev",
					Weight:       100,
					APIFormat:    "anthropic",
					Path:         "/v1/messages",
					TargetModel:  "claude-sonnet",
				},
			},
			Phase:         "Pending",
			StatusMessage: "External model is pending",
			MaaSModelRef: &models.ExternalModelMaaSModelRefStatus{
				Phase:              "Pending",
				StatusMessage:      "Awaiting governance pairing",
				GovernanceAttached: false,
			},
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
					APIFormat:    "anthropic",
					Path:         "/v1/messages",
					TargetModel:  "claude-sonnet-4-5-20241022",
				},
				{
					ProviderName: "bedrock-us-east",
					Weight:       40,
					APIFormat:    "anthropic",
					Path:         "/v1/messages",
					TargetModel:  "anthropic.claude-3-sonnet",
					Config: map[string]string{
						"region": "us-east-1",
					},
				},
				{
					ProviderName: "bedrock-us-west",
					Weight:       40,
					APIFormat:    "openai-chat",
					Path:         "/v1/messages",
					TargetModel:  "gpt-4o",
					Config: map[string]string{
						"region": "us-west-2",
					},
				},
				{
					ProviderName: "bedrock-eu-west",
					Weight:       40,
					APIFormat:    "openai-chat",
					Path:         "/v1/messages",
					TargetModel:  "gpt-4o",
					Config: map[string]string{
						"region": "eu-west-1",
					},
				},
				{
					ProviderName: "bedrock-ap-southeast",
					Weight:       40,
					APIFormat:    "anthropic",
					Path:         "/v1/messages",
					TargetModel:  "anthropic.claude-3-sonnet",
					Config: map[string]string{
						"region": "ap-southeast-1",
					},
				},
				{
					ProviderName: "bedrock-ap-northeast",
					Weight:       40,
					APIFormat:    "anthropic",
					Path:         "/v1/messages",
					TargetModel:  "anthropic.claude-3-sonnet",
					Config: map[string]string{
						"region": "ap-northeast-1",
					},
				},
				{
					ProviderName: "bedrock-sa-east",
					Weight:       40,
					APIFormat:    "anthropic",
					Path:         "/v1/messages",
					TargetModel:  "anthropic.claude-3-sonnet",
					Config: map[string]string{
						"region": "sa-east-1",
					},
				},
			},
			Phase:         "Ready",
			StatusMessage: "External model is ready",
		},
	}
}
