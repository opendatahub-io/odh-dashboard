package api

import (
	"errors"
	"io"
	"log/slog"
	"testing"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/config"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/kubernetes"
)

// These tests must not depend on a kubeconfig being present: CI has none, a
// developer machine usually does, and initStartupClusterInfoWith takes a
// different branch in each case. Anything that needs a reachable API server
// uses the envtest instance from TestMain instead.

func discardLogger() *slog.Logger {
	return slog.New(slog.NewTextHandler(io.Discard, nil))
}

// countingProbe records invocations so a test can assert the OpenShift
// configuration probe was, or was not, reached.
func countingProbe(result clusterInfo, err error, calls *int) clusterInfoQuery {
	return func(kubernetes.Interface, dynamic.Interface, *slog.Logger) (clusterInfo, error) {
		*calls++
		return result, err
	}
}

// AC (RHOAIENG-96080): a TLS-enabled xKS startup makes no OpenShift
// configuration API requests, so it works with the agreed minimal
// service-account permissions. The probe is the only startup caller of
// config.openshift.io and the console-config ConfigMap, so asserting it is
// never reached is the whole guarantee.
//
// This branch returns before touching any client, so it is deterministic with
// or without a kubeconfig.
func TestInitStartupClusterInfo_XKSMakesNoOpenShiftConfigurationRequests(t *testing.T) {
	var probes int
	cfg := config.EnvConfig{PlatformType: config.PlatformXKS}

	ci, platform, confirmed := initStartupClusterInfoWith(cfg, k8sSetupResult{}, discardLogger(),
		countingProbe(clusterInfo{clusterID: "should-never-be-read"}, nil, &probes))

	assert.Zero(t, probes, "xKS startup must not probe OpenShift configuration APIs")
	assert.Equal(t, config.PlatformXKS, platform)
	assert.True(t, confirmed, "an explicitly configured platform is confirmed, not guessed")
	assert.Empty(t, ci.GetClusterID(), "there is no OpenShift ClusterVersion to read on xKS")
	assert.Equal(t, defaultClusterBranding, ci.GetClusterBranding())
}

// The counterpart: a non-xKS startup does reach the probe. Driven through the
// envtest instance so it does not depend on a kubeconfig.
func TestInitStartupClusterInfo_NonXKSUsesTheProbe(t *testing.T) {
	k8sResult := k8sSetupResult{testEnv: testEnvInstance, clientset: testSAClientset}

	for _, tc := range []struct {
		name         string
		configured   config.PlatformType
		probeResult  clusterInfo
		wantPlatform config.PlatformType
	}{
		{"explicit OpenShift", config.PlatformOpenShift, clusterInfo{clusterID: "abc"}, config.PlatformOpenShift},
		{"auto-detect finds OpenShift", "", clusterInfo{clusterID: "abc"}, config.PlatformOpenShift},
		{"auto-detect finds vanilla Kubernetes", "", clusterInfo{}, config.PlatformXKS},
	} {
		t.Run(tc.name, func(t *testing.T) {
			var probes int
			cfg := config.EnvConfig{PlatformType: tc.configured, MockK8Client: true}

			_, platform, confirmed := initStartupClusterInfoWith(cfg, k8sResult, discardLogger(),
				countingProbe(tc.probeResult, nil, &probes))

			assert.Equal(t, 1, probes, "a non-xKS startup resolves the platform from the probe")
			assert.Equal(t, tc.wantPlatform, platform)
			assert.True(t, confirmed, "a probe that succeeded confirms the platform")
		})
	}
}

// resolveStartupPlatform is the pure decision behind the above. Testing it
// directly covers the combinations that are awkward to stage through a real
// client, in particular the ambiguous-probe case.
func TestResolveStartupPlatform(t *testing.T) {
	probeFailed := errors.New("CANARY_PROBE")

	for _, tc := range []struct {
		name          string
		ci            clusterInfo
		probeErr      error
		explicit      bool
		configured    config.PlatformType
		want          config.PlatformType
		wantConfirmed bool
	}{
		{
			name: "auto-detect falls back to XKS on an ambiguous probe, unconfirmed",
			ci:   clusterInfo{}, probeErr: probeFailed, explicit: false, configured: "",
			want: config.PlatformXKS, wantConfirmed: false,
		},
		{
			name: "auto-detect finds OpenShift when a cluster ID is present",
			ci:   clusterInfo{clusterID: "abc"}, explicit: false, configured: "",
			want: config.PlatformOpenShift, wantConfirmed: true,
		},
		{
			name: "auto-detect finds XKS when no cluster ID is present",
			ci:   clusterInfo{}, explicit: false, configured: "",
			want: config.PlatformXKS, wantConfirmed: true,
		},
		{
			name: "explicit OpenShift wins over a vanilla-Kubernetes detection",
			ci:   clusterInfo{}, explicit: true, configured: config.PlatformOpenShift,
			want: config.PlatformOpenShift, wantConfirmed: true,
		},
		{
			name: "explicit XKS wins over an OpenShift detection",
			ci:   clusterInfo{clusterID: "abc"}, explicit: true, configured: config.PlatformXKS,
			want: config.PlatformXKS, wantConfirmed: true,
		},
		{
			name: "explicit configuration survives an ambiguous probe and stays confirmed",
			ci:   clusterInfo{}, probeErr: probeFailed, explicit: true, configured: config.PlatformOpenShift,
			want: config.PlatformOpenShift, wantConfirmed: true,
		},
	} {
		t.Run(tc.name, func(t *testing.T) {
			got, confirmed := resolveStartupPlatform(tc.ci, tc.probeErr, tc.explicit, tc.configured, discardLogger())
			assert.Equal(t, tc.want, got)
			assert.Equal(t, tc.wantConfirmed, confirmed)
		})
	}
}

// End-to-end guard for the fail-open the review caught: an ambiguous probe
// resolves to XKS, but that guess must not reach the admission contract.
func TestAmbiguousPlatformProbeDoesNotRelaxAdmission(t *testing.T) {
	probeFailed := errors.New("CANARY_PROBE")

	platform, confirmed := resolveStartupPlatform(clusterInfo{}, probeFailed, false, "", discardLogger())
	require.Equal(t, config.PlatformXKS, platform, "the guess is still XKS for least-privilege API calls")
	require.False(t, confirmed)

	assert.Equal(t, config.AdmissionModeAuthResource,
		config.ResolveAdmissionMode("", platform, confirmed),
		"a guessed platform must keep the Auth-resource admission gate")
}
