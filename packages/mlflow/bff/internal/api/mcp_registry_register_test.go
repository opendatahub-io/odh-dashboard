package api

import (
	"testing"

	"github.com/opendatahub-io/mlflow/bff/internal/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestValidateRegisterMCPServerRequest(t *testing.T) {
	validJSON := models.MCPServerJSON{Name: testMCPServerName, Version: "1.0.0"}

	tests := []struct {
		name    string
		req     models.RegisterMCPServerRequest
		wantErr string
	}{
		{
			name: "valid",
			req:  models.RegisterMCPServerRequest{Name: testMCPServerName, ServerJSON: validJSON},
		},
		{
			name:    "invalid server name",
			req:     models.RegisterMCPServerRequest{Name: "not-namespaced", ServerJSON: models.MCPServerJSON{Name: "not-namespaced", Version: "1.0.0"}},
			wantErr: `must be in "<namespace>/<slug>" format`,
		},
		{
			name:    "missing server_json",
			req:     models.RegisterMCPServerRequest{Name: testMCPServerName},
			wantErr: "server_json is required",
		},
		{
			name:    "mismatched server_json name",
			req:     models.RegisterMCPServerRequest{Name: testMCPServerName, ServerJSON: models.MCPServerJSON{Name: "ct.example/other-server", Version: "1.0.0"}},
			wantErr: "must match server name",
		},
		{
			name:    "missing server_json version",
			req:     models.RegisterMCPServerRequest{Name: testMCPServerName, ServerJSON: models.MCPServerJSON{Name: testMCPServerName}},
			wantErr: `server_json "version" is required`,
		},
		{
			name:    "missing server_json name when extra present",
			req:     models.RegisterMCPServerRequest{Name: testMCPServerName, ServerJSON: models.MCPServerJSON{Extra: map[string]any{"foo": "bar"}}},
			wantErr: `server_json "name" is required`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validateRegisterMCPServerRequest(tt.req)
			if tt.wantErr == "" {
				assert.NoError(t, err)
				return
			}
			require.Error(t, err)
			assert.Contains(t, err.Error(), tt.wantErr)
		})
	}
}

func TestToCreateMCPServerVersionRequest(t *testing.T) {
	req := models.RegisterMCPServerRequest{
		Name:       testMCPServerName,
		ServerJSON: models.MCPServerJSON{Name: testMCPServerName, Version: "1.0.0"},
		Status:     models.MCPServerVersionStatusDraft,
		Source:     "catalog",
		Tools:      []models.McpTool{{Name: "search"}},
	}

	got := toCreateMCPServerVersionRequest(req)

	assert.Equal(t, req.ServerJSON, got.ServerJSON)
	assert.Equal(t, req.Status, got.Status)
	assert.Equal(t, req.Source, got.Source)
	assert.Equal(t, []models.MCPTool{
		{
			Name: "search",
			InputSchema: map[string]any{
				"type":       "object",
				"properties": map[string]any{},
			},
		},
	}, got.Tools)
}

func TestMCPServerVersionLocation(t *testing.T) {
	got := mcpServerVersionLocation("com.example/my-server", "1.0.0", "my ns")
	assert.Equal(t, "/api/v1/mcp-registry/servers/com.example/my-server/versions/1.0.0?workspace=my+ns", got)
}

