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

package tls

import (
	"context"
	"crypto/tls"
	"testing"

	apierrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"
)

func newAPIServer(profile map[string]interface{}) *unstructured.Unstructured {
	obj := &unstructured.Unstructured{}
	obj.SetGroupVersionKind(schema.GroupVersionKind{
		Group: "config.openshift.io", Version: "v1", Kind: "APIServer",
	})
	obj.SetName("cluster")
	if profile != nil {
		_ = unstructured.SetNestedMap(obj.Object, profile, "spec", "tlsSecurityProfile")
	}
	return obj
}

func TestResolve_Success(t *testing.T) {
	apiServer := newAPIServer(map[string]interface{}{"type": "Modern"})
	fc := fake.NewClientBuilder().WithScheme(runtime.NewScheme()).WithObjects(apiServer).Build()
	result, err := resolve(context.Background(), fc)
	if err != nil {
		t.Fatalf("resolve() error = %v", err)
	}
	if !result.APIAvailable {
		t.Error("expected APIAvailable = true")
	}
	cfg := &tls.Config{}
	for _, fn := range result.TLSOpts {
		fn(cfg)
	}
	if cfg.MinVersion != tls.VersionTLS13 {
		t.Errorf("expected TLS 1.3, got %d", cfg.MinVersion)
	}
}

func TestResolve_NotFound(t *testing.T) {
	fc := fake.NewClientBuilder().WithScheme(runtime.NewScheme()).Build()
	result, err := resolve(context.Background(), fc)
	if err != nil {
		t.Fatalf("resolve() error = %v, expected fallback", err)
	}
	if result.APIAvailable {
		t.Error("expected APIAvailable = false")
	}
	cfg := &tls.Config{}
	result.TLSOpts[0](cfg)
	if cfg.MinVersion != tls.VersionTLS12 {
		t.Errorf("expected TLS 1.2, got %d", cfg.MinVersion)
	}
}

func TestResolve_TransientError(t *testing.T) {
	fc := &errorClient{err: apierrors.NewServiceUnavailable("api down")}
	result, err := resolve(context.Background(), fc)
	if err != nil {
		t.Fatalf("resolve() error = %v", err)
	}
	if !result.APIAvailable {
		t.Error("expected APIAvailable = true on transient error")
	}
}

func TestResolve_Forbidden(t *testing.T) {
	gr := schema.GroupResource{Group: "config.openshift.io", Resource: "apiservers"}
	fc := &errorClient{err: apierrors.NewForbidden(gr, "cluster", nil)}
	result, err := resolve(context.Background(), fc)
	if err != nil {
		t.Fatalf("resolve() error = %v, expected fallback on Forbidden", err)
	}
	if !result.APIAvailable {
		t.Error("expected APIAvailable = true on Forbidden (watcher should register)")
	}
	cfg := &tls.Config{}
	result.TLSOpts[0](cfg)
	if cfg.MinVersion != tls.VersionTLS12 {
		t.Errorf("expected TLS 1.2 fallback, got %d", cfg.MinVersion)
	}
}

func TestResolve_Unauthorized(t *testing.T) {
	fc := &errorClient{err: apierrors.NewUnauthorized("not authorized")}
	result, err := resolve(context.Background(), fc)
	if err != nil {
		t.Fatalf("resolve() error = %v, expected fallback on Unauthorized", err)
	}
	if !result.APIAvailable {
		t.Error("expected APIAvailable = true on Unauthorized (watcher should register)")
	}
	cfg := &tls.Config{}
	result.TLSOpts[0](cfg)
	if cfg.MinVersion != tls.VersionTLS12 {
		t.Errorf("expected TLS 1.2 fallback, got %d", cfg.MinVersion)
	}
}

func TestResolve_OldProfileHonorsCiphers(t *testing.T) {
	// The Old profile must enable its legacy cipher set (the subset Go supports),
	// consistent with the pkg/tls path — not fall back to Go's defaults.
	apiServer := newAPIServer(map[string]interface{}{"type": "Old"})
	fc := fake.NewClientBuilder().WithScheme(runtime.NewScheme()).WithObjects(apiServer).Build()
	result, err := resolve(context.Background(), fc)
	if err != nil {
		t.Fatalf("resolve() error = %v", err)
	}
	cfg := &tls.Config{}
	for _, fn := range result.TLSOpts {
		fn(cfg)
	}
	if cfg.MinVersion != tls.VersionTLS10 {
		t.Errorf("expected TLS 1.0, got %d", cfg.MinVersion)
	}
	// DES-CBC3-SHA is dropped (unsupported by Go); the rest resolve.
	if len(cfg.CipherSuites) < 10 {
		t.Errorf("expected Old profile ciphers to be honored, got %d", len(cfg.CipherSuites))
	}
}

