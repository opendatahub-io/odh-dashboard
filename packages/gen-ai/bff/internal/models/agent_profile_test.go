package models

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/require"
	"gopkg.in/yaml.v2"
)

func TestMCPServerReferenceAllowedToolsPresence(t *testing.T) {
	tests := []struct {
		name         string
		input        string
		wantTools    string
		wantPresence bool
	}{
		{
			name:  "omitted means all tools are allowed",
			input: `{"name":"com.example/kubernetes","source":"mlflow"}`,
		},
		{
			name:         "explicitly empty means no tools are allowed",
			input:        `{"name":"com.example/kubernetes","source":"mlflow","allowedTools":[]}`,
			wantTools:    `[]`,
			wantPresence: true,
		},
		{
			name:         "populated list restricts tools",
			input:        `{"name":"com.example/kubernetes","source":"mlflow","allowedTools":["pods_list_in_namespace"]}`,
			wantTools:    `["pods_list_in_namespace"]`,
			wantPresence: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var reference MCPServerReference
			require.NoError(t, json.Unmarshal([]byte(tt.input), &reference))

			persisted, err := yaml.Marshal(reference)
			require.NoError(t, err)
			var restored MCPServerReference
			require.NoError(t, yaml.Unmarshal(persisted, &restored))

			response, err := json.Marshal(restored)
			require.NoError(t, err)
			var fields map[string]json.RawMessage
			require.NoError(t, json.Unmarshal(response, &fields))
			tools, present := fields["allowedTools"]
			require.Equal(t, tt.wantPresence, present, "persisted YAML: %s", persisted)
			if tt.wantPresence {
				require.JSONEq(t, tt.wantTools, string(tools))
			}
		})
	}
}
