package mcp

import (
	"log/slog"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// quietLogger returns a logger that discards output so conversion-failure
// warnings do not pollute test output.
func quietLogger() *slog.Logger {
	return slog.New(slog.DiscardHandler)
}

func TestConvertMCPInputSchema(t *testing.T) {
	tests := []struct {
		name     string
		schema   any
		expected map[string]interface{}
	}{
		{
			name:     "nil input yields empty schema",
			schema:   nil,
			expected: map[string]interface{}{},
		},
		{
			name:     "typed nil map (JSON null) yields empty schema",
			schema:   map[string]interface{}(nil),
			expected: map[string]interface{}{},
		},
		{
			name: "legacy subset keys are preserved",
			schema: map[string]any{
				"type":        "object",
				"title":       "Search",
				"description": "Search the web",
				"properties": map[string]any{
					"query": map[string]any{"type": "string", "description": "query text"},
					"limit": map[string]any{"type": "integer"},
				},
				"required": []any{"query"},
				"enum":     []any{"a", "b"},
			},
			expected: map[string]interface{}{
				"type":        "object",
				"title":       "Search",
				"description": "Search the web",
				"properties": map[string]interface{}{
					"query": map[string]interface{}{"type": "string", "description": "query text"},
					"limit": map[string]interface{}{"type": "integer"},
				},
				"required": []interface{}{"query"},
				"enum":     []interface{}{"a", "b"},
			},
		},
		{
			name: "full server schema with extra JSON-Schema keywords passes through unfiltered",
			schema: map[string]any{
				"$schema":              "https://json-schema.org/draft/2020-12/schema",
				"type":                 "object",
				"additionalProperties": false,
				"default":              map[string]any{"query": ""},
				"format":               "uri",
				"items":                map[string]any{"type": "string"},
				"$defs": map[string]any{
					"positiveInt": map[string]any{"type": "integer", "minimum": 1},
				},
				"anyOf": []any{
					map[string]any{"type": "string"},
					map[string]any{"type": "number"},
				},
				"properties": map[string]any{
					"nested": map[string]any{
						"type": "object",
						"properties": map[string]any{
							"deep": map[string]any{"type": "boolean"},
						},
					},
				},
			},
			expected: map[string]interface{}{
				"$schema":              "https://json-schema.org/draft/2020-12/schema",
				"type":                 "object",
				"additionalProperties": false,
				"default":              map[string]interface{}{"query": ""},
				"format":               "uri",
				"items":                map[string]interface{}{"type": "string"},
				"$defs": map[string]interface{}{
					"positiveInt": map[string]interface{}{"type": "integer", "minimum": float64(1)},
				},
				"anyOf": []interface{}{
					map[string]interface{}{"type": "string"},
					map[string]interface{}{"type": "number"},
				},
				"properties": map[string]interface{}{
					"nested": map[string]interface{}{
						"type": "object",
						"properties": map[string]interface{}{
							"deep": map[string]interface{}{"type": "boolean"},
						},
					},
				},
			},
		},
		{
			name: "typed struct input is normalized to its JSON object shape",
			schema: struct {
				Type string `json:"type"`
			}{Type: "object"},
			expected: map[string]interface{}{"type": "object"},
		},
		{
			name:     "non-object schema (JSON array) yields empty schema",
			schema:   []any{"not", "an", "object"},
			expected: map[string]interface{}{},
		},
		{
			name:     "non-object schema (JSON scalar) yields empty schema",
			schema:   "just a string",
			expected: map[string]interface{}{},
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got := convertMCPInputSchema(quietLogger(), "test-tool", tc.schema)
			require.NotNil(t, got, "must never return nil (JSON field requires an object)")
			assert.Equal(t, tc.expected, got)
		})
	}
}

func TestConvertMCPInputSchemaMarshalFailure(t *testing.T) {
	// A channel cannot be JSON-marshaled; the conversion must fall back to an
	// empty schema rather than panic or return nil.
	got := convertMCPInputSchema(quietLogger(), "test-tool", make(chan int))
	require.NotNil(t, got)
	assert.Empty(t, got)
}
