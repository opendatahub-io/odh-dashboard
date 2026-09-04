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

func TestConvertUnstructuredToExternalModelSummary_AuthOverride(t *testing.T) {
	obj := &unstructured.Unstructured{Object: map[string]interface{}{
		"apiVersion": "inference.opendatahub.io/v1alpha1",
		"kind":       "ExternalModel",
		"metadata": map[string]interface{}{
			"name":      "bedrock-model",
			"namespace": "maas-models",
		},
		"spec": map[string]interface{}{
			"modelName": "anthropic.claude-3",
			"externalProviderRefs": []interface{}{
				map[string]interface{}{
					"ref":    map[string]interface{}{"name": "aws-provider"},
					"weight": int64(100),
					"auth": map[string]interface{}{
						"type": "sigv4",
						"secretRef": map[string]interface{}{
							"name": "aws-bedrock-secret",
						},
					},
				},
				map[string]interface{}{
					"ref":    map[string]interface{}{"name": "openai-provider"},
					"weight": int64(0),
				},
			},
		},
	}}

	summary := convertUnstructuredToExternalModelSummary(obj)

	if summary.ProviderRefs[0].AuthMechanism == nil {
		t.Fatal("expected auth override on first providerRef")
	}
	if *summary.ProviderRefs[0].AuthMechanism != models.AuthMechanismSigV4 {
		t.Fatalf("authMechanism = %q, want sigv4", *summary.ProviderRefs[0].AuthMechanism)
	}
	if summary.ProviderRefs[0].CredentialSecretRef != "aws-bedrock-secret" {
		t.Fatalf("credentialSecretRef = %q", summary.ProviderRefs[0].CredentialSecretRef)
	}
	if summary.ProviderRefs[1].AuthMechanism != nil {
		t.Fatal("expected no auth override on second providerRef")
	}
	if summary.ProviderRefs[1].CredentialSecretRef != "" {
		t.Fatalf("expected empty credentialSecretRef, got %q", summary.ProviderRefs[1].CredentialSecretRef)
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
			Reason:             "Reconciled",
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
	if enriched[0].MaaSModelRef.Reason != "Reconciled" {
		t.Fatalf("reason = %q", enriched[0].MaaSModelRef.Reason)
	}
	if !enriched[0].MaaSModelRef.GovernanceAttached {
		t.Fatal("expected governanceAttached=true for gpt-4o")
	}
	if enriched[1].MaaSModelRef != nil {
		t.Fatal("expected no maaSModelRef enrichment for claude-split")
	}
}

func TestEnrichExternalModelSummaries_AuthOverride(t *testing.T) {
	sigv4 := models.AuthMechanismSigV4
	summaries := []models.ExternalModelSummary{
		{
			Name:      "bedrock-model",
			Namespace: "maas-models",
			ProviderRefs: []models.ProviderRef{
				{
					ProviderName:        "aws-provider",
					Weight:              100,
					AuthMechanism:       &sigv4,
					CredentialSecretRef: "aws-bedrock-secret",
				},
			},
		},
		{
			Name:      "plain-model",
			Namespace: "maas-models",
			ProviderRefs: []models.ProviderRef{
				{ProviderName: "aws-provider", Weight: 100},
			},
		},
	}

	providers := map[string]models.ExternalProviderSummary{
		"maas-models/aws-provider": {
			Name:                "aws-provider",
			Namespace:           "maas-models",
			EndpointUrl:         "bedrock.us-east-1.amazonaws.com",
			AuthMechanism:       models.AuthMechanismAPIKey,
			CredentialSecretRef: "provider-api-key",
			Provider:            "aws",
			Phase:               "Ready",
		},
	}

	enriched := enrichExternalModelSummaries(summaries, providers, nil)

	if enriched[0].ProviderRefs[0].Provider.AuthMechanism != models.AuthMechanismSigV4 {
		t.Fatalf("expected overridden authMechanism sigv4, got %q", enriched[0].ProviderRefs[0].Provider.AuthMechanism)
	}
	if enriched[0].ProviderRefs[0].Provider.CredentialSecretRef != "aws-bedrock-secret" {
		t.Fatalf("expected overridden credentialSecretRef, got %q", enriched[0].ProviderRefs[0].Provider.CredentialSecretRef)
	}

	if enriched[1].ProviderRefs[0].Provider.AuthMechanism != models.AuthMechanismAPIKey {
		t.Fatalf("expected provider authMechanism apikey, got %q", enriched[1].ProviderRefs[0].Provider.AuthMechanism)
	}
	if enriched[1].ProviderRefs[0].Provider.CredentialSecretRef != "provider-api-key" {
		t.Fatalf("expected provider credentialSecretRef, got %q", enriched[1].ProviderRefs[0].Provider.CredentialSecretRef)
	}
}

func TestValidateSecretRefName(t *testing.T) {
	valid := []string{
		"my-secret",
		"openai-api-key",
		"aws-bedrock-secret",
		" my-secret",
		"my-secret ",
		" my-secret ",
	}
	for _, raw := range valid {
		if err := ValidateSecretRefName(raw); err != nil {
			t.Errorf("%q: unexpected error: %v", raw, err)
		}
	}

	invalid := []string{
		"",
		"   ",
		"my secret",
		"My_Secret",
		"-leading",
		"trailing-",
	}
	for _, raw := range invalid {
		if err := ValidateSecretRefName(raw); err == nil {
			t.Errorf("%q: expected error", raw)
		}
	}
}

func TestNormalizeSecretRefName(t *testing.T) {
	if got := normalizeSecretRefName("  my-new-secret  "); got != "my-new-secret" {
		t.Fatalf("normalizeSecretRefName() = %q, want %q", got, "my-new-secret")
	}
}

func TestValidateSecretName(t *testing.T) {
	if err := ValidateSecretName("my-new-secret"); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if err := ValidateSecretName("   my-new-secret   "); err == nil {
		t.Fatal("expected whitespace error")
	}
}

func TestValidateEndpointURL(t *testing.T) {
	valid := []string{
		"api.openai.com",
		"bedrock.amazonaws.com",
	}
	for _, raw := range valid {
		if err := ValidateEndpointURL(raw); err != nil {
			t.Errorf("%q: unexpected error: %v", raw, err)
		}
	}

	invalid := []string{
		"",
		"   ",
		"localhost",
		"api.openai.com/v1",
		"https://api.openai.com",
		"http://api.openai.com/",
		"ftp://api.openai.com",
	}
	for _, raw := range invalid {
		if err := ValidateEndpointURL(raw); err == nil {
			t.Errorf("%q: expected error", raw)
		}
	}
}