func TestSanitizeMCPIcons(t *testing.T) {
	tests := []struct {
		name  string
		icons []models.MCPIcon
		want  []models.MCPIcon
	}{
		{
			name:  "nil",
			icons: nil,
			want:  nil,
		},
		{
			name:  "empty",
			icons: []models.MCPIcon{},
			want:  nil,
		},
		{
			name: "trims https src and keeps light theme",
			icons: []models.MCPIcon{
				{Src: " https://example.com/icon.svg ", Theme: "light"},
			},
			want: []models.MCPIcon{
				{Src: "https://example.com/icon.svg", Theme: "light"},
			},
		},
		{
			name: "keeps http src and dark theme",
			icons: []models.MCPIcon{
				{Src: "http://insecure.example/x.svg", Theme: "dark"},
			},
			want: []models.MCPIcon{
				{Src: "http://insecure.example/x.svg", Theme: "dark"},
			},
		},
		{
			name: "drops javascript src",
			icons: []models.MCPIcon{
				{Src: "javascript:alert(1)", Theme: "light"},
			},
			want: []models.MCPIcon{},
		},
		{
			name: "drops relative src",
			icons: []models.MCPIcon{
				{Src: "/relative.svg", Theme: "light"},
			},
			want: []models.MCPIcon{},
		},
		{
			name: "strips unknown theme",
			icons: []models.MCPIcon{
				{Src: "https://example.com/plain.svg", Theme: "rainbow"},
			},
			want: []models.MCPIcon{
				{Src: "https://example.com/plain.svg"},
			},
		},
		{
			name: "drops whitespace-only src",
			icons: []models.MCPIcon{
				{Src: "   ", Theme: "light"},
			},
			want: []models.MCPIcon{},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.Equal(t, tt.want, sanitizeMCPIcons(tt.icons))
		})
	}
}

func TestIsAllowedIconURL(t *testing.T) {
	tests := []struct {
		name string
		raw  string
		want bool
	}{
		{name: "https", raw: "https://example.com/icon.svg", want: true},
		{name: "http", raw: "http://example.com/icon.svg", want: true},
		{name: "ftp", raw: "ftp://example.com/icon.svg", want: false},
		{name: "relative", raw: "/relative.svg", want: false},
		{name: "not a url", raw: "not a url", want: false},
		{name: "empty", raw: "", want: false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.Equal(t, tt.want, isAllowedIconURL(tt.raw))
		})
	}
}

func TestDedupeMCPTags(t *testing.T) {
	tests := []struct {
		name string
		tags []models.SetMCPTagRequest
		want []models.SetMCPTagRequest
	}{
		{
			name: "nil",
			tags: nil,
			want: nil,
		},
		{
			name: "drops empty keys, last value wins, preserves first-seen order",
			tags: []models.SetMCPTagRequest{
				{Key: " team ", Value: "first"},
				{Key: "", Value: "skip"},
				{Key: "   ", Value: "skip"},
				{Key: "env", Value: " prod "},
				{Key: "team", Value: "platform"},
			},
			want: []models.SetMCPTagRequest{
				{Key: "team", Value: "platform"},
				{Key: "env", Value: "prod"},
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.Equal(t, tt.want, dedupeMCPTags(tt.tags))
		})
	}
}

func TestBuildMCPServerMetadataUpdate(t *testing.T) {
	t.Run("skips when nothing to update", func(t *testing.T) {
		_, ok := buildMCPServerMetadataUpdate("  ", []models.MCPIcon{{Src: "/relative.svg"}})
		assert.False(t, ok)
	})

	t.Run("sets display name and sanitized icons", func(t *testing.T) {
		req, ok := buildMCPServerMetadataUpdate(" My Server ", []models.MCPIcon{
			{Src: "https://example.com/icon.svg", Theme: "light"},
			{Src: "javascript:alert(1)"},
		})
		require.True(t, ok)
		require.NotNil(t, req.DisplayName)
		assert.Equal(t, "My Server", *req.DisplayName)
		require.NotNil(t, req.Icons)
		assert.Equal(t, []map[string]any{
			{"src": "https://example.com/icon.svg", "theme": "light"},
		}, *req.Icons)
	})

	t.Run("display name only", func(t *testing.T) {
		req, ok := buildMCPServerMetadataUpdate("Named", nil)
		require.True(t, ok)
		require.NotNil(t, req.DisplayName)
		assert.Equal(t, "Named", *req.DisplayName)
		assert.Nil(t, req.Icons)
	})
}

func TestMCPIconsToMaps(t *testing.T) {
	got := mcpIconsToMaps([]models.MCPIcon{
		{Src: "https://example.com/a.svg", Theme: "dark"},
		{Src: "https://example.com/b.svg"},
	})
	assert.Equal(t, []map[string]any{
		{"src": "https://example.com/a.svg", "theme": "dark"},
		{"src": "https://example.com/b.svg"},
	}, got)
}
