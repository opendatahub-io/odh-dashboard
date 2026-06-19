package api

import (
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestValidateAgentPathParams(t *testing.T) {
	tests := []struct {
		name      string
		namespace string
		agentName string
		wantErr   bool
	}{
		{name: "valid", namespace: "agent-ops-demo", agentName: "sample-support-agent", wantErr: false},
		{name: "empty namespace", namespace: "", agentName: "sample-support-agent", wantErr: true},
		{name: "empty name", namespace: "agent-ops-demo", agentName: "", wantErr: true},
		{name: "uppercase namespace", namespace: "Agent-Ops", agentName: "sample-support-agent", wantErr: true},
		{name: "uppercase name", namespace: "agent-ops-demo", agentName: "Sample-Agent", wantErr: true},
		{name: "name too long", namespace: "agent-ops-demo", agentName: strings.Repeat("a", 64), wantErr: true},
		{name: "dotted namespace", namespace: "team.alpha", agentName: "sample-support-agent", wantErr: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validateAgentPathParams(tt.namespace, tt.agentName)
			if tt.wantErr {
				assert.Error(t, err)
				return
			}
			assert.NoError(t, err)
		})
	}
}
