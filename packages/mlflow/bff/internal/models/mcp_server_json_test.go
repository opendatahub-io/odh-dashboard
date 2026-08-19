package models

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestMCPServerJSONRoundTrip(t *testing.T) {
	raw := `{
		"name": "io.github.example/weather",
		"version": "1.0.0",
		"description": "Weather tools",
		"_meta": {"io.example/deploy": {"source": {"type": "image"}}},
		"packages": [{"registryType": "npm", "identifier": "@example/weather"}],
		"remotes": [{"type": "streamable-http", "url": "https://example.com/mcp"}]
	}`

	var doc MCPServerJSON
	require.NoError(t, json.Unmarshal([]byte(raw), &doc))

	assert.Equal(t, "io.github.example/weather", doc.Name)
	assert.Equal(t, "1.0.0", doc.Version)
	assert.Equal(t, "Weather tools", doc.Description)
	assert.Equal(t, map[string]any{"io.example/deploy": map[string]any{"source": map[string]any{"type": "image"}}}, doc.Meta)
	assert.Contains(t, doc.Extra, "packages")
	assert.Contains(t, doc.Extra, "remotes")
	assert.False(t, doc.IsEmpty())

	encoded, err := json.Marshal(doc)
	require.NoError(t, err)

	var again map[string]any
	require.NoError(t, json.Unmarshal(encoded, &again))
	assert.Equal(t, "io.github.example/weather", again["name"])
	assert.Equal(t, "1.0.0", again["version"])
	assert.Equal(t, "Weather tools", again["description"])
	assert.Contains(t, again, "packages")
	assert.Contains(t, again, "remotes")
	assert.Contains(t, again, "_meta")
}

func TestMCPServerJSONIsEmpty(t *testing.T) {
	assert.True(t, MCPServerJSON{}.IsEmpty())
	assert.False(t, MCPServerJSON{Name: "x"}.IsEmpty())
	assert.False(t, MCPServerJSON{Extra: map[string]any{"packages": []any{}}}.IsEmpty())
}

func TestMCPServerJSONAsMapOmitsEmptyIdentity(t *testing.T) {
	assert.Equal(t, map[string]any{}, MCPServerJSON{}.AsMap())
	assert.Equal(t, map[string]any{"name": "a", "version": "1"}, MCPServerJSON{Name: "a", Version: "1"}.AsMap())
}
