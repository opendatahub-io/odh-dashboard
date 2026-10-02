package e2e

import (
	"context"
	"testing"

	dashboardv1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
	"github.com/opendatahub-io/odh-platform-utilities/api/common"
	"github.com/stretchr/testify/require"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"
)

func TestParseFixtureMode(t *testing.T) {
	tests := []struct {
		name    string
		value   string
		want    fixtureMode
		wantErr string
	}{
		{name: "existing", value: "existing", want: fixtureModeExisting},
		{name: "managed", value: " managed ", want: fixtureModeManaged},
		{name: "invalid", value: "shared", wantErr: "fixture mode must be"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := parseFixtureMode(tt.value)
			if tt.wantErr != "" {
				require.ErrorContains(t, err, tt.wantErr)
				return
			}
			require.NoError(t, err)
			require.Equal(t, tt.want, got)
		})
	}
}

func TestResolveTestNamespace(t *testing.T) {
	tests := []struct {
		name                  string
		testNamespace         string
		applicationsNamespace string
		want                  string
		wantErr               string
	}{
		{name: "explicit namespace", testNamespace: "explicit", want: "explicit"},
		{name: "matching inputs", testNamespace: "applications", applicationsNamespace: "applications", want: "applications"},
		{name: "shift left fallback", applicationsNamespace: "redhat-ods-applications", want: "redhat-ods-applications"},
		{name: "conflicting inputs", testNamespace: "explicit", applicationsNamespace: "applications", wantErr: "conflicts"},
		{name: "missing", wantErr: "must name an existing namespace"},
		{name: "invalid fallback", applicationsNamespace: "NOT_VALID", wantErr: "E2E_TEST_APPLICATIONS_NAMESPACE"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := resolveTestNamespace(tt.testNamespace, tt.applicationsNamespace)
			if tt.wantErr != "" {
				require.ErrorContains(t, err, tt.wantErr)
				return
			}
			require.NoError(t, err)
			require.Equal(t, tt.want, got)
		})
	}
}

func TestValidateInstalledDashboard(t *testing.T) {
	tests := []struct {
		name    string
		uid     types.UID
		state   common.ManagementState
		wantErr string
	}{
		{name: "valid", uid: "fixture-uid", state: common.Managed},
		{name: "missing UID", state: common.Managed, wantErr: "has no UID"},
		{name: "unmanaged", uid: "fixture-uid", state: common.ManagementState("Unmanaged"), wantErr: "must have managementState"},
		{name: "removed", uid: "fixture-uid", state: common.Removed, wantErr: "must have managementState"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			dashboard := &dashboardv1alpha1.Dashboard{
				ObjectMeta: metav1.ObjectMeta{Name: dashboardv1alpha1.DashboardInstanceName, UID: tt.uid},
				Spec: dashboardv1alpha1.DashboardSpec{
					ManagementSpec: common.ManagementSpec{ManagementState: tt.state},
				},
			}
			err := validateInstalledDashboard(dashboard)
			if tt.wantErr != "" {
				require.ErrorContains(t, err, tt.wantErr)
				return
			}
			require.NoError(t, err)
		})
	}
}

func TestDiscoverPlatform(t *testing.T) {
	tests := []struct {
		name     string
		explicit string
		services []string
		want     string
		wantErr  string
	}{
		{name: "explicit", explicit: "RHOAI", want: platformRHOAI},
		{name: "ODH service", services: []string{"odh-dashboard"}, want: platformODH},
		{name: "RHOAI service", services: []string{"rhods-dashboard"}, want: platformRHOAI},
		{name: "both services", services: []string{"odh-dashboard", "rhods-dashboard"}, wantErr: "both"},
		{name: "no service", wantErr: "TEST_PLATFORM"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			scheme := runtime.NewScheme()
			require.NoError(t, corev1.AddToScheme(scheme))
			objects := make([]client.Object, 0, len(tt.services))
			for _, name := range tt.services {
				objects = append(objects, &corev1.Service{ObjectMeta: metav1.ObjectMeta{Name: name, Namespace: "applications"}})
			}
			c := fake.NewClientBuilder().WithScheme(scheme).WithObjects(objects...).Build()
			got, err := discoverPlatform(context.Background(), c, "applications", tt.explicit)
			if tt.wantErr != "" {
				require.ErrorContains(t, err, tt.wantErr)
				return
			}
			require.NoError(t, err)
			require.Equal(t, tt.want, got)
		})
	}
}

func TestResolveGatewayDomain(t *testing.T) {
	tests := []struct {
		name         string
		explicit     string
		dashboardURL string
		want         string
		wantErr      string
	}{
		{name: "explicit wins", explicit: "dashboard.example.com", dashboardURL: "https://ignored.example.com", want: "dashboard.example.com"},
		{name: "status URL fallback", dashboardURL: "https://dashboard.apps.example.com/path", want: "dashboard.apps.example.com"},
		{name: "missing", wantErr: "status.url is empty"},
		{name: "non HTTPS status URL", dashboardURL: "http://dashboard.example.com", wantErr: "must be an HTTPS URL"},
		{name: "invalid explicit domain", explicit: "https://dashboard.example.com", wantErr: "TEST_GATEWAY_DOMAIN"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := resolveGatewayDomain(tt.explicit, tt.dashboardURL)
			if tt.wantErr != "" {
				require.ErrorContains(t, err, tt.wantErr)
				return
			}
			require.NoError(t, err)
			require.Equal(t, tt.want, got)
		})
	}
}

func TestResolveManagedGatewayDomain(t *testing.T) {
	t.Run("explicit domain", func(t *testing.T) {
		got, err := resolveManagedGatewayDomain(" dashboard.example.com ")
		require.NoError(t, err)
		require.Equal(t, "dashboard.example.com", got)
	})

	t.Run("missing domain", func(t *testing.T) {
		_, err := resolveManagedGatewayDomain("")
		require.ErrorContains(t, err, "managed fixture mode requires TEST_GATEWAY_DOMAIN")
	})
}

func TestResolvePlatform(t *testing.T) {
	tests := []struct {
		name     string
		explicit string
		hasODH   bool
		hasRHOAI bool
		want     string
		wantErr  string
	}{
		{name: "explicit wins", explicit: "RHOAI", hasODH: true, want: "rhoai"},
		{name: "infer ODH", hasODH: true, want: "odh"},
		{name: "infer RHOAI", hasRHOAI: true, want: "rhoai"},
		{name: "invalid explicit", explicit: "kubernetes", wantErr: "must be odh or rhoai"},
		{name: "ambiguous", hasODH: true, hasRHOAI: true, wantErr: "both"},
		{name: "missing", wantErr: "neither"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := resolvePlatform(tt.explicit, tt.hasODH, tt.hasRHOAI)
			if tt.wantErr != "" {
				require.ErrorContains(t, err, tt.wantErr)
				return
			}
			require.NoError(t, err)
			require.Equal(t, tt.want, got)
		})
	}
}
