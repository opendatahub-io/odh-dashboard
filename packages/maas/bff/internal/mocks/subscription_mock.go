package mocks

import (
	"time"

	"github.com/opendatahub-io/maas-library/bff/internal/models"
)

func timePtr(t time.Time) *time.Time {
	return &t
}

// GetMockMaaSSubscriptions returns mock MaaSSubscription resources.
func GetMockMaaSSubscriptions() []models.MaaSSubscription {
	return []models.MaaSSubscription{
		{
			Name:          "premium-team-sub",
			Namespace:     "maas-system",
			DisplayName:   "Premium Team Subscription",
			Description:   "High-priority subscription for the premium team with extended token limits.",
			Phase:         "Active",
			StatusMessage: "successfully reconciled",
			Priority:      10,
			Owner: models.OwnerSpec{
				Groups: []models.GroupReference{
					{Name: "premium-users"},
				},
			},
			ModelRefs: []models.ModelSubscriptionRef{
				{
					Name:        "granite-3-8b-instruct",
					Namespace:   "maas-models",
					DisplayName: "Granite 3 8B Instruct",
					Description: "IBM Granite 3 8B instruction-tuned language model.",
					TokenRateLimits: []models.TokenRateLimit{
						{Limit: 100000, Window: "24h"},
					},
				},
				{
					Name:        "flan-t5-small",
					Namespace:   "maas-models",
					DisplayName: "Flan T5 Small",
					Description: "Google Flan T5 small text-to-text transfer transformer model.",
					TokenRateLimits: []models.TokenRateLimit{
						{Limit: 200000, Window: "24h"},
					},
				},
			},
			TokenMetadata: &models.TokenMetadata{
				OrganizationID: "org-123",
				CostCenter:     "engineering",
			},
			CreationTimestamp: timePtr(time.Date(2025, 3, 1, 10, 0, 0, 0, time.UTC)),
		},
		{
			Name:          "basic-team-sub",
			Namespace:     "maas-system",
			DisplayName:   "Basic Team Subscription",
			Description:   "Standard subscription for general team access.",
			Phase:         "Active",
			StatusMessage: "successfully reconciled",
			Priority:      0,
			Owner: models.OwnerSpec{
				Groups: []models.GroupReference{
					{Name: "system:authenticated"},
				},
			},
			ModelRefs: []models.ModelSubscriptionRef{
				{
					Name:        "flan-t5-small",
					Namespace:   "maas-models",
					DisplayName: "Flan T5 Small",
					Description: "Google Flan T5 small text-to-text transfer transformer model.",
					TokenRateLimits: []models.TokenRateLimit{
						{Limit: 10000, Window: "24h"},
					},
				},
			},
			CreationTimestamp: timePtr(time.Date(2025, 2, 15, 8, 0, 0, 0, time.UTC)),
		},
		{
			Name:          "multi-group-llama-sub",
			Namespace:     "maas-system",
			DisplayName:   "Enterprise Multi-Group Llama Access",
			Description:   "Broad access to Llama 3 70B for multiple teams across the organization.",
			Phase:         "Active",
			StatusMessage: "successfully reconciled",
			Priority:      5,
			Owner: models.OwnerSpec{
				Groups: []models.GroupReference{
					{Name: "platform-admins"},
					{Name: "data-science-team"},
					{Name: "ml-engineers"},
					{Name: "analytics-team"},
					{Name: "qa-engineers"},
					{Name: "devops-team"},
					{Name: "security-reviewers"},
					{Name: "product-managers"},
					{Name: "research-team"},
					{Name: "frontend-devs"},
					{Name: "backend-devs"},
					{Name: "interns"},
				},
			},
			ModelRefs: []models.ModelSubscriptionRef{
				{
					Name:      "llama-3-70b-instruct",
					Namespace: "maas-models",
					TokenRateLimits: []models.TokenRateLimit{
						{Limit: 2000, Window: "1m"},
						{Limit: 80000, Window: "1h"},
						{Limit: 600000, Window: "24h"},
					},
				},
			},
			CreationTimestamp: timePtr(time.Date(2025, 4, 1, 9, 0, 0, 0, time.UTC)),
		},
		{
			Name:          "negative-priority-sub",
			Namespace:     "maas-system",
			DisplayName:   "Negative Priority Subscription",
			Description:   "Negative priority subscription for testing.",
			Phase:         "Active",
			StatusMessage: "successfully reconciled",
			Priority:      -10,
			Owner: models.OwnerSpec{
				Groups: []models.GroupReference{
					{Name: "system:authenticated"},
				},
			},
			DeletionTimestamp: timePtr(time.Date(2025, 4, 1, 12, 0, 0, 0, time.UTC)),
			ModelRefs: []models.ModelSubscriptionRef{
				{
					Name:        "flan-t5-small",
					Namespace:   "maas-models",
					DisplayName: "Flan T5 Small",
					Description: "Google Flan T5 small text-to-text transfer transformer model.",
					TokenRateLimits: []models.TokenRateLimit{
						{Limit: 10000, Window: "24h"},
					},
				},
			},
			CreationTimestamp: timePtr(time.Date(2025, 2, 15, 8, 0, 0, 0, time.UTC)),
		},
	}
}

