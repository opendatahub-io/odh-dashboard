package controller

import (
	"testing"

	"github.com/stretchr/testify/assert"

	"github.com/opendatahub-io/odh-platform-utilities/api/common"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/cluster"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/controller/conditions"

	v1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
)

func TestDashboardLifecycleSelection(t *testing.T) {
	tests := []struct {
		name     string
		platform cluster.Platform
		want     dashboardLifecycle
	}{
		{name: "ODH", platform: cluster.OpenDataHub, want: odhDashboardLifecycle{}},
		{name: "self-managed RHOAI", platform: cluster.SelfManagedRhoai, want: rhoaiDashboardLifecycle{}},
		{name: "XKS", platform: cluster.XKS, want: xksDashboardLifecycle{}},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			r := &DashboardReconciler{Platform: tt.platform}
			assert.IsType(t, tt.want, r.dashboardLifecycle())
		})
	}
}

func TestDashboardLifecycleReadyDependents(t *testing.T) {
	tests := []struct {
		name      string
		lifecycle dashboardLifecycle
		want      []string
	}{
		{
			name:      "ODH includes OpenShift operands",
			lifecycle: odhDashboardLifecycle{},
			want: []string{
				string(common.ConditionTypeProvisioningSucceeded),
				string(common.ConditionTypeDegraded),
				conditionObservabilityAvailable,
				conditionMaaSPortalAvailable,
			},
		},
		{
			name:      "RHOAI includes OpenShift operands",
			lifecycle: rhoaiDashboardLifecycle{},
			want: []string{
				string(common.ConditionTypeProvisioningSucceeded),
				string(common.ConditionTypeDegraded),
				conditionObservabilityAvailable,
				conditionMaaSPortalAvailable,
			},
		},
		{
			name:      "XKS includes only XKS-owned operands",
			lifecycle: xksDashboardLifecycle{},
			want: []string{
				string(common.ConditionTypeProvisioningSucceeded),
				string(common.ConditionTypeDegraded),
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.Equal(t, tt.want, tt.lifecycle.readyDependents())
		})
	}
}

func TestXKSReadyContract(t *testing.T) {
	dashboard := &v1alpha1.Dashboard{}
	lifecycle := xksDashboardLifecycle{}
	cm := conditions.NewManager(
		dashboard,
		string(common.ConditionTypeReady),
		lifecycle.readyDependents()...,
	)

	cm.MarkTrue(string(common.ConditionTypeProvisioningSucceeded))
	cm.MarkFalse(string(common.ConditionTypeDegraded), conditions.WithSeverity(common.ConditionSeverityInfo))

	assert.True(t, cm.IsHappy())
	assert.True(t, conditions.IsStatusConditionTrue(dashboard, string(common.ConditionTypeReady)))
	assert.Nil(t, conditions.FindStatusCondition(dashboard, conditionObservabilityAvailable))
	assert.Nil(t, conditions.FindStatusCondition(dashboard, conditionMaaSPortalAvailable))
}
