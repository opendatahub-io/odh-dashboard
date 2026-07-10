package controller

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"

	"github.com/opendatahub-io/odh-platform-utilities/pkg/cluster"

	v1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
)

func TestStandaloneServiceName(t *testing.T) {
	tests := []struct {
		name     string
		platform cluster.Platform
		slug     string
		want     string
	}{
		{
			name:     "ODH platform",
			platform: cluster.OpenDataHub,
			slug:     "model-registry",
			want:     "odh-dashboard-model-registry-ui",
		},
		{
			name:     "SelfManagedRhoai platform",
			platform: cluster.SelfManagedRhoai,
			slug:     "gen-ai",
			want:     "rhods-dashboard-gen-ai-ui",
		},
		{
			name:     "ManagedRhoai platform",
			platform: cluster.ManagedRhoai,
			slug:     "maas",
			want:     "rhods-dashboard-maas-ui",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := standaloneServiceName(tt.platform, tt.slug)
			assert.Equal(t, tt.want, got)
		})
	}
}

func TestAddInterBFFParams(t *testing.T) {
	allDeployed := func() map[string]v1alpha1.ModuleStatus {
		s := make(map[string]v1alpha1.ModuleStatus)
		for name := range moduleRegistry {
			s[name] = v1alpha1.ModuleStatus{Phase: v1alpha1.ModulePhaseDeployed}
		}
		return s
	}

	t.Run("injects env vars when target is deployed", func(t *testing.T) {
		params := make(map[string]string)
		got := addInterBFFParams(params, allDeployed(), cluster.OpenDataHub)
		assert.Equal(t, "odh-dashboard-maas-ui", got["BFF_MAAS_SERVICE_NAME"])
		assert.NotEmpty(t, got["BFF_MAAS_SERVICE_PORT"])
	})

	t.Run("skips injection when target is disabled", func(t *testing.T) {
		statuses := allDeployed()
		statuses["maas"] = v1alpha1.ModuleStatus{Phase: v1alpha1.ModulePhaseDisabled}
		params := make(map[string]string)
		got := addInterBFFParams(params, statuses, cluster.OpenDataHub)
		assert.NotContains(t, got, "BFF_MAAS_SERVICE_NAME")
		assert.NotContains(t, got, "BFF_MAAS_SERVICE_PORT")
	})

	t.Run("injects env vars when target is degraded", func(t *testing.T) {
		statuses := allDeployed()
		statuses["maas"] = v1alpha1.ModuleStatus{Phase: v1alpha1.ModulePhaseDegraded}
		params := make(map[string]string)
		got := addInterBFFParams(params, statuses, cluster.OpenDataHub)
		assert.Equal(t, "odh-dashboard-maas-ui", got["BFF_MAAS_SERVICE_NAME"])
	})

	t.Run("skips injection when target is not deployed", func(t *testing.T) {
		statuses := allDeployed()
		statuses["maas"] = v1alpha1.ModuleStatus{Phase: v1alpha1.ModulePhaseNotDeployed}
		params := make(map[string]string)
		got := addInterBFFParams(params, statuses, cluster.OpenDataHub)
		assert.NotContains(t, got, "BFF_MAAS_SERVICE_NAME")
	})

	t.Run("uses RHOAI prefix for RHOAI platforms", func(t *testing.T) {
		params := make(map[string]string)
		got := addInterBFFParams(params, allDeployed(), cluster.SelfManagedRhoai)
		assert.Equal(t, "rhods-dashboard-maas-ui", got["BFF_MAAS_SERVICE_NAME"])
	})
}

