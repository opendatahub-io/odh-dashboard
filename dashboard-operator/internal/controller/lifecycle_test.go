package controller

import (
	"testing"

	"github.com/stretchr/testify/assert"

	"github.com/opendatahub-io/odh-platform-utilities/pkg/cluster"
)

func TestDashboardLifecycleSelection(t *testing.T) {
	tests := []struct {
		name     string
		platform cluster.Platform
		want     dashboardLifecycle
	}{
		{name: "ODH", platform: cluster.OpenDataHub, want: odhDashboardLifecycle{}},
		{name: "self-managed RHOAI", platform: cluster.SelfManagedRhoai, want: rhoaiDashboardLifecycle{}},
		{name: "managed RHOAI", platform: cluster.ManagedRhoai, want: rhoaiDashboardLifecycle{}},
		{name: "XKS", platform: cluster.XKS, want: xksDashboardLifecycle{}},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			r := &DashboardReconciler{Platform: tt.platform}
			assert.IsType(t, tt.want, r.dashboardLifecycle())
		})
	}
}
