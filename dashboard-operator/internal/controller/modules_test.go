package controller

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	v1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
)

func TestResolveModuleStatuses(t *testing.T) {
	tests := []struct {
		name        string
		spec        v1alpha1.DashboardSpec
		wantLen     int
		wantPhases  map[string]v1alpha1.ModulePhase
		wantReason  map[string]string
		wantMessage map[string]string
	}{
		{
			name:    "default spec — all modules deployed",
			wantLen: 8,
			spec:    v1alpha1.DashboardSpec{},
			wantPhases: map[string]v1alpha1.ModulePhase{
				"modelRegistry": v1alpha1.ModulePhaseDeployed,
				"genAi":         v1alpha1.ModulePhaseDeployed,
				"mlflow":        v1alpha1.ModulePhaseDeployed,
				"maas":          v1alpha1.ModulePhaseDeployed,
				"evalHub":       v1alpha1.ModulePhaseDeployed,
				"automl":        v1alpha1.ModulePhaseDeployed,
				"autorag":       v1alpha1.ModulePhaseDeployed,
				"agentOps":      v1alpha1.ModulePhaseDeployed,
			},
		},
		{
			name:    "explicit disable override",
			wantLen: 8,
			spec: v1alpha1.DashboardSpec{
				Modules: map[string]v1alpha1.ModuleOverride{
					"genAi": {State: v1alpha1.ModuleDisabled},
				},
			},
			wantPhases: map[string]v1alpha1.ModulePhase{
				"genAi":         v1alpha1.ModulePhaseDisabled,
				"modelRegistry": v1alpha1.ModulePhaseDeployed,
			},
			wantReason: map[string]string{
				"genAi": "ExplicitOverride",
			},
		},
		{
			name:    "explicit enable is treated as deployed",
			wantLen: 8,
			spec: v1alpha1.DashboardSpec{
				Modules: map[string]v1alpha1.ModuleOverride{
					"modelRegistry": {State: v1alpha1.ModuleEnabled},
				},
			},
			wantPhases: map[string]v1alpha1.ModulePhase{
				"modelRegistry": v1alpha1.ModulePhaseDeployed,
			},
		},
		{
			name:    "all modules disabled via overrides",
			wantLen: 8,
			spec: v1alpha1.DashboardSpec{
				Modules: map[string]v1alpha1.ModuleOverride{
					"modelRegistry": {State: v1alpha1.ModuleDisabled},
					"genAi":         {State: v1alpha1.ModuleDisabled},
					"mlflow":        {State: v1alpha1.ModuleDisabled},
					"maas":          {State: v1alpha1.ModuleDisabled},
					"evalHub":       {State: v1alpha1.ModuleDisabled},
					"automl":        {State: v1alpha1.ModuleDisabled},
					"autorag":       {State: v1alpha1.ModuleDisabled},
					"agentOps":      {State: v1alpha1.ModuleDisabled},
				},
			},
			wantPhases: map[string]v1alpha1.ModulePhase{
				"modelRegistry": v1alpha1.ModulePhaseDisabled,
				"genAi":         v1alpha1.ModulePhaseDisabled,
				"mlflow":        v1alpha1.ModulePhaseDisabled,
				"maas":          v1alpha1.ModulePhaseDisabled,
				"evalHub":       v1alpha1.ModulePhaseDisabled,
				"automl":        v1alpha1.ModulePhaseDisabled,
				"autorag":       v1alpha1.ModulePhaseDisabled,
				"agentOps":      v1alpha1.ModulePhaseDisabled,
			},
		},
		{
			name:    "unknown module override key produces UnknownModule status",
			wantLen: 9,
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

			require.Len(t, got, tt.wantLen, "result should have exact expected cardinality")

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

func TestOverlayContainerReadiness(t *testing.T) {
	deployedStatuses := func() map[string]v1alpha1.ModuleStatus {
		s := make(map[string]v1alpha1.ModuleStatus, len(moduleRegistry))
		for name := range moduleRegistry {
			s[name] = v1alpha1.ModuleStatus{
				Phase:              v1alpha1.ModulePhaseDeployed,
				Reason:             "Deployed",
				Message:            "Module container deployed",
				LastTransitionTime: metav1.Now(),
			}
		}
		return s
	}

	tests := []struct {
		name       string
		statuses   map[string]v1alpha1.ModuleStatus
		pods       []corev1.Pod
		wantPhases map[string]v1alpha1.ModulePhase
		wantReason map[string]string
	}{
		{
			name:     "no pods — no changes",
			statuses: deployedStatuses(),
			pods:     nil,
			wantPhases: map[string]v1alpha1.ModulePhase{
				"genAi":    v1alpha1.ModulePhaseDeployed,
				"agentOps": v1alpha1.ModulePhaseDeployed,
			},
		},
		{
			name:     "all containers ready — no changes",
			statuses: deployedStatuses(),
			pods: []corev1.Pod{
				{
					Status: corev1.PodStatus{
						ContainerStatuses: []corev1.ContainerStatus{
							{Name: "gen-ai-ui", Ready: true},
							{Name: "agent-ops-ui", Ready: true},
						},
					},
				},
			},
			wantPhases: map[string]v1alpha1.ModulePhase{
				"genAi":    v1alpha1.ModulePhaseDeployed,
				"agentOps": v1alpha1.ModulePhaseDeployed,
			},
		},
		{
			name:     "container in ImagePullBackOff — module degraded",
			statuses: deployedStatuses(),
			pods: []corev1.Pod{
				{
					Status: corev1.PodStatus{
						ContainerStatuses: []corev1.ContainerStatus{
							{Name: "gen-ai-ui", Ready: true},
							{
								Name:  "agent-ops-ui",
								Ready: false,
								State: corev1.ContainerState{
									Waiting: &corev1.ContainerStateWaiting{
										Reason:  "ImagePullBackOff",
										Message: "Back-off pulling image",
									},
								},
							},
						},
					},
				},
			},
			wantPhases: map[string]v1alpha1.ModulePhase{
				"genAi":    v1alpha1.ModulePhaseDeployed,
				"agentOps": v1alpha1.ModulePhaseDegraded,
			},
			wantReason: map[string]string{
				"agentOps": "ImagePullBackOff",
			},
		},
		{
			name:     "container in CrashLoopBackOff — module degraded",
			statuses: deployedStatuses(),
			pods: []corev1.Pod{
				{
					Status: corev1.PodStatus{
						ContainerStatuses: []corev1.ContainerStatus{
							{Name: "gen-ai-ui", Ready: true},
							{
								Name:  "mlflow-ui",
								Ready: false,
								State: corev1.ContainerState{
									Waiting: &corev1.ContainerStateWaiting{
										Reason: "CrashLoopBackOff",
									},
								},
							},
						},
					},
				},
			},
			wantPhases: map[string]v1alpha1.ModulePhase{
				"mlflow": v1alpha1.ModulePhaseDegraded,
				"genAi":  v1alpha1.ModulePhaseDeployed,
			},
			wantReason: map[string]string{
				"mlflow": "CrashLoopBackOff",
			},
		},
		{
			name: "disabled module not affected by container status",
			statuses: func() map[string]v1alpha1.ModuleStatus {
				s := deployedStatuses()
				s["agentOps"] = v1alpha1.ModuleStatus{
					Phase:  v1alpha1.ModulePhaseDisabled,
					Reason: "ExplicitOverride",
				}
				return s
			}(),
			pods: []corev1.Pod{
				{
					Status: corev1.PodStatus{
						ContainerStatuses: []corev1.ContainerStatus{
							{
								Name:  "agent-ops-ui",
								Ready: false,
								State: corev1.ContainerState{
									Waiting: &corev1.ContainerStateWaiting{Reason: "ImagePullBackOff"},
								},
							},
						},
					},
				},
			},
			wantPhases: map[string]v1alpha1.ModulePhase{
				"agentOps": v1alpha1.ModulePhaseDisabled,
			},
		},
		{
			name:     "multiple pods — worst status wins",
			statuses: deployedStatuses(),
			pods: []corev1.Pod{
				{
					Status: corev1.PodStatus{
						ContainerStatuses: []corev1.ContainerStatus{
							{Name: "gen-ai-ui", Ready: true},
						},
					},
				},
				{
					Status: corev1.PodStatus{
						ContainerStatuses: []corev1.ContainerStatus{
							{
								Name:  "gen-ai-ui",
								Ready: false,
								State: corev1.ContainerState{
									Waiting: &corev1.ContainerStateWaiting{Reason: "CrashLoopBackOff"},
								},
							},
						},
					},
				},
			},
			wantPhases: map[string]v1alpha1.ModulePhase{
				"genAi": v1alpha1.ModulePhaseDegraded,
			},
			wantReason: map[string]string{
				"genAi": "CrashLoopBackOff",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			overlayContainerReadiness(tt.statuses, tt.pods)

			for name, wantPhase := range tt.wantPhases {
				status, ok := tt.statuses[name]
				require.True(t, ok, "module %q should be in results", name)
				assert.Equal(t, wantPhase, status.Phase, "module %q phase", name)
			}

			for name, wantReason := range tt.wantReason {
				assert.Equal(t, wantReason, tt.statuses[name].Reason, "module %q reason", name)
			}
		})
	}
}

func TestModuleRegistry(t *testing.T) {
	assert.Len(t, moduleRegistry, 8, "expected 8 modules in registry")

	for name, mod := range moduleRegistry {
		t.Run(name, func(t *testing.T) {
			assert.Equal(t, name, mod.Name, "module name must match registry key")
			assert.NotEmpty(t, mod.ContainerName, "module must have ContainerName")
			assert.Greater(t, mod.Port, int32(0), "module must have Port > 0")
			assert.NotEmpty(t, mod.ImageEnvVar, "module must have ImageEnvVar")
		})
	}
}

func TestModuleNames(t *testing.T) {
	names := ModuleNames()
	assert.Equal(t, []string{
		"agentOps", "automl", "autorag", "evalHub",
		"genAi", "maas", "mlflow", "modelRegistry",
	}, names)
}
