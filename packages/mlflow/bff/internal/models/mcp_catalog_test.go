package models

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func strPtr(s string) *string { return &s }
func boolPtr(b bool) *bool    { return &b }

func TestCatalogToolsToRegistryTools(t *testing.T) {
	tools := []McpTool{
		{
			Name:        "list_pods",
			Description: strPtr("List pods"),
			AccessType:  "read_only",
			Parameters: []McpToolParameter{
				{Name: "ns", Type: "string", Description: strPtr("Namespace"), Required: true},
				{Name: "label", Type: "string", Required: false},
			},
		},
		{
			Name:       "old_tool",
			AccessType: "execute",
			Revoked:    boolPtr(true),
		},
	}

	converted := CatalogToolsToRegistryTools(tools)
	require.Len(t, converted, 1)
	assert.Equal(t, "list_pods", converted[0].Name)
	assert.Equal(t, "List pods", converted[0].Description)
	require.NotNil(t, converted[0].InputSchema)
	assert.Equal(t, "object", converted[0].InputSchema["type"])
	properties, ok := converted[0].InputSchema["properties"].(map[string]any)
	require.True(t, ok)
	assert.Equal(t, map[string]any{"type": "string", "description": "Namespace"}, properties["ns"])
	assert.Equal(t, map[string]any{"type": "string"}, properties["label"])
	assert.Equal(t, []string{"ns"}, converted[0].InputSchema["required"])
}

func TestCatalogToolsToRegistryToolsEmpty(t *testing.T) {
	tests := []struct {
		name  string
		tools []McpTool
	}{
		{name: "nil", tools: nil},
		{name: "empty slice", tools: []McpTool{}},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.Nil(t, CatalogToolsToRegistryTools(tt.tools))
		})
	}
}
