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
			Name:      "premium-team-sub",
			Namespace: "maas-system",
			Phase:     "Active",
			Priority:  10,
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
			Name:      "basic-team-sub",
			Namespace: "maas-system",
			Phase:     "Active",
			Priority:  0,
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
			Name:      "premium-team-sub-policy",
			Namespace: "maas-system",
			Phase:     "Active",
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
			Name:      "basic-team-sub-policy",
			Namespace: "maas-system",
			Phase:     "Active",
			ModelRefs: []models.ModelRef{
				{Name: "flan-t5-small", Namespace: "maas-models"},
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
			Name:      "granite-3-8b-instruct",
			Namespace: "maas-models",
			ModelRef: models.ModelReference{
				Kind: "LLMInferenceService",
				Name: "granite-3-8b-instruct",
			},
			Phase:    "Ready",
			Endpoint: "https://granite-3-8b-instruct.example.com",
		},
		{
			Name:      "flan-t5-small",
			Namespace: "maas-models",
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