func TestBuildFederationConfigMap(t *testing.T) {
	reconciler := &DashboardReconciler{
		Platform:              cluster.OpenDataHub,
		ApplicationsNamespace: "test-ns",
	}

	t.Run("includes only deployed and degraded modules", func(t *testing.T) {
		statuses := map[string]v1alpha1.ModuleStatus{
			"modelRegistry": {Phase: v1alpha1.ModulePhaseDeployed},
			"genAi":         {Phase: v1alpha1.ModulePhaseDisabled},
			"mlflow":        {Phase: v1alpha1.ModulePhaseDeployed},
			"maas":          {Phase: v1alpha1.ModulePhaseNotDeployed},
			"evalHub":       {Phase: v1alpha1.ModulePhaseDegraded},
			"automl":        {Phase: v1alpha1.ModulePhaseDisabled},
			"autorag":       {Phase: v1alpha1.ModulePhaseDisabled},
			"agentOps":      {Phase: v1alpha1.ModulePhaseDisabled},
		}

		dashboard := &v1alpha1.Dashboard{}
		cm, err := reconciler.buildFederationConfigMap(statuses, dashboard)
		require.NoError(t, err)

		var entries []federationEntry
		require.NoError(t, json.Unmarshal([]byte(cm.Data[federationConfigKey]), &entries))

		names := make(map[string]bool)
		for _, e := range entries {
			names[e.Name] = true
		}
		assert.True(t, names["modelRegistry"])
		assert.True(t, names["mlflow"])
		assert.True(t, names["evalHub"])
		assert.False(t, names["genAi"])
		assert.False(t, names["maas"])
	})

	t.Run("deployed modules are enabled, degraded are not", func(t *testing.T) {
		statuses := map[string]v1alpha1.ModuleStatus{
			"modelRegistry": {Phase: v1alpha1.ModulePhaseDeployed},
			"genAi":         {Phase: v1alpha1.ModulePhaseDegraded},
		}
		for name := range moduleRegistry {
			if _, ok := statuses[name]; !ok {
				statuses[name] = v1alpha1.ModuleStatus{Phase: v1alpha1.ModulePhaseDisabled}
			}
		}

		dashboard := &v1alpha1.Dashboard{}
		cm, err := reconciler.buildFederationConfigMap(statuses, dashboard)
		require.NoError(t, err)

		var entries []federationEntry
		require.NoError(t, json.Unmarshal([]byte(cm.Data[federationConfigKey]), &entries))

		for _, e := range entries {
			switch e.Name {
			case "modelRegistry":
				assert.True(t, e.Enabled)
			case "genAi":
				assert.False(t, e.Enabled)
			}
		}
	})

	t.Run("entries are sorted by name", func(t *testing.T) {
		statuses := make(map[string]v1alpha1.ModuleStatus)
		for name := range moduleRegistry {
			statuses[name] = v1alpha1.ModuleStatus{Phase: v1alpha1.ModulePhaseDeployed}
		}

		dashboard := &v1alpha1.Dashboard{}
		cm, err := reconciler.buildFederationConfigMap(statuses, dashboard)
		require.NoError(t, err)

		var entries []federationEntry
		require.NoError(t, json.Unmarshal([]byte(cm.Data[federationConfigKey]), &entries))

		for i := 1; i < len(entries); i++ {
			assert.True(t, entries[i-1].Name < entries[i].Name,
				"entries not sorted: %s >= %s", entries[i-1].Name, entries[i].Name)
		}
	})

	t.Run("includes perses entry when observability is enabled", func(t *testing.T) {
		statuses := make(map[string]v1alpha1.ModuleStatus)
		for name := range moduleRegistry {
			statuses[name] = v1alpha1.ModuleStatus{Phase: v1alpha1.ModulePhaseDisabled}
		}

		dashboard := &v1alpha1.Dashboard{
			Spec: v1alpha1.DashboardSpec{
				Observability: &v1alpha1.ObservabilitySpec{
					Enabled: true,
					PersesService: &v1alpha1.ServiceTarget{
						Name:      "perses-svc",
						Namespace: "perses-ns",
						Port:      8080,
					},
				},
			},
		}

		cm, err := reconciler.buildFederationConfigMap(statuses, dashboard)
		require.NoError(t, err)

		var entries []federationEntry
		require.NoError(t, json.Unmarshal([]byte(cm.Data[federationConfigKey]), &entries))

		var found bool
		for _, e := range entries {
			if e.Name == "perses" {
				found = true
				require.Len(t, e.ProxyService, 1)
				assert.Equal(t, "perses-svc", e.ProxyService[0].Service.Name)
				assert.Equal(t, "perses-ns", e.ProxyService[0].Service.Namespace)
				assert.Equal(t, int32(8080), e.ProxyService[0].Service.Port)
			}
		}
		assert.True(t, found, "perses entry should be present")
	})

	t.Run("includes mlflowEmbedded when mlflow is deployed", func(t *testing.T) {
		statuses := make(map[string]v1alpha1.ModuleStatus)
		for name := range moduleRegistry {
			statuses[name] = v1alpha1.ModuleStatus{Phase: v1alpha1.ModulePhaseDisabled}
		}
		statuses["mlflow"] = v1alpha1.ModuleStatus{Phase: v1alpha1.ModulePhaseDeployed}

		dashboard := &v1alpha1.Dashboard{}
		cm, err := reconciler.buildFederationConfigMap(statuses, dashboard)
		require.NoError(t, err)

		var entries []federationEntry
		require.NoError(t, json.Unmarshal([]byte(cm.Data[federationConfigKey]), &entries))

		var found bool
		for _, e := range entries {
			if e.Name == "mlflowEmbedded" {
				found = true
				assert.True(t, e.Enabled)
				assert.Equal(t, int32(8443), e.Service.Port)
			}
		}
		assert.True(t, found, "mlflowEmbedded entry should be present")
	})

	t.Run("ConfigMap metadata is correct", func(t *testing.T) {
		statuses := make(map[string]v1alpha1.ModuleStatus)
		for name := range moduleRegistry {
			statuses[name] = v1alpha1.ModuleStatus{Phase: v1alpha1.ModulePhaseDisabled}
		}

		dashboard := &v1alpha1.Dashboard{}
		cm, err := reconciler.buildFederationConfigMap(statuses, dashboard)
		require.NoError(t, err)

		assert.Equal(t, federationConfigMapName, cm.Name)
		assert.Equal(t, "test-ns", cm.Namespace)
		assert.Contains(t, cm.Data, federationConfigKey)
	})
}

func TestConfigMapToUnstructured(t *testing.T) {
	t.Run("converts a ConfigMap successfully", func(t *testing.T) {
		cm := &corev1.ConfigMap{
			Data: map[string]string{"key": "value"},
		}
		u, err := configMapToUnstructured(cm)
		require.NoError(t, err)
		data, found, err := unstructured.NestedStringMap(u.Object, "data")
		require.NoError(t, err)
		assert.True(t, found)
		assert.Equal(t, "value", data["key"])
	})

	t.Run("preserves TypeMeta when set", func(t *testing.T) {
		cm := &corev1.ConfigMap{}
		cm.APIVersion = "v1"
		cm.Kind = "ConfigMap"
		cm.Data = map[string]string{"a": "b"}

		u, err := configMapToUnstructured(cm)
		require.NoError(t, err)
		assert.Equal(t, "ConfigMap", u.GetKind())
		assert.Equal(t, "v1", u.GetAPIVersion())
	})
}
