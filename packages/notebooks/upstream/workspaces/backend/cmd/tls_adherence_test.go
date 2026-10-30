/*
Copyright 2024.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

package main

import (
	"crypto/tls"
	"testing"

	tlsprofile "github.com/kubeflow/notebooks/workspaces/controller/pkg/tls"
)

func intermediateOpt(c *tls.Config) {
	c.MinVersion = tls.VersionTLS12
	c.CipherSuites = []uint16{tls.TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256}
}

func modernOpt(c *tls.Config) {
	c.MinVersion = tls.VersionTLS13
}

func TestAdherenceIsStrict(t *testing.T) {
	tests := []struct {
		adherence string
		want      bool
	}{
		{"", false}, // unset → Legacy behavior
		{tlsprofile.AdherenceLegacy, false},
		{tlsprofile.AdherenceStrict, true},
		{"SomeFutureMode", true}, // unknown → treated as strict (forward-compat)
	}
	for _, tt := range tests {
		if got := adherenceIsStrict(tt.adherence); got != tt.want {
			t.Errorf("adherenceIsStrict(%q) = %v, want %v", tt.adherence, got, tt.want)
		}
	}
}

func TestEffectiveServerTLSConfig(t *testing.T) {
	tests := []struct {
		name           string
		result         tlsprofile.Result
		wantErr        bool
		wantMinVersion uint16
	}{
		{
			name:           "legacy adherence preserves TLS 1.3 despite Intermediate profile",
			result:         tlsprofile.Result{Adherence: tlsprofile.AdherenceLegacy, TLSOpts: []func(*tls.Config){intermediateOpt}},
			wantMinVersion: tls.VersionTLS13,
		},
		{
			name:           "unset adherence preserves TLS 1.3",
			result:         tlsprofile.Result{Adherence: "", TLSOpts: []func(*tls.Config){intermediateOpt}},
			wantMinVersion: tls.VersionTLS13,
		},
		{
			name:           "strict adherence adopts Intermediate cluster profile",
			result:         tlsprofile.Result{Adherence: tlsprofile.AdherenceStrict, TLSOpts: []func(*tls.Config){intermediateOpt}},
			wantMinVersion: tls.VersionTLS12,
		},
		{
			name:           "strict adherence adopts Modern cluster profile",
			result:         tlsprofile.Result{Adherence: tlsprofile.AdherenceStrict, TLSOpts: []func(*tls.Config){modernOpt}},
			wantMinVersion: tls.VersionTLS13,
		},
		{
			name:           "unknown adherence treated as strict, adopts profile",
			result:         tlsprofile.Result{Adherence: "FutureMode", TLSOpts: []func(*tls.Config){intermediateOpt}},
			wantMinVersion: tls.VersionTLS12,
		},
		{
			name:    "strict adherence with degraded (inapplicable) profile fails closed",
			result:  tlsprofile.Result{Adherence: tlsprofile.AdherenceStrict, Degraded: true, TLSOpts: []func(*tls.Config){intermediateOpt}},
			wantErr: true,
		},
		{
			name:           "legacy adherence with a degraded (inapplicable) but readable profile keeps TLS 1.3",
			result:         tlsprofile.Result{Adherence: tlsprofile.AdherenceLegacy, Degraded: true, TLSOpts: []func(*tls.Config){intermediateOpt}},
			wantMinVersion: tls.VersionTLS13,
		},
		{
			name:           "unset adherence with a degraded (inapplicable) but readable profile keeps TLS 1.3",
			result:         tlsprofile.Result{Adherence: "", Degraded: true, TLSOpts: []func(*tls.Config){intermediateOpt}},
			wantMinVersion: tls.VersionTLS13,
		},
		{
			name:    "unreadable policy fails closed under legacy (cannot trust adherence)",
			result:  tlsprofile.Result{Adherence: tlsprofile.AdherenceLegacy, Degraded: true, PolicyUnreadable: true, TLSOpts: []func(*tls.Config){intermediateOpt}},
			wantErr: true,
		},
		{
			name:    "unreadable policy fails closed under empty adherence",
			result:  tlsprofile.Result{Adherence: "", Degraded: true, PolicyUnreadable: true, TLSOpts: []func(*tls.Config){intermediateOpt}},
			wantErr: true,
		},
		{
			name:    "unreadable policy fails closed under strict",
			result:  tlsprofile.Result{Adherence: tlsprofile.AdherenceStrict, Degraded: true, PolicyUnreadable: true, TLSOpts: []func(*tls.Config){intermediateOpt}},
			wantErr: true,
		},
		{
			// On reload this error makes the watcher retain the last-known-good config
			// and retry; startup leniency on Transient is handled separately in run().
			name:    "transient unreadable policy errors (reload retains, startup lenient elsewhere)",
			result:  tlsprofile.Result{Adherence: tlsprofile.AdherenceStrict, Degraded: true, PolicyUnreadable: true, Transient: true, TLSOpts: []func(*tls.Config){intermediateOpt}},
			wantErr: true,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cfg, err := effectiveServerTLSConfig(tt.result)
			if tt.wantErr {
				if err == nil {
					t.Fatal("expected error, got nil")
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if cfg.MinVersion != tt.wantMinVersion {
				t.Errorf("MinVersion = %d, want %d", cfg.MinVersion, tt.wantMinVersion)
			}
		})
	}
}
