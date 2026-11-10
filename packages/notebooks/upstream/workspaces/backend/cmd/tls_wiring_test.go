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
	"context"
	"crypto/tls"
	"errors"
	"io"
	"log/slog"
	"testing"

	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"

	tlsprofile "github.com/kubeflow/notebooks/workspaces/controller/pkg/tls"
)

// These tests cover the phase-dependent TLS wiring in run(): startup leniency on a
// transient policy read, and reload retention/retry through the real ProfileWatcher.
// effectiveServerTLSConfig's decision matrix is covered in tls_adherence_test.go.

func discardLogger() *slog.Logger { return slog.New(slog.NewTextHandler(io.Discard, nil)) }

// Results as tlsprofile.Resolve would produce them for each read outcome.
var (
	transientUnreadable = tlsprofile.Result{
		APIAvailable: true, Degraded: true, PolicyUnreadable: true, Transient: true,
		TLSOpts: []func(*tls.Config){intermediateOpt},
	}
	deniedUnreadable = tlsprofile.Result{
		APIAvailable: true, Degraded: true, PolicyUnreadable: true,
		TLSOpts: []func(*tls.Config){intermediateOpt},
	}
	strictIntermediate = tlsprofile.Result{
		APIAvailable: true, Adherence: tlsprofile.AdherenceStrict,
		Profile: map[string]any{"type": "Intermediate"},
		TLSOpts: []func(*tls.Config){intermediateOpt},
	}
)

func TestStartupServerTLSConfig(t *testing.T) {
	tests := []struct {
		name           string
		result         tlsprofile.Result
		wantErr        bool
		wantMinVersion uint16
	}{
		{"transient unreadable policy serves TLS 1.3 default", transientUnreadable, false, tls.VersionTLS13},
		{"denied (persistent) unreadable policy fails closed", deniedUnreadable, true, 0},
		{
			"readable strict policy with an inapplicable profile fails closed",
			tlsprofile.Result{
				APIAvailable: true, Adherence: tlsprofile.AdherenceStrict, Degraded: true,
				TLSOpts: []func(*tls.Config){intermediateOpt},
			},
			true, 0,
		},
		{"readable strict policy adopts the cluster profile", strictIntermediate, false, tls.VersionTLS12},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cfg, err := startupServerTLSConfig(discardLogger(), tt.result)
			if tt.wantErr {
				if err == nil {
					t.Fatalf("expected error, got config with MinVersion 0x%x", cfg.MinVersion)
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if cfg.MinVersion != tt.wantMinVersion {
				t.Errorf("MinVersion = 0x%x, want 0x%x", cfg.MinVersion, tt.wantMinVersion)
			}
		})
	}
}

// scriptedResolve returns each step in order (repeating the last) and counts calls.
type resolveStep struct {
	result tlsprofile.Result
	err    error
}

type scriptedResolve struct {
	steps []resolveStep
	calls int
}

func (s *scriptedResolve) resolve(context.Context) (tlsprofile.Result, error) {
	step := s.steps[min(s.calls, len(s.steps)-1)]
	s.calls++
	return step.result, step.err
}

// listener stands in for server.Server: it holds the running TLS config and
// records every reload, as svr.ReloadTLSConfig would.
type listener struct {
	current *tls.Config
	reloads int
}

func (l *listener) reload(cfg *tls.Config) {
	l.current = cfg
	l.reloads++
}

// newStrictIntermediateWatcher wires a real ProfileWatcher, backed by a fake client
// holding an APIServer with Strict adherence and an Intermediate profile, to the
// production reload handler.
func newStrictIntermediateWatcher(
	t *testing.T, res *scriptedResolve, l *listener, initial tlsprofile.Result,
) *tlsprofile.ProfileWatcher {
	t.Helper()
	apiServer := &unstructured.Unstructured{}
	apiServer.SetAPIVersion("config.openshift.io/v1")
	apiServer.SetKind("APIServer")
	apiServer.SetName("cluster")
	apiServer.Object["spec"] = map[string]any{
		"tlsAdherence":       tlsprofile.AdherenceStrict,
		"tlsSecurityProfile": map[string]any{"type": "Intermediate"},
	}
	fc := fake.NewClientBuilder().WithScheme(runtime.NewScheme()).WithObjects(apiServer).Build()
	return &tlsprofile.ProfileWatcher{
		Client:           fc,
		InitialProfile:   initial.Profile,
		InitialAdherence: initial.Adherence,
		OnProfileChange:  tlsProfileChangeHandler(discardLogger(), res.resolve, l.reload),
	}
}

