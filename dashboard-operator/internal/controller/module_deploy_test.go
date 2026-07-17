package controller

import (
	"testing"

	"github.com/stretchr/testify/assert"

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
			name:     "ODH platform uses odh-dashboard prefix",
			platform: cluster.OpenDataHub,
			slug:     "maas",
			want:     "odh-dashboard-maas-ui",
		},
		{
			name:     "SelfManagedRhoai uses rhods-dashboard prefix",
			platform: cluster.SelfManagedRhoai,
			slug:     "maas",
			want:     "rhods-dashboard-maas-ui",
		},
		{
			name:     "ManagedRhoai uses rhods-dashboard prefix",
			platform: cluster.ManagedRhoai,
			slug:     "maas",
			want:     "rhods-dashboard-maas-ui",
		},
		{
			name:     "gen-ai slug",
			platform: cluster.OpenDataHub,
			slug:     "gen-ai",
			want:     "odh-dashboard-gen-ai-ui",
		},
		{
			name:     "gen-ai slug on RHOAI",
			platform: cluster.SelfManagedRhoai,
			slug:     "gen-ai",
			want:     "rhods-dashboard-gen-ai-ui",
		},
		{
			name:     "unknown platform defaults to odh-dashboard prefix",
			platform: cluster.XKS,
			slug:     "maas",
			want:     "odh-dashboard-maas-ui",
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
	deployedStatus := v1alpha1.ModuleStatus{Phase: v1alpha1.ModulePhaseDeployed}
	degradedStatus := v1alpha1.ModuleStatus{Phase: v1alpha1.ModulePhaseDegraded}
	disabledStatus := v1alpha1.ModuleStatus{Phase: v1alpha1.ModulePhaseDisabled}

	tests := []struct {
		name       string
		moduleName string
		statuses   map[string]v1alpha1.ModuleStatus
		platform   cluster.Platform
		wantParams map[string]string
	}{
		{
			name:       "genAi with maas deployed on ODH",
			moduleName: "genAi",
			statuses: map[string]v1alpha1.ModuleStatus{
				"maas": deployedStatus,
			},
			platform: cluster.OpenDataHub,
			wantParams: map[string]string{
				"BFF_MAAS_SERVICE_NAME": "odh-dashboard-maas-ui",
				"BFF_MAAS_SERVICE_PORT": "8243",
			},
		},
		{
			name:       "genAi with maas deployed on SelfManagedRhoai",
			moduleName: "genAi",
			statuses: map[string]v1alpha1.ModuleStatus{
				"maas": deployedStatus,
			},
			platform: cluster.SelfManagedRhoai,
			wantParams: map[string]string{
				"BFF_MAAS_SERVICE_NAME": "rhods-dashboard-maas-ui",
				"BFF_MAAS_SERVICE_PORT": "8243",
			},
		},
		{
			name:       "genAi with maas deployed on ManagedRhoai",
			moduleName: "genAi",
			statuses: map[string]v1alpha1.ModuleStatus{
				"maas": deployedStatus,
			},
			platform: cluster.ManagedRhoai,
			wantParams: map[string]string{
				"BFF_MAAS_SERVICE_NAME": "rhods-dashboard-maas-ui",
				"BFF_MAAS_SERVICE_PORT": "8243",
			},
		},
		{
			name:       "genAi with maas degraded still injects params",
			moduleName: "genAi",
			statuses: map[string]v1alpha1.ModuleStatus{
				"maas": degradedStatus,
			},
			platform: cluster.OpenDataHub,
			wantParams: map[string]string{
				"BFF_MAAS_SERVICE_NAME": "odh-dashboard-maas-ui",
				"BFF_MAAS_SERVICE_PORT": "8243",
			},
		},
		{
			name:       "genAi with maas disabled skips injection",
			moduleName: "genAi",
			statuses: map[string]v1alpha1.ModuleStatus{
				"maas": disabledStatus,
			},
			platform:   cluster.OpenDataHub,
			wantParams: map[string]string{},
		},
		{
			name:       "genAi with maas missing from statuses skips injection",
			moduleName: "genAi",
			statuses:   map[string]v1alpha1.ModuleStatus{},
			platform:   cluster.OpenDataHub,
			wantParams: map[string]string{},
		},
		{
			name:       "module with no inter-BFF dependencies is a no-op",
			moduleName: "modelRegistry",
			statuses: map[string]v1alpha1.ModuleStatus{
				"maas": deployedStatus,
			},
			platform:   cluster.OpenDataHub,
			wantParams: map[string]string{},
		},
		{
			name:       "unknown module is a no-op",
			moduleName: "nonexistent",
			statuses: map[string]v1alpha1.ModuleStatus{
				"maas": deployedStatus,
			},
			platform:   cluster.OpenDataHub,
			wantParams: map[string]string{},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			params := make(map[string]string)
			addInterBFFParams(params, tt.moduleName, tt.statuses, tt.platform)
			assert.Equal(t, tt.wantParams, params)
		})
	}
}
