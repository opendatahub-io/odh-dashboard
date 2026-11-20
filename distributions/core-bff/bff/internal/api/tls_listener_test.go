package api

import (
	"errors"
	"io"
	"log/slog"
	"testing"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/config"
	"github.com/stretchr/testify/assert"
)

func TestServeTLSWithoutClusterProfile_OnlyForConfirmedXKS(t *testing.T) {
	cases := []struct {
		name      string
		platform  config.PlatformType
		confirmed bool
		want      bool
	}{
		{"confirmed xKS serves static defaults", config.PlatformXKS, true, true},
		{"guessed xKS keeps the cluster profile", config.PlatformXKS, false, false},
		{"OpenShift keeps the cluster profile", config.PlatformOpenShift, true, false},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			app := &App{config: config.EnvConfig{PlatformType: tc.platform}, platformConfirmed: tc.confirmed}
			assert.Equal(t, tc.want, app.ServeTLSWithoutClusterProfile())
		})
	}
}

// An ambiguous ClusterVersion probe (forbidden, timeout) on what may be an
// OpenShift cluster with a Modern or Custom TLS profile must not select the
// profile-free listener.
func TestServeTLSWithoutClusterProfile_AmbiguousProbeKeepsProfile(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	platform, confirmed := resolveStartupPlatform(clusterInfo{}, errors.New("clusterversions.config.openshift.io is forbidden"), false, "", logger)

	app := &App{config: config.EnvConfig{PlatformType: platform}, platformConfirmed: confirmed}

	assert.Equal(t, config.PlatformXKS, platform)
	assert.False(t, confirmed)
	assert.False(t, app.ServeTLSWithoutClusterProfile())
}
