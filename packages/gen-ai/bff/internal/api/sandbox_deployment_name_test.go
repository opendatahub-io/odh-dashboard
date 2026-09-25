package api

import (
	"strings"
	"testing"

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