// GetMockMaaSAuthPolicies returns mock MaaSAuthPolicy resources.
func GetMockMaaSAuthPolicies() []models.MaaSAuthPolicy {
	return []models.MaaSAuthPolicy{
		{
			Name:              "premium-team-sub-policy",
			Namespace:         "maas-system",
			DisplayName:       "Premium Team Policy",
			Description:       "High-priority access policy for the premium team with extended model access.",
			Phase:             "Active",
			StatusMessage:     "successfully reconciled",
			CreationTimestamp: timePtr(time.Date(2025, 3, 1, 10, 0, 0, 0, time.UTC)),
			ModelRefs: []models.ModelRef{
				{Name: "granite-3-8b-instruct", Namespace: "maas-models", DisplayName: "Granite 3 8B Instruct", Description: "IBM Granite 3 8B instruction-tuned language model."},
				{Name: "flan-t5-small", Namespace: "maas-models", DisplayName: "Flan T5 Small", Description: "Google Flan T5 small text-to-text transfer transformer model."},
			},
			Subjects: models.SubjectSpec{
				Groups: []models.GroupReference{
					{Name: "premium-users"},
				},
			},
			MeteringMetadata: &models.TokenMetadata{
				OrganizationID: "org-123",
				CostCenter:     "engineering",
			},
		},
		{
			Name:              "basic-team-sub-policy",
			Namespace:         "maas-system",
			DisplayName:       "Basic Team Policy",
			Description:       "Standard access policy for general team usage.",
			Phase:             "Active",
			StatusMessage:     "successfully reconciled",
			CreationTimestamp: timePtr(time.Date(2025, 2, 15, 8, 0, 0, 0, time.UTC)),
			ModelRefs: []models.ModelRef{
				{Name: "flan-t5-small", Namespace: "maas-models", DisplayName: "Flan T5 Small", Description: "Google Flan T5 small text-to-text transfer transformer model."},
			},
			Subjects: models.SubjectSpec{
				Groups: []models.GroupReference{
					{Name: "system:authenticated"},
				},
			},
		},
		{
			Name:              "gemma-research-policy",
			Namespace:         "maas-system",
			DisplayName:       "Gemma Research Policy",
			Description:       "Broad research access policy for Gemma across multiple teams.",
			Phase:             "Active",
			StatusMessage:     "successfully reconciled",
			CreationTimestamp: timePtr(time.Date(2025, 4, 10, 9, 0, 0, 0, time.UTC)),
			ModelRefs: []models.ModelRef{
				{Name: "gemma-7b-it", Namespace: "maas-models"},
			},
			Subjects: models.SubjectSpec{
				Groups: []models.GroupReference{
					{Name: "data-science-team"},
					{Name: "ml-engineers"},
					{Name: "research-team"},
					{Name: "analytics-team"},
					{Name: "qa-engineers"},
					{Name: "platform-admins"},
					{Name: "devops-team"},
					{Name: "security-reviewers"},
					{Name: "product-managers"},
					{Name: "frontend-devs"},
					{Name: "backend-devs"},
					{Name: "interns"},
				},
			},
		},
		{
			Name:              "negative-priority-sub-policy",
			Namespace:         "maas-system",
			Phase:             "Active",
			DeletionTimestamp: timePtr(time.Date(2025, 4, 1, 12, 0, 0, 0, time.UTC)),
			StatusMessage:     "successfully reconciled",
			ModelRefs: []models.ModelRef{
				{Name: "flan-t5-small", Namespace: "maas-models", DisplayName: "Flan T5 Small", Description: "Google Flan T5 small text-to-text transfer transformer model."},
				{Name: "granite-3-8b-instruct", Namespace: "maas-models", DisplayName: "Granite 3 8B Instruct", Description: "IBM Granite 3 8B instruction-tuned language model."},
			},
			Subjects: models.SubjectSpec{
				Groups: []models.GroupReference{
					{Name: "system:authenticated"},
				},
			},
		},
	}
}