func reconcileCluster(w *tlsprofile.ProfileWatcher) error {
	_, err := w.Reconcile(context.Background(), reconcile.Request{NamespacedName: types.NamespacedName{Name: "cluster"}})
	return err
}

// TestTransientStartupServesTLS13ThenRecovers covers run()'s startup leniency: a
// transient policy read at startup serves the TLS 1.3 default instead of exiting,
// and once the API is readable the watcher applies the real (Strict, Intermediate)
// cluster policy to the running listener.
func TestTransientStartupServesTLS13ThenRecovers(t *testing.T) {
	startCfg, err := startupServerTLSConfig(discardLogger(), transientUnreadable)
	if err != nil {
		t.Fatalf("startup must be lenient on a transient read, got error: %v", err)
	}
	if startCfg.MinVersion != tls.VersionTLS13 {
		t.Fatalf("startup MinVersion = 0x%x, want TLS 1.3 default", startCfg.MinVersion)
	}

	l := &listener{current: startCfg}
	res := &scriptedResolve{steps: []resolveStep{{result: strictIntermediate}}}
	w := newStrictIntermediateWatcher(t, res, l, transientUnreadable)

	if err := reconcileCluster(w); err != nil {
		t.Fatalf("reconcile after API recovery: %v", err)
	}
	if l.reloads != 1 {
		t.Fatalf("expected 1 reload once the policy is readable, got %d", l.reloads)
	}
	if l.current.MinVersion != tls.VersionTLS12 {
		t.Errorf("after recovery MinVersion = 0x%x, want the cluster profile's TLS 1.2", l.current.MinVersion)
	}
}

// TestUnreadableReloadRetainsConfigAndRetries covers the reload phase: an unreadable
// policy (untrusted result or a resolve error) keeps the running configuration and
// makes the watcher retry, and the change is applied once the read succeeds.
func TestUnreadableReloadRetainsConfigAndRetries(t *testing.T) {
	running := &tls.Config{MinVersion: tls.VersionTLS13}
	l := &listener{current: running}
	res := &scriptedResolve{steps: []resolveStep{
		{result: transientUnreadable},              // policy read but untrusted
		{err: errors.New("apiserver unavailable")}, // resolve itself fails
		{result: strictIntermediate},               // API readable again
	}}
	// The watcher last saw an unset profile/adherence, so Strict+Intermediate is a change.
	w := newStrictIntermediateWatcher(t, res, l, tlsprofile.Result{})

	for i := 1; i <= 2; i++ {
		if err := reconcileCluster(w); err == nil {
			t.Fatalf("reconcile %d: expected an error so the watcher requeues", i)
		}
		if l.reloads != 0 || l.current != running {
			t.Fatalf("reconcile %d: running configuration was replaced on an unreadable reload", i)
		}
	}

	if err := reconcileCluster(w); err != nil {
		t.Fatalf("reconcile 3 (readable): %v", err)
	}
	if l.reloads != 1 || l.current.MinVersion != tls.VersionTLS12 {
		t.Fatalf("expected the retried change to apply TLS 1.2, got reloads=%d MinVersion=0x%x",
			l.reloads, l.current.MinVersion)
	}
	if res.calls != 3 {
		t.Errorf("expected the handler to re-resolve on each retry (3 calls), got %d", res.calls)
	}

	// The successful reload records the policy as seen: an unchanged object is a no-op.
	if err := reconcileCluster(w); err != nil {
		t.Fatalf("reconcile 4 (unchanged): %v", err)
	}
	if res.calls != 3 || l.reloads != 1 {
		t.Errorf("unchanged policy re-resolved or reloaded (calls=%d reloads=%d)", res.calls, l.reloads)
	}
}
