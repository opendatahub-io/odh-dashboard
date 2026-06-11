package controller

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	v1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
)

func TestIsComponentAvailable(t *testing.T) {
	tests := []struct {
		name       string
		components map[string]v1alpha1.ComponentAvailability
		component  string
		want       bool
	}{
		{
			name:       "managed component is available",
			components: map[string]v1alpha1.ComponentAvailability{"modelregistry": {ManagementState: "Managed"}},
			component:  "modelregistry",
			want:       true,
		},
		{
			name:       "unmanaged component is available",
			components: map[string]v1alpha1.ComponentAvailability{"modelregistry": {ManagementState: "Unmanaged"}},
			component:  "modelregistry",
			want:       true,
		},
		{
			name:       "removed component is not available",
			components: map[string]v1alpha1.ComponentAvailability{"modelregistry": {ManagementState: "Removed"}},
			component:  "modelregistry",
			want:       false,
		},
		{
			name:       "missing component is not available",
			components: map[string]v1alpha1.ComponentAvailability{},
			component:  "modelregistry",
			want:       false,
		},
		{
			name:       "nil map",
			components: nil,
			component:  "modelregistry",
			want:       false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := isComponentAvailable(tt.components, tt.component)
			assert.Equal(t, tt.want, got)
		})
	}
}

