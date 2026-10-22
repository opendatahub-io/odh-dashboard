package controller

import (
	"maps"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gopkg.in/yaml.v3"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"

	"github.com/opendatahub-io/odh-platform-utilities/pkg/cluster"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/render/kustomize"

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
				"section-title":         "OpenShift Self Managed Services",
				"images-oci-base-image": "",
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
				"section-title":         "OpenShift Open Data Hub",
				"gateway-domain":        "rh-ai.apps.example.com",
				"dashboard-url":         "https://rh-ai.apps.example.com/",
				"images-oci-base-image": "",
			},
		},
		{
			name: "configured OCI base image",
			dashboard: &v1alpha1.Dashboard{Spec: v1alpha1.DashboardSpec{
				ModelRegistryOCIBaseImage: "mirror.example.com/library/busybox:1.0",
			}},
			platform: cluster.OpenDataHub,
			want: map[string]string{
				"section-title":         "OpenShift Open Data Hub",
				"images-oci-base-image": "mirror.example.com/library/busybox:1.0",
			},
		},
		{
			name:      "unknown platform",
			dashboard: &v1alpha1.Dashboard{},
			platform:  cluster.Platform("Unknown"),
			want:      map[string]string{"images-oci-base-image": ""},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := computeKustomizeVariables(tt.dashboard, tt.platform)
			require.NoError(t, err)
			assert.Equal(t, tt.want, got)
		})
	}
}

func TestValidateOCIBaseImage(t *testing.T) {
	for _, tt := range []struct {
		name    string
		image   string
		wantErr bool
	}{
		{name: "omitted"},
		{name: "tagged", image: "mirror.example.com/library/busybox:1.0"},
		{name: "Docker Hub shorthand", image: "docker.io/busybox:latest"},
		{name: "Docker Hub canonical", image: "docker.io/library/busybox:latest"},
		{name: "localhost", image: "localhost:5000/library/busybox:1.0"},
		{name: "digest", image: "registry.example.com/library/busybox@sha256:" + strings.Repeat("a", 64)},
		{name: "unqualified", image: "busybox:latest", wantErr: true},
		{name: "missing registry", image: "library/busybox:latest", wantErr: true},
		{name: "blank", image: " ", wantErr: true},
		{name: "newline", image: "mirror.example.com/base:1\nimages-jobs-async-upload=bad", wantErr: true},
		{name: "invalid reference", image: "mirror.example.com/base:bad tag", wantErr: true},
	} {
		t.Run(tt.name, func(t *testing.T) {
			err := validateOCIBaseImage(tt.image)
			if tt.wantErr {
				require.ErrorContains(t, err, "spec.modelRegistryOCIBaseImage")
			} else {
				require.NoError(t, err)
			}
		})
	}
}

func TestOCIBaseImageRendersInPlatformConfigMap(t *testing.T) {
	for _, tt := range []struct {
		name     string
		platform cluster.Platform
	}{
		{name: "ODH", platform: cluster.OpenDataHub},
		{name: "RHOAI", platform: cluster.SelfManagedRhoai},
	} {
		t.Run(tt.name, func(t *testing.T) {
			manifestRoot := t.TempDir()
			require.NoError(t, os.CopyFS(manifestRoot, os.DirFS(filepath.Join("..", "..", "..", "manifests"))))
			dashboard := &v1alpha1.Dashboard{Spec: v1alpha1.DashboardSpec{
				ModelRegistryOCIBaseImage: "mirror.example.com/library/busybox:1.0",
			}}
			manifests := manifestSets(manifestRoot, tt.platform)
			for _, want := range []string{"mirror.example.com/library/busybox:1.0", ""} {
				dashboard.Spec.ModelRegistryOCIBaseImage = want
				require.NoError(t, applyKustomizeParams(dashboard, manifests, tt.platform))
				resources, err := kustomize.NewEngine().Render(manifests[0].String(), kustomize.WithNamespace("test-applications"))
				require.NoError(t, err)
				found := false
				for _, resource := range resources {
					if resource.GetKind() != "ConfigMap" || resource.GetName() != "model-registry-ui-config" {
						continue
					}
					value, ok, err := unstructured.NestedString(resource.Object, "data", "images-oci-base-image")
					require.NoError(t, err)
					require.True(t, ok)
					assert.Equal(t, want, value)
					found = true
				}
				require.True(t, found, "model-registry-ui-config must be rendered")
			}
		})
	}
}