// GetMockMaaSModelRefSummaries returns mock MaaSModelRef summaries.
func GetMockMaaSModelRefSummaries() []models.MaaSModelRefSummary {
	return []models.MaaSModelRefSummary{
		{
			Name:        "granite-3-8b-instruct",
			Namespace:   "maas-models",
			DisplayName: "Granite 3 8B Instruct",
			Description: "IBM Granite 3 8B instruction-tuned language model.",
			ModelRef: models.ModelReference{
				Kind: "LLMInferenceService",
				Name: "granite-3-8b-instruct",
			},
			Phase:    "Ready",
			Endpoint: "https://granite-3-8b-instruct.example.com",
		},
		{
			Name:        "flan-t5-small",
			Namespace:   "maas-models",
			DisplayName: "Flan T5 Small",
			Description: "Google Flan T5 small text-to-text transfer transformer model.",
			ModelRef: models.ModelReference{
				Kind: "LLMInferenceService",
				Name: "flan-t5-small",
			},
			Phase:    "Ready",
			Endpoint: "https://flan-t5-small.example.com",
		},
		{
			Name:        "llama-3-70b-instruct",
			Namespace:   "maas-models",
			DisplayName: "Llama 3 70B Instruct",
			Description: "A large open-weight model for complex reasoning and multi-turn dialogue.",
			ModelRef: models.ModelReference{
				Kind: "LLMInferenceService",
				Name: "llama-3-70b-instruct",
			},
			Phase:    "Ready",
			Endpoint: "https://llama-3-70b-instruct.example.com",
		},
		{
			Name:        "gemma-7b-it",
			Namespace:   "maas-models",
			DisplayName: "Gemma 7B IT",
			Description: "Google Gemma 7B instruction-tuned model for general-purpose tasks.",
			ModelRef: models.ModelReference{
				Kind: "LLMInferenceService",
				Name: "gemma-7b-it",
			},
			Phase:    "Ready",
			Endpoint: "https://gemma-7b-it.example.com",
		},
		{
			Name:        "gpt-4o-external",
			Namespace:   "maas-models",
			DisplayName: "GPT-4o External",
			Description: "Published external GPT-4o model.",
			ModelRef: models.ModelReference{
				Kind: "ExternalModel",
				Name: "gpt-4o-external",
			},
			Phase:         "Ready",
			Endpoint:      "https://gpt-4o-external.maas.example.com",
			StatusMessage: "Published external GPT-4o model",
		},
	}
}

// GetMockGroups returns mock Kubernetes group names.
func GetMockGroups() []string {
	return []string{
		"system:authenticated",
		"premium-users",
		"enterprise-users",
		"beta-testers",
		"dora-namespace-group",
		"dora-service-group",
	}
}
