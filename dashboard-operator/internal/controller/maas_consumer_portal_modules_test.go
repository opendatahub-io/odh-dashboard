package controller

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/opendatahub-io/odh-platform-utilities/api/common"

	v1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
)

func TestResolveModuleStatuses_MaaSConsumerPortalDemand(t *testing.T) {
	tests := []struct {
		name       string
		spec       v1alpha1.DashboardSpec
		wantPhases map[string]v1alpha1.ModulePhase
		wantReason map[string]string
	}{
		{
			name:       "MaaS Consumer Portal only requires MaaS and GenAI",
			spec:       v1alpha1.DashboardSpec{ManagementSpec: common.ManagementSpec{ManagementState: "Removed"}, MaaSConsumerPortal: &v1alpha1.MaaSConsumerPortalSpec{ManagementState: "Managed"}},
			wantPhases: map[string]v1alpha1.ModulePhase{"maas": v1alpha1.ModulePhaseDeployed, "genAi": v1alpha1.ModulePhaseDeployed, "mlflow": v1alpha1.ModulePhaseNotDeployed},
		},
		{
			name:       "Core Dashboard and MaaS Consumer Portal share MaaS and GenAI demand",
			spec:       v1alpha1.DashboardSpec{ManagementSpec: common.ManagementSpec{ManagementState: "Managed"}, MaaSConsumerPortal: &v1alpha1.MaaSConsumerPortalSpec{ManagementState: "Managed"}},
			wantPhases: map[string]v1alpha1.ModulePhase{"maas": v1alpha1.ModulePhaseDeployed, "genAi": v1alpha1.ModulePhaseDeployed, "mlflow": v1alpha1.ModulePhaseDeployed},
		},
		{
			name:       "explicit disable overrides MaaS Consumer Portal demand",
			spec:       v1alpha1.DashboardSpec{ManagementSpec: common.ManagementSpec{ManagementState: "Removed"}, MaaSConsumerPortal: &v1alpha1.MaaSConsumerPortalSpec{ManagementState: "Managed"}, Modules: map[string]v1alpha1.ModuleOverride{"maas": {State: v1alpha1.ModuleDisabled}}},
			wantPhases: map[string]v1alpha1.ModulePhase{"maas": v1alpha1.ModulePhaseDisabled, "genAi": v1alpha1.ModulePhaseDeployed},
			wantReason: map[string]string{"maas": "ExplicitOverride"},
		},
		{
			name:       "neither operand requires modules",
			spec:       v1alpha1.DashboardSpec{ManagementSpec: common.ManagementSpec{ManagementState: "Removed"}},
			wantPhases: map[string]v1alpha1.ModulePhase{"maas": v1alpha1.ModulePhaseNotDeployed, "genAi": v1alpha1.ModulePhaseNotDeployed},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			statuses := resolveModuleStatuses(&tt.spec)
			for module, phase := range tt.wantPhases {
				require.Contains(t, statuses, module)
				assert.Equal(t, phase, statuses[module].Phase)
			}
			for module, reason := range tt.wantReason {
				assert.Equal(t, reason, statuses[module].Reason)
			}
		})
	}
}
