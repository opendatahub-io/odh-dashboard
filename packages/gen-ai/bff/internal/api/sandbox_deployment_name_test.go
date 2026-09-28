package api

import (
	"strings"
	"testing"

	"github.com/opendatahub-io/gen-ai/internal/models"
	"github.com/stretchr/testify/assert"
)

func TestValidateSandboxDeploymentName(t *testing.T) {
	tests := []struct {
		name       string
		deployment string
		namespace  string
		wantErr    string
	}{
		{name: "valid service limit", deployment: strings.Repeat("a", 54), namespace: "a"},
		{name: "invalid DNS label", deployment: "Agent_Name", namespace: "project", wantErr: "DNS-1035"},
		{name: "must start with a letter", deployment: "1agent", namespace: "project", wantErr: "DNS-1035"},
		{name: "exceeds service limit", deployment: strings.Repeat("a", 55), namespace: "a", wantErr: "at most 54"},
		{name: "exceeds route host label limit", deployment: strings.Repeat("a", 38), namespace: strings.Repeat("n", 20), wantErr: "at most 37"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validateSandboxDeploymentName(tt.deployment, tt.namespace)
			if tt.wantErr == "" {
				assert.NoError(t, err)
				return
			}
			assert.ErrorContains(t, err, tt.wantErr)
		})
	}
}

func TestValidateSandboxModelSourceType(t *testing.T) {
	tests := []struct {
		name       string
		sourceType string
		wantErr    string
	}{
		{name: "MaaS", sourceType: "maas"},
		{name: "namespace", sourceType: "namespace"},
		{name: "custom endpoint", sourceType: "custom_endpoint"},
		{name: "missing", wantErr: "is required"},
		{name: "unsupported", sourceType: "unknown", wantErr: "is unsupported"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validateSandboxModelSourceType(tt.sourceType)
			if tt.wantErr == "" {
				assert.NoError(t, err)
				return
			}
			assert.ErrorContains(t, err, tt.wantErr)
		})
	}
}

func TestProfileWithCustomEndpointProviderURL(t *testing.T) {
	profile := &models.AgentProfile{Spec: models.AgentProfileSpec{
		Model: models.ModelReference{
			ID:  "configured-model",
			URI: "https://attacker.invalid/v1",
		},
	}}

	deploymentProfile := profileWithCustomEndpointProviderURL(profile, "https://configured.example.com/v1")

	assert.Equal(t, "https://configured.example.com/v1", deploymentProfile.Spec.Model.URI)
	assert.Equal(t, "https://attacker.invalid/v1", profile.Spec.Model.URI)
	assert.Equal(t, profile.Spec.Model.ID, deploymentProfile.Spec.Model.ID)
}
