package e2e

import (
	"testing"

	"github.com/stretchr/testify/require"
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
		{name: "explicit namespace wins", testNamespace: "explicit", applicationsNamespace: "applications", want: "explicit"},
		{name: "shift left fallback", applicationsNamespace: "redhat-ods-applications", want: "redhat-ods-applications"},
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
