package repositories

import (
	"testing"

	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"

	"github.com/opendatahub-io/maas-library/bff/internal/models"
)

func TestNormalizeEndpointURL(t *testing.T) {
	tests := []struct {
		input    string
		expected string
	}{
		{input: "api.openai.com", expected: "api.openai.com"},
		{input: "https://api.openai.com", expected: "api.openai.com"},
		{input: "https://api.openai.com/v1", expected: "api.openai.com"},
	}

	for _, tc := range tests {
		if got := normalizeEndpointURL(tc.input); got != tc.expected {
			t.Fatalf("normalizeEndpointURL(%q) = %q, want %q", tc.input, got, tc.expected)
		}
	}
}

func TestAuthMechanismMapping(t *testing.T) {
	if authMechanismToCRD(models.AuthMechanismAPIKey) != "apikey" {
		t.Fatal("expected apikey")
	}
	if authMechanismToCRD(models.AuthMechanismSigV4) != "sigv4" {
		t.Fatal("expected sigv4")
	}
	if authMechanismToCRD(models.AuthMechanismOAuth2) != "oauth2" {
		t.Fatal("expected oauth2")
	}
	if authMechanismFromCRD("sigv4") != models.AuthMechanismSigV4 {
		t.Fatal("expected sigv4 from CRD")
	}
	if authMechanismFromCRD("oauth2") != models.AuthMechanismOAuth2 {
		t.Fatal("expected oauth2 from CRD")
	}
}

func TestConvertUnstructuredToExternalProviderSummary(t *testing.T) {
	obj := &unstructured.Unstructured{Object: map[string]interface{}{
		"apiVersion": "inference.opendatahub.io/v1alpha1",
		"kind":       "ExternalProvider",
		"metadata": map[string]interface{}{
			"name":      "openai-prod",
			"namespace": "maas-models",
			"annotations": map[string]interface{}{
				displayNameAnnotation: "OpenAI Production",
				descriptionAnnotation: "Production endpoint",
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

func TestBuildExternalProviderRefsWithConfig(t *testing.T) {
	refs := buildExternalProviderRefs([]models.ProviderRef{
		{
			ProviderName: "openai-prod",
			Weight:       100,
			APIFormat:    "openai-chat",
			Path:         "/v1/chat/completions",
			TargetModel:  "gpt-4o",
			Config: map[string]string{
				"deployment": "production",
			},
		},
	})

	refMap, ok := refs[0].(map[string]interface{})
	if !ok {
		t.Fatal("expected map ref")
	}
	config, ok := refMap["config"].(map[string]interface{})
	if !ok {
		t.Fatal("expected config on provider ref")
	}
	if config["deployment"] != "production" {
		t.Fatalf("config = %#v", config)
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
	}

	providers := map[string]models.ExternalProviderSummary{
		"maas-models/openai-prod": {
			Name:        "openai-prod",
			Namespace:   "maas-models",
			DisplayName: "OpenAI Production",
			EndpointUrl: "api.openai.com",
			Provider:    "openai",
			Phase:       "Ready",
		},
	}

	modelRefs := map[string]models.MaaSModelRefSummary{
		"maas-models/gpt-4o-external": {
			Name:      "gpt-4o-external",
			Namespace: "maas-models",
			ModelRef:  models.ModelReference{Kind: "ExternalModel", Name: "gpt-4o-external"},
			Phase:     "Ready",
			Endpoint:  "https://gpt-4o-external.maas.example.com",
			StatusMessage: "Published external GPT-4o model",
		},
	}

	enriched := enrichExternalModelSummaries(summaries, providers, modelRefs)

	if enriched[0].ProviderRefs[0].Provider == nil {
		t.Fatal("expected provider enrichment")
	}
	if enriched[0].ProviderRefs[0].Provider.EndpointUrl != "api.openai.com" {
		t.Fatalf("endpointUrl = %q", enriched[0].ProviderRefs[0].Provider.EndpointUrl)
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
}
