package config

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestAdmissionMode_Set(t *testing.T) {
	cases := []struct {
		input   string
		want    AdmissionMode
		wantErr bool
	}{
		{input: "auth-resource", want: AdmissionModeAuthResource},
		{input: "authenticated", want: AdmissionModeAuthenticated},
		{input: "AUTHENTICATED", want: AdmissionModeAuthenticated},
		{input: "  authenticated  ", want: AdmissionModeAuthenticated},
		{input: "", want: ""},
		{input: "anonymous", wantErr: true},
		{input: "none", wantErr: true},
	}

	for _, tc := range cases {
		t.Run(tc.input, func(t *testing.T) {
			var mode AdmissionMode
			err := mode.Set(tc.input)
			if tc.wantErr {
				require.Error(t, err)
				assert.Contains(t, err.Error(), "invalid admission mode")
				return
			}
			require.NoError(t, err)
			assert.Equal(t, tc.want, mode)
		})
	}
}

// The platform default is what keeps RHOAI on the Auth-resource contract while
// xKS admits authenticated callers without that dependency.
func TestResolveAdmissionMode(t *testing.T) {
	cases := []struct {
		name       string
		configured AdmissionMode
		platform   PlatformType
		confirmed  bool
		want       AdmissionMode
	}{
		{"unset on OpenShift keeps the RHOAI contract", "", PlatformOpenShift, true, AdmissionModeAuthResource},
		{"unset on confirmed xKS admits authenticated callers", "", PlatformXKS, true, AdmissionModeAuthenticated},
		{"unset with no platform resolved is conservative", "", "", true, AdmissionModeAuthResource},
		{"explicit value wins on OpenShift", AdmissionModeAuthenticated, PlatformOpenShift, true, AdmissionModeAuthenticated},
		{"explicit value wins on xKS", AdmissionModeAuthResource, PlatformXKS, true, AdmissionModeAuthResource},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			assert.Equal(t, tc.want, ResolveAdmissionMode(tc.configured, tc.platform, tc.confirmed))
		})
	}
}

// A platform that was guessed after a failed probe must not relax admission.
// Startup falls back to XKS on an ambiguous probe, and a transient forbidden or
// timed-out ClusterVersion read on a real OpenShift cluster lands in exactly
// that branch, so keying admission off the guess would drop the Auth-resource
// gate and admit a caller the cluster denies.
func TestResolveAdmissionMode_UnconfirmedPlatformKeepsTheRestrictiveContract(t *testing.T) {
	assert.Equal(t, AdmissionModeAuthResource, ResolveAdmissionMode("", PlatformXKS, false),
		"an unconfirmed XKS guess must not select authenticated admission")
	assert.Equal(t, AdmissionModeAuthResource, ResolveAdmissionMode("", PlatformOpenShift, false))

	// Stating the intent explicitly still works, by either route.
	assert.Equal(t, AdmissionModeAuthenticated, ResolveAdmissionMode(AdmissionModeAuthenticated, PlatformXKS, false),
		"an explicit admission mode overrides an unconfirmed platform")
}