func TestResolveModuleStatuses(t *testing.T) {
	tests := []struct {
		name        string
		spec        v1alpha1.DashboardSpec
		wantPhases  map[string]v1alpha1.ModulePhase
		wantReason  map[string]string
		wantMessage map[string]string
	}{
		{
			name: "all components available, observability enabled",
			spec: v1alpha1.DashboardSpec{
				Components: map[string]v1alpha1.ComponentAvailability{
					"modelregistry":  {ManagementState: "Managed"},
					"mlflowoperator": {ManagementState: "Managed"},
				},
				Observability: &v1alpha1.ObservabilitySpec{
					Enabled:       true,
					PersesService: &v1alpha1.ServiceTarget{Name: "perses", Namespace: "monitoring", Port: 8080},
				},
			},
			wantPhases: map[string]v1alpha1.ModulePhase{
				"modelRegistry":  v1alpha1.ModulePhaseDeployed,
				"genAi":          v1alpha1.ModulePhaseDeployed,
				"mlflow":         v1alpha1.ModulePhaseDeployed,
				"mlflowEmbedded": v1alpha1.ModulePhaseDeployed,
				"maas":           v1alpha1.ModulePhaseDeployed,
				"evalHub":        v1alpha1.ModulePhaseDeployed,
				"automl":         v1alpha1.ModulePhaseDeployed,
				"autorag":        v1alpha1.ModulePhaseDeployed,
				"perses":         v1alpha1.ModulePhaseDeployed,
			},
			wantMessage: map[string]string{
				"perses": "Proxying to perses.monitoring:8080",
			},
		},
		{
			name: "empty spec — modules with no deps deployed, others not",
			spec: v1alpha1.DashboardSpec{},
			wantPhases: map[string]v1alpha1.ModulePhase{
				"modelRegistry":  v1alpha1.ModulePhaseNotDeployed,
				"genAi":          v1alpha1.ModulePhaseDeployed,
				"mlflow":         v1alpha1.ModulePhaseNotDeployed,
				"mlflowEmbedded": v1alpha1.ModulePhaseNotDeployed,
				"maas":           v1alpha1.ModulePhaseDeployed,
				"evalHub":        v1alpha1.ModulePhaseDeployed,
				"automl":         v1alpha1.ModulePhaseDeployed,
				"autorag":        v1alpha1.ModulePhaseDeployed,
				"perses":         v1alpha1.ModulePhaseNotDeployed,
			},
			wantReason: map[string]string{
				"modelRegistry":  "ComponentNotAvailable",
				"mlflow":         "ComponentNotAvailable",
				"mlflowEmbedded": "ComponentNotAvailable",
				"perses":         "ObservabilityDisabled",
			},
		},
		{
			name: "explicit disable override",
			spec: v1alpha1.DashboardSpec{
				Modules: map[string]v1alpha1.ModuleOverride{
					"genAi": {State: v1alpha1.ModuleDisabled},
				},
			},
			wantPhases: map[string]v1alpha1.ModulePhase{
				"genAi": v1alpha1.ModulePhaseDisabled,
			},
			wantReason: map[string]string{
				"genAi": "ExplicitOverride",
			},
		},
		{
			name: "explicit enable bypasses DSC component check",
			spec: v1alpha1.DashboardSpec{
				Modules: map[string]v1alpha1.ModuleOverride{
					"modelRegistry": {State: v1alpha1.ModuleEnabled},
				},
			},
			wantPhases: map[string]v1alpha1.ModulePhase{
				"modelRegistry": v1alpha1.ModulePhaseDeployed,
			},
			wantReason: map[string]string{
				"modelRegistry": "ExplicitOverride",
			},
		},
		{
			name: "component removed — dependent module not deployed",
			spec: v1alpha1.DashboardSpec{
				Components: map[string]v1alpha1.ComponentAvailability{
					"modelregistry":  {ManagementState: "Managed"},
					"mlflowoperator": {ManagementState: "Removed"},
				},
			},
			wantPhases: map[string]v1alpha1.ModulePhase{
				"modelRegistry":  v1alpha1.ModulePhaseDeployed,
				"mlflow":         v1alpha1.ModulePhaseNotDeployed,
				"mlflowEmbedded": v1alpha1.ModulePhaseNotDeployed,
			},
			wantReason: map[string]string{
				"mlflow":         "ComponentNotAvailable",
				"mlflowEmbedded": "ComponentNotAvailable",
			},
		},
		{
			name: "inter-module dep — mlflow disabled cascades to mlflowEmbedded",
			spec: v1alpha1.DashboardSpec{
				Components: map[string]v1alpha1.ComponentAvailability{
					"mlflowoperator": {ManagementState: "Managed"},
				},
				Modules: map[string]v1alpha1.ModuleOverride{
					"mlflow": {State: v1alpha1.ModuleDisabled},
				},
			},
			wantPhases: map[string]v1alpha1.ModulePhase{
				"mlflow":         v1alpha1.ModulePhaseDisabled,
				"mlflowEmbedded": v1alpha1.ModulePhaseNotDeployed,
			},
			wantReason: map[string]string{
				"mlflow":         "ExplicitOverride",
				"mlflowEmbedded": "ModuleDependencyNotSatisfied",
			},
		},
		{
			name: "observability enabled without perses service config",
			spec: v1alpha1.DashboardSpec{
				Observability: &v1alpha1.ObservabilitySpec{
					Enabled: true,
				},
			},
			wantPhases: map[string]v1alpha1.ModulePhase{
				"perses": v1alpha1.ModulePhaseNotDeployed,
			},
			wantReason: map[string]string{
				"perses": "MissingPersesServiceConfig",
			},
		},
		{
			name: "observability disabled",
			spec: v1alpha1.DashboardSpec{
				Observability: &v1alpha1.ObservabilitySpec{
					Enabled: false,
				},
			},
			wantPhases: map[string]v1alpha1.ModulePhase{
				"perses": v1alpha1.ModulePhaseNotDeployed,
			},
			wantReason: map[string]string{
				"perses": "ObservabilityDisabled",
			},
		},
		{
			name: "all modules disabled via overrides",
			spec: v1alpha1.DashboardSpec{
				Modules: map[string]v1alpha1.ModuleOverride{
					"modelRegistry":  {State: v1alpha1.ModuleDisabled},
					"genAi":          {State: v1alpha1.ModuleDisabled},
					"mlflow":         {State: v1alpha1.ModuleDisabled},
					"mlflowEmbedded": {State: v1alpha1.ModuleDisabled},
					"maas":           {State: v1alpha1.ModuleDisabled},
					"evalHub":        {State: v1alpha1.ModuleDisabled},
					"automl":         {State: v1alpha1.ModuleDisabled},
					"autorag":        {State: v1alpha1.ModuleDisabled},
				},
			},
			wantPhases: map[string]v1alpha1.ModulePhase{
				"modelRegistry":  v1alpha1.ModulePhaseDisabled,
				"genAi":          v1alpha1.ModulePhaseDisabled,
				"mlflow":         v1alpha1.ModulePhaseDisabled,
				"mlflowEmbedded": v1alpha1.ModulePhaseDisabled,
				"maas":           v1alpha1.ModulePhaseDisabled,
				"evalHub":        v1alpha1.ModulePhaseDisabled,
				"automl":         v1alpha1.ModulePhaseDisabled,
				"autorag":        v1alpha1.ModulePhaseDisabled,
				"perses":         v1alpha1.ModulePhaseNotDeployed,
			},
		},
		{
			name: "explicit enable does not bypass inter-module deps",
			spec: v1alpha1.DashboardSpec{
				Modules: map[string]v1alpha1.ModuleOverride{
					"mlflowEmbedded": {State: v1alpha1.ModuleEnabled},
				},
			},
			wantPhases: map[string]v1alpha1.ModulePhase{
				"mlflow":         v1alpha1.ModulePhaseNotDeployed,
				"mlflowEmbedded": v1alpha1.ModulePhaseNotDeployed,
			},
			wantReason: map[string]string{
				"mlflow":         "ComponentNotAvailable",
				"mlflowEmbedded": "ModuleDependencyNotSatisfied",
			},
		},
		{
			name: "explicit enable with satisfied module deps deploys",
			spec: v1alpha1.DashboardSpec{
				Components: map[string]v1alpha1.ComponentAvailability{
					"mlflowoperator": {ManagementState: "Managed"},
				},
				Modules: map[string]v1alpha1.ModuleOverride{
					"mlflowEmbedded": {State: v1alpha1.ModuleEnabled},
				},
			},
			wantPhases: map[string]v1alpha1.ModulePhase{
				"mlflow":         v1alpha1.ModulePhaseDeployed,
				"mlflowEmbedded": v1alpha1.ModulePhaseDeployed,
			},
			wantReason: map[string]string{
				"mlflow":         "DependenciesSatisfied",
				"mlflowEmbedded": "DependenciesSatisfied",
			},
		},
		{
			name: "unknown module override key produces UnknownModule status",
			spec: v1alpha1.DashboardSpec{
				Modules: map[string]v1alpha1.ModuleOverride{
					"modelregistry": {State: v1alpha1.ModuleEnabled},
				},
			},
			wantPhases: map[string]v1alpha1.ModulePhase{
				"modelregistry": v1alpha1.ModulePhaseNotDeployed,
			},
			wantReason: map[string]string{
				"modelregistry": "UnknownModule",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := resolveModuleStatuses(&tt.spec)

			require.GreaterOrEqual(t, len(got), len(moduleRegistry), "should include at least every registered module")

			for name, wantPhase := range tt.wantPhases {
				status, ok := got[name]
				require.True(t, ok, "module %q should be in results", name)
				assert.Equal(t, wantPhase, status.Phase, "module %q phase", name)
				assert.False(t, status.LastTransitionTime.IsZero(), "module %q should have LastTransitionTime set", name)
			}

			for name, wantReason := range tt.wantReason {
				assert.Equal(t, wantReason, got[name].Reason, "module %q reason", name)
			}

			for name, wantMsg := range tt.wantMessage {
				assert.Equal(t, wantMsg, got[name].Message, "module %q message", name)
			}
		})
	}
}

func TestModuleRegistry(t *testing.T) {
	assert.Len(t, moduleRegistry, 9, "expected 9 modules in registry")

	for name, mod := range moduleRegistry {
		t.Run(name, func(t *testing.T) {
			assert.Equal(t, name, mod.Name, "module name must match registry key")

			switch mod.Type {
			case ModuleTypeBFF:
				assert.NotEmpty(t, mod.ContainerName, "BFF module must have ContainerName")
				assert.Greater(t, mod.Port, int32(0), "BFF module must have Port > 0")
				assert.NotEmpty(t, mod.ImageEnvVar, "BFF module must have ImageEnvVar")
			case ModuleTypeEmbedded, ModuleTypeProxyService:
				assert.Empty(t, mod.ContainerName, "non-BFF module should not have ContainerName")
				assert.Equal(t, int32(0), mod.Port, "non-BFF module should have Port == 0")
			default:
				t.Errorf("unknown module type: %s", mod.Type)
			}
		})
	}
}

func TestModuleNames(t *testing.T) {
	names := ModuleNames()
	assert.Len(t, names, 9)
	assert.Equal(t, names[0], "automl", "names should be sorted alphabetically")
	assert.Equal(t, names[len(names)-1], "perses")
}
