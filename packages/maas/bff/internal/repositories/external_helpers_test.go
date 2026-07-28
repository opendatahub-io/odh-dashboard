package repositories

import (
	"testing"

	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"

	"github.com/opendatahub-io/maas-library/bff/internal/constants"
	"github.com/opendatahub-io/maas-library/bff/internal/models"
)

func TestConvertUnstructuredToExternalProviderSummary(t *testing.T) {
	obj := &unstructured.Unstructured{Object: map[string]interface{}{
		"apiVersion": "inference.opendatahub.io/v1alpha1",
		"kind":       "ExternalProvider",
		"metadata": map[string]interface{}{
			"name":      "openai-prod",
			"namespace": "maas-models",
			"annotations": map[string]interface{}{
				constants.DisplayNameAnnotation: "OpenAI Production",
				constants.DescriptionAnnotation: "Production endpoint",
			},
		},
		"spec": map[string]interface{}{
			"provider": "openai",
			"endpoint": "api.openai.com",
			"auth": map[string]interface{}{
				"type": "apikey",
				"secretRef": map[string]interface{}{
					"name": "openai-api-key",
				},
			},
			"config": map[string]interface{}{
				"organization": "test-org",
			},
		},
		"status": map[string]interface{}{
			"phase": "Ready",
		},
	}}

	summary := convertUnstructuredToExternalProviderSummary(obj)
	if summary.DisplayName != "OpenAI Production" {
		t.Fatalf("displayName = %q", summary.DisplayName)
	}
	if summary.Description != "Production endpoint" {
		t.Fatalf("description = %q", summary.Description)
	}
	if summary.AuthMechanism != models.AuthMechanismAPIKey {
		t.Fatalf("authMechanism = %q", summary.AuthMechanism)
	}
	if summary.Config["organization"] != "test-org" {
		t.Fatalf("config = %#v", summary.Config)
	}
}

func TestEnrichExternalModelSummaries(t *testing.T) {
	summaries := []models.ExternalModelSummary{
		{
			Name:      "gpt-4o-external",
			Namespace: "maas-models",
			ProviderRefs: []models.ProviderRef{
				{ProviderName: "openai-prod", Weight: 100},
			},
		},
		{
			Name:      "claude-split",
			Namespace: "maas-models",
			ProviderRefs: []models.ProviderRef{
				{ProviderName: "anthropic-dev", Weight: 100},
			},
		},
	}

	providers := map[string]models.ExternalProviderSummary{
		"maas-models/openai-prod": {
			Name:                "openai-prod",
			Namespace:           "maas-models",
			DisplayName:         "OpenAI Production",
			EndpointUrl:         "api.openai.com",
			AuthMechanism:       models.AuthMechanismAPIKey,
			CredentialSecretRef: "openai-api-key",
			Provider:            "openai",
			Phase:               "Ready",
		},
	}

	modelRefs := map[string]models.MaaSModelRefSummary{
		"maas-models/gpt-4o-external": {
			Name:               "gpt-4o-external",
			Namespace:          "maas-models",
			ModelRef:           models.ModelReference{Kind: "ExternalModel", Name: "gpt-4o-external"},
			Phase:              "Ready",
			Endpoint:           "https://gpt-4o-external.maas.example.com",
			StatusMessage:      "Published external GPT-4o model",
			GovernanceAttached: true,
		},
	}

	enriched := enrichExternalModelSummaries(summaries, providers, modelRefs)

	if enriched[0].ProviderRefs[0].Provider == nil {
		t.Fatal("expected provider enrichment")
	}
	if enriched[0].ProviderRefs[0].Provider.EndpointUrl != "api.openai.com" {
		t.Fatalf("endpointUrl = %q", enriched[0].ProviderRefs[0].Provider.EndpointUrl)
	}
	if enriched[0].ProviderRefs[0].Provider.CredentialSecretRef != "openai-api-key" {
		t.Fatalf("credentialSecretRef = %q", enriched[0].ProviderRefs[0].Provider.CredentialSecretRef)
	}
	if enriched[0].MaaSModelRef == nil {
		t.Fatal("expected maaSModelRef enrichment")
	}
	if enriched[0].MaaSModelRef.Endpoint != "https://gpt-4o-external.maas.example.com" {
		t.Fatalf("endpoint = %q", enriched[0].MaaSModelRef.Endpoint)
	}
	if enriched[0].MaaSModelRef.StatusMessage != "Published external GPT-4o model" {
		t.Fatalf("statusMessage = %q", enriched[0].MaaSModelRef.StatusMessage)
	}
	if !enriched[0].MaaSModelRef.GovernanceAttached {
		t.Fatal("expected governanceAttached=true for gpt-4o")
	}
	if enriched[1].MaaSModelRef != nil {
		t.Fatal("expected no maaSModelRef enrichment for claude-split")
	}
}