func TestMaaSPortalManifestInfo(t *testing.T) {
	info := maasPortalManifestInfo("/base")
	assert.Equal(t, "/base", info.Path)
	assert.Equal(t, "distributions", info.ContextDir)
	assert.Equal(t, "maas-portal", info.SourcePath)
}

func TestMaaSPortalURL(t *testing.T) {
	tests := []struct {
		name    string
		domain  string
		wantURL string
		wantOK  bool
	}{
		{
			name:    "derives path URL from gateway domain",
			domain:  "rh-ai.apps.example.com",
			wantURL: "https://rh-ai.apps.example.com/maas-portal/",
			wantOK:  true,
		},
		{
			name:    "empty domain cannot be derived",
			domain:  "",
			wantURL: "",
			wantOK:  false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			url, ok := maasPortalURL(tt.domain)
			assert.Equal(t, tt.wantOK, ok)
			assert.Equal(t, tt.wantURL, url)
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
	t.Run("returns mapped params for set env vars", func(t *testing.T) {
		t.Setenv("RELATED_IMAGE_ODH_DASHBOARD_IMAGE", "quay.io/dashboard:latest")
		t.Setenv("RELATED_IMAGE_ODH_MOD_ARCH_MODEL_REGISTRY_IMAGE", "quay.io/mr:v1")
		t.Setenv("RELATED_IMAGE_ODH_MODEL_REGISTRY_OCI_BASE_IMAGE", "registry.internal.test:5000/openshift-ai/busybox:test")
		t.Setenv("RELATED_IMAGE_ODH_AUTOML_IMAGE", "quay.io/automl-runtime:v2")
		t.Setenv("RELATED_IMAGE_ODH_AUTORAG_IMAGE", "quay.io/autorag-runtime:v3")
		t.Setenv("RELATED_IMAGE_ODH_OGX_CORE_IMAGE", "registry.redhat.io/rhoai/odh-ogx-core-rhel9@sha256:abc123")
		t.Setenv("RELATED_IMAGE_POSTGRESQL_16_IMAGE", "registry.redhat.io/rhel9/postgresql-16@sha256:abc123")

		got := resolveImageParams()
		assert.Equal(t, "quay.io/dashboard:latest", got["odh-dashboard-image"])
		assert.Equal(t, "quay.io/mr:v1", got["model-registry-ui-image"])
		assert.NotContains(t, got, "images-oci-base-image", "the legacy env var must not override the CR")
		assert.Equal(t, "quay.io/automl-runtime:v2", got["automl-pipeline-runtime-image"])
		assert.Equal(t, "quay.io/autorag-runtime:v3", got["autorag-pipeline-runtime-image"])
		assert.Equal(t, "registry.redhat.io/rhoai/odh-ogx-core-rhel9@sha256:abc123", got["ogx-core-image"])
		assert.Equal(t, "registry.redhat.io/rhel9/postgresql-16@sha256:abc123", got["pgvector-image"])
		assert.NotContains(t, got, "gen-ai-ui-image", "unset env vars should not appear")
	})

	t.Run("returns empty map when no env vars are set", func(t *testing.T) {
		for _, envVar := range imagesMap {
			t.Setenv(envVar, "")
		}

		got := resolveImageParams()
		assert.Empty(t, got, "empty env vars must not produce overrides")
	})
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

func TestParamsPreservation(t *testing.T) {
	dir := t.TempDir()

	existing := "module-specific-key=module-value\nshared-key=original\n"
	require.NoError(t, os.WriteFile(filepath.Join(dir, "params.env"), []byte(existing), 0644))

	params := readExistingParams(filepath.Join(dir, "params.env"))
	computed := map[string]string{
		"computed-key": "computed-value",
		"shared-key":   "overwritten-by-computed",
	}
	maps.Copy(params, computed)
	require.NoError(t, writeParamsEnv(dir, params))

	result := readExistingParams(filepath.Join(dir, "params.env"))
	assert.Equal(t, "module-value", result["module-specific-key"], "existing module-specific params must be preserved")
	assert.Equal(t, "computed-value", result["computed-key"], "computed params must be added")
	assert.Equal(t, "overwritten-by-computed", result["shared-key"], "computed params must take precedence over existing")
}

func TestImagesMapContainsAllModules(t *testing.T) {
	for name, mod := range moduleRegistry {
		t.Run(name, func(t *testing.T) {
			paramKey := mod.ManifestSlug + "-ui-image"
			envVar, ok := imagesMap[paramKey]
			assert.True(t, ok, "imagesMap missing entry (expected key %q)", paramKey)
			assert.Equal(t, mod.ImageEnvVar, envVar, "imagesMap env var mismatch")
		})
	}
}

func TestValuesYAMLContainsAllModuleEnvVars(t *testing.T) {
	data, err := os.ReadFile(filepath.Join("..", "..", "charts", "dashboard", "values.yaml"))
	require.NoError(t, err)

	var values struct {
		RelatedImages map[string]string `yaml:"relatedImages"`
	}
	require.NoError(t, yaml.Unmarshal(data, &values))
	require.NotNil(t, values.RelatedImages, "values.yaml must have a relatedImages section")

	for paramKey, envVar := range imagesMap {
		t.Run(paramKey, func(t *testing.T) {
			_, ok := values.RelatedImages[envVar]
			assert.True(t, ok, "relatedImages must contain key %q (for param %q)", envVar, paramKey)
		})
	}
}

func TestNamespaceInjection(t *testing.T) {
	dir := t.TempDir()

	kustomizationYAML := `apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - configmap.yaml
  - serviceaccount.yaml
  - deployment.yaml
  - networkpolicy.yaml
`
	configmapYAML := `apiVersion: v1
kind: ConfigMap
metadata:
  name: test-config
data:
  key: value
`
	saYAML := `apiVersion: v1
kind: ServiceAccount
metadata:
  name: test-sa
`
	deployYAML := `apiVersion: apps/v1
kind: Deployment
metadata:
  name: test-deploy
spec:
  selector:
    matchLabels:
      app: test
  template:
    metadata:
      labels:
        app: test
    spec:
      containers:
        - name: main
          image: busybox:latest
`
	npYAML := `apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: test-np
spec:
  podSelector: {}
`

	for name, content := range map[string]string{
		"kustomization.yaml":  kustomizationYAML,
		"configmap.yaml":      configmapYAML,
		"serviceaccount.yaml": saYAML,
		"deployment.yaml":     deployYAML,
		"networkpolicy.yaml":  npYAML,
	} {
		require.NoError(t, os.WriteFile(filepath.Join(dir, name), []byte(content), 0644))
	}

	const targetNS = "test-target-ns"

	engine := kustomize.NewEngine()
	rendered, err := engine.Render(dir, kustomize.WithNamespace(targetNS))
	require.NoError(t, err)
	require.Len(t, rendered, 4, "kustomize must render every fixture resource")

	for _, res := range rendered {
		ns := res.GetNamespace()
		kind := res.GetKind()
		name := res.GetName()
		assert.Equalf(t, targetNS, ns,
			"%s/%s must have namespace %q after WithNamespace injection", kind, name, targetNS)
	}
}