func TestResolve_CustomGroups(t *testing.T) {
	// A Custom profile that restricts groups must be enforced via CurvePreferences.
	apiServer := newAPIServer(map[string]interface{}{
		"type": "Custom",
		"custom": map[string]interface{}{
			"minTLSVersion": "VersionTLS13",
			"groups":        []interface{}{"P-384", "P-256", "BOGUS"},
		},
	})
	fc := fake.NewClientBuilder().WithScheme(runtime.NewScheme()).WithObjects(apiServer).Build()
	result, err := resolve(context.Background(), fc)
	if err != nil {
		t.Fatalf("resolve() error = %v", err)
	}
	cfg := &tls.Config{}
	for _, fn := range result.TLSOpts {
		fn(cfg)
	}
	if len(cfg.CurvePreferences) != 2 {
		t.Fatalf("expected 2 curve preferences (BOGUS dropped), got %d", len(cfg.CurvePreferences))
	}
	if cfg.CurvePreferences[0] != tls.CurveP384 || cfg.CurvePreferences[1] != tls.CurveP256 {
		t.Errorf("curve preferences not honored in order: %v", cfg.CurvePreferences)
	}
}

func TestResolve_CustomAllUnsupportedGroups(t *testing.T) {
	// A Custom profile where every group is unmapped must fail closed.
	apiServer := newAPIServer(map[string]interface{}{
		"type": "Custom",
		"custom": map[string]interface{}{
			"minTLSVersion": "VersionTLS13",
			"groups":        []interface{}{"BOGUS-1", "BOGUS-2"},
		},
	})
	fc := fake.NewClientBuilder().WithScheme(runtime.NewScheme()).WithObjects(apiServer).Build()
	_, err := resolve(context.Background(), fc)
	if err == nil {
		t.Fatal("expected error when all custom groups are unsupported")
	}
}

func TestResolve_WellKnownProfileNoCurvePreferences(t *testing.T) {
	// Well-known profiles don't restrict groups, so CurvePreferences stays nil.
	apiServer := newAPIServer(map[string]interface{}{"type": "Intermediate"})
	fc := fake.NewClientBuilder().WithScheme(runtime.NewScheme()).WithObjects(apiServer).Build()
	result, err := resolve(context.Background(), fc)
	if err != nil {
		t.Fatalf("resolve() error = %v", err)
	}
	cfg := &tls.Config{}
	for _, fn := range result.TLSOpts {
		fn(cfg)
	}
	if cfg.CurvePreferences != nil {
		t.Errorf("expected nil CurvePreferences for well-known profile, got %v", cfg.CurvePreferences)
	}
}

func TestProfileWatcher_DetectsChange(t *testing.T) {
	apiServer := newAPIServer(map[string]interface{}{"type": "Modern"})
	fc := fake.NewClientBuilder().WithScheme(runtime.NewScheme()).WithObjects(apiServer).Build()
	changed := false
	w := &ProfileWatcher{
		Client:         fc,
		InitialProfile: map[string]interface{}{"type": "Intermediate"},
		OnProfileChange: func(_ context.Context) {
			changed = true
		},
	}
	w.lastProfile = map[string]interface{}{"type": "Intermediate"}
	_, err := w.Reconcile(context.Background(), reconcile.Request{
		NamespacedName: client.ObjectKey{Name: "cluster"},
	})
	if err != nil {
		t.Fatalf("Reconcile() error = %v", err)
	}
	if !changed {
		t.Error("expected OnProfileChange to be called")
	}
}

func TestProfileWatcher_IgnoresNonCluster(t *testing.T) {
	fc := fake.NewClientBuilder().WithScheme(runtime.NewScheme()).Build()
	called := false
	w := &ProfileWatcher{
		Client:          fc,
		OnProfileChange: func(_ context.Context) { called = true },
	}
	_, err := w.Reconcile(context.Background(), reconcile.Request{
		NamespacedName: client.ObjectKey{Name: "not-cluster"},
	})
	if err != nil {
		t.Fatalf("Reconcile() error = %v", err)
	}
	if called {
		t.Error("should not fire for non-cluster")
	}
}

func TestProfileWatcher_NilProfileTreatedAsIntermediate(t *testing.T) {
	apiServer := newAPIServer(nil)
	fc := fake.NewClientBuilder().WithScheme(runtime.NewScheme()).
		WithObjects(apiServer).Build()

	called := false
	w := &ProfileWatcher{
		Client:         fc,
		InitialProfile: map[string]interface{}{"type": "Intermediate"},
		OnProfileChange: func(_ context.Context) {
			called = true
		},
	}
	w.lastProfile = map[string]interface{}{"type": "Intermediate"}

	_, err := w.Reconcile(context.Background(), reconcile.Request{
		NamespacedName: client.ObjectKey{Name: "cluster"},
	})
	if err != nil {
		t.Fatalf("Reconcile() error = %v", err)
	}
	if called {
		t.Error("should NOT restart when nil profile matches Intermediate")
	}
}

type errorClient struct {
	client.Client
	err error
}

func (c *errorClient) Get(
	_ context.Context, _ client.ObjectKey,
	_ client.Object, _ ...client.GetOption,
) error {
	return c.err
}
