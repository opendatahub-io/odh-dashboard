package controller

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/opendatahub-io/odh-platform-utilities/pkg/cluster"

	v1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
)

func TestDefaultManifestInfo(t *testing.T) {
	tests := []struct {
		name       string
		platform   cluster.Platform
		wantSource string
	}{
		{name: "SelfManagedRhoai", platform: cluster.SelfManagedRhoai, wantSource: "/rhoai"},
		{name: "ManagedRhoai", platform: cluster.ManagedRhoai, wantSource: "/not-supported"},
		{name: "OpenDataHub", platform: cluster.OpenDataHub, wantSource: "/odh"},
		{name: "unknown platform falls back to ODH", platform: cluster.XKS, wantSource: "/odh"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			info := defaultManifestInfo("/base", tt.platform)
			assert.Equal(t, "/base", info.Path)
			assert.Equal(t, "", info.ContextDir)
			assert.Equal(t, tt.wantSource, info.SourcePath)
		})
	}
}

func TestComputeKustomizeVariables(t *testing.T) {
	tests := []struct {
		name      string
		dashboard *v1alpha1.Dashboard
		platform  cluster.Platform
		want      map[string]string
	}{
		{
			name:      "minimal spec, SelfManagedRhoai",
			dashboard: &v1alpha1.Dashboard{},
			platform:  cluster.SelfManagedRhoai,
			want: map[string]string{
				"section-title": "OpenShift Self Managed Services",
			},
		},
		{
			name: "with gateway domain",
			dashboard: &v1alpha1.Dashboard{
				Spec: v1alpha1.DashboardSpec{
					Gateway: &v1alpha1.GatewaySpec{Domain: "rh-ai.apps.example.com"},
				},
			},
			platform: cluster.OpenDataHub,
			want: map[string]string{
				"section-title":  "OpenShift Open Data Hub",
				"gateway-domain": "rh-ai.apps.example.com",
				"dashboard-url":  "https://rh-ai.apps.example.com/",
			},
		},
		{
			name:      "unknown platform",
			dashboard: &v1alpha1.Dashboard{},
			platform:  cluster.Platform("Unknown"),
			want:      map[string]string{},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := computeKustomizeVariables(tt.dashboard, tt.platform)
			assert.Equal(t, tt.want, got)
		})
	}
}

func TestReadExistingParams(t *testing.T) {
	tests := []struct {
		name    string
		content string
		want    map[string]string
	}{
		{
			name:    "empty file",
			content: "",
			want:    map[string]string{},
		},
		{
			name:    "comments and blanks",
			content: "# comment\n\n# another comment\n",
			want:    map[string]string{},
		},
		{
			name:    "key=value pairs",
			content: "key1=value1\nkey2=value2\n",
			want:    map[string]string{"key1": "value1", "key2": "value2"},
		},
		{
			name:    "value with equals sign",
			content: "key=val=ue\n",
			want:    map[string]string{"key": "val=ue"},
		},
		{
			name:    "mixed content",
			content: "# header\nfoo=bar\n\n# comment\nbaz=qux\n",
			want:    map[string]string{"foo": "bar", "baz": "qux"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			path := filepath.Join(t.TempDir(), "params.env")
			require.NoError(t, os.WriteFile(path, []byte(tt.content), 0644))
			got := readExistingParams(path)
			assert.Equal(t, tt.want, got)
		})
	}

	t.Run("nonexistent file", func(t *testing.T) {
		got := readExistingParams("/nonexistent/params.env")
		assert.Empty(t, got)
	})
}

func TestResolveImageParams(t *testing.T) {
	t.Setenv("RELATED_IMAGE_ODH_DASHBOARD_IMAGE", "quay.io/dashboard:latest")
	t.Setenv("RELATED_IMAGE_ODH_MOD_ARCH_MODEL_REGISTRY_IMAGE", "quay.io/mr:v1")
	t.Setenv("RELATED_IMAGE_ODH_AUTOML_IMAGE", "quay.io/automl-runtime:v2")
	t.Setenv("RELATED_IMAGE_ODH_AUTORAG_IMAGE", "quay.io/autorag-runtime:v3")

	got := resolveImageParams()
	assert.Equal(t, "quay.io/dashboard:latest", got["odh-dashboard-image"])
	assert.Equal(t, "quay.io/mr:v1", got["model-registry-ui-image"])
	assert.Equal(t, "quay.io/automl-runtime:v2", got["automl-pipeline-runtime-image"])
	assert.Equal(t, "quay.io/autorag-runtime:v3", got["autorag-pipeline-runtime-image"])
	assert.NotContains(t, got, "gen-ai-ui-image", "unset env vars should not appear")
}

func TestWriteParamsEnv(t *testing.T) {
	dir := t.TempDir()
	params := map[string]string{
		"zebra": "z",
		"alpha": "a",
		"mid":   "m",
	}

	require.NoError(t, writeParamsEnv(dir, params))

	data, err := os.ReadFile(filepath.Join(dir, "params.env"))
	require.NoError(t, err)

	expected := "alpha=a\nmid=m\nzebra=z\n"
	assert.Equal(t, expected, string(data), "params must be sorted alphabetically")
}
