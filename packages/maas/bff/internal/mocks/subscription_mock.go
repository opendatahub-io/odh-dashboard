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
					Name:      "granite-3-8b-instruct",
					Namespace: "maas-models",
					TokenRateLimits: []models.TokenRateLimit{
						{Limit: 100000, Window: "24h"},
					},
				},
				{
					Name:      "flan-t5-small",
					Namespace: "maas-models",
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
					Name:      "flan-t5-small",
					Namespace: "maas-models",
					TokenRateLimits: []models.TokenRateLimit{
						{Limit: 10000, Window: "24h"},
					},
				},
			},
			CreationTimestamp: timePtr(time.Date(2025, 2, 15, 8, 0, 0, 0, time.UTC)),
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
			ModelRefs: []models.ModelSubscriptionRef{
				{
					Name:      "flan-t5-small",
					Namespace: "maas-models",
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
				{Name: "granite-3-8b-instruct", Namespace: "maas-models"},
				{Name: "flan-t5-small", Namespace: "maas-models"},
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
				{Name: "flan-t5-small", Namespace: "maas-models"},
			},
			Subjects: models.SubjectSpec{
				Groups: []models.GroupReference{
					{Name: "system:authenticated"},
				},
			},
		},
		{
			Name:          "negative-priority-sub-policy",
			Namespace:     "maas-system",
			Phase:         "Active",
			StatusMessage: "successfully reconciled",
			ModelRefs: []models.ModelRef{
				{Name: "flan-t5-small", Namespace: "maas-models"},
				{Name: "granite-3-8b-instruct", Namespace: "maas-models"},
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
