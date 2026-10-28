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

func newAPIServer(profile map[string]any) *unstructured.Unstructured {
	obj := &unstructured.Unstructured{}
	obj.SetGroupVersionKind(apiServerGVK)
	obj.SetName(apiServerName)
	if profile != nil {
		obj.Object[fieldSpec] = map[string]any{
			fieldTLSSecurityProfile: profile,
		}
	}
	return obj
}

func TestParseProfile(t *testing.T) {
	tests := []struct {
		name           string
		apiServer      *unstructured.Unstructured
		wantMinVersion uint16
		wantCiphers    []uint16
	}{
		{
			name:           "nil profile returns Intermediate defaults",
			apiServer:      newAPIServer(nil),
			wantMinVersion: tls.VersionTLS12,
			wantCiphers:    IntermediateCiphers,
		},
		{
			name:           "empty profile returns Intermediate defaults",
			apiServer:      newAPIServer(map[string]any{}),
			wantMinVersion: tls.VersionTLS12,
			wantCiphers:    IntermediateCiphers,
		},
		{
			name: "Intermediate type returns Intermediate defaults",
			apiServer: newAPIServer(map[string]any{
				fieldType: profileTypeIntermediate,
			}),
			wantMinVersion: tls.VersionTLS12,
			wantCiphers:    IntermediateCiphers,
		},
		{
			name: "Modern returns TLS 1.3 with nil ciphers",
			apiServer: newAPIServer(map[string]any{
				fieldType: profileTypeModern,
			}),
			wantMinVersion: tls.VersionTLS13,
			wantCiphers:    nil,
		},
		{
			name: "Old returns TLS 1.0 with the resolved Old cipher set",
			apiServer: newAPIServer(map[string]any{
				fieldType: profileTypeOld,
			}),
			wantMinVersion: tls.VersionTLS10,
			wantCiphers:    resolveCipherNames(oldCipherNames),
		},
		{
			name: "Custom with valid ciphers",
			apiServer: newAPIServer(map[string]any{
				fieldType: profileTypeCustom,
				fieldCustom: map[string]any{
					fieldMinTLSVersion: tlsVersionName12,
					fieldCiphers: []any{
						openSSLCipherECDHEECDSAAES128GCMSHA256,
						"ECDHE-RSA-AES256-GCM-SHA384",
					},
				},
			}),
			wantMinVersion: tls.VersionTLS12,
			wantCiphers: []uint16{
				tls.TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256,
				tls.TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384,
			},
		},
		{
			name: "Custom with unsupported cipher skips it",
			apiServer: newAPIServer(map[string]any{
				fieldType: profileTypeCustom,
				fieldCustom: map[string]any{
					fieldMinTLSVersion: tlsVersionName12,
					fieldCiphers: []any{
						openSSLCipherECDHEECDSAAES128GCMSHA256,
						"UNSUPPORTED-CIPHER",
					},
				},
			}),
			wantMinVersion: tls.VersionTLS12,
			wantCiphers: []uint16{
				tls.TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256,
			},
		},
		{
			name: "Custom with nil custom block falls back to Intermediate",
			apiServer: newAPIServer(map[string]any{
				fieldType: profileTypeCustom,
			}),
			wantMinVersion: tls.VersionTLS12,
			wantCiphers:    IntermediateCiphers,
		},
		{
			name: "Unknown type falls back to Intermediate",
			apiServer: newAPIServer(map[string]any{
				fieldType: "SuperSecure",
			}),
			wantMinVersion: tls.VersionTLS12,
			wantCiphers:    IntermediateCiphers,
		},
		{
			name: "Custom with all unsupported ciphers returns empty slice",
			apiServer: newAPIServer(map[string]any{
				fieldType: profileTypeCustom,
				fieldCustom: map[string]any{
					fieldMinTLSVersion: tlsVersionName12,
					fieldCiphers: []any{
						"DHE-RSA-AES128-GCM-SHA256",
						"DHE-RSA-AES256-GCM-SHA384",
					},
				},
			}),
			wantMinVersion: tls.VersionTLS12,
			wantCiphers:    []uint16{},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			gotMinVersion, gotCiphers, _, _ := parseProfile(tt.apiServer)

			if gotMinVersion != tt.wantMinVersion {
				t.Errorf("parseProfile() minVersion = %d, want %d", gotMinVersion, tt.wantMinVersion)
			}

			if tt.wantCiphers == nil {
				if gotCiphers != nil {
					t.Errorf("parseProfile() ciphers = %v, want nil", gotCiphers)
				}
				return
			}

			if gotCiphers == nil {
				t.Fatal("expected non-nil empty slice, got nil (fail-closed guard needs non-nil)")
			}
			if len(gotCiphers) != len(tt.wantCiphers) {
				t.Errorf("parseProfile() ciphers length = %d, want %d", len(gotCiphers), len(tt.wantCiphers))
				return
			}

			for i, c := range gotCiphers {
				if c != tt.wantCiphers[i] {
					t.Errorf("parseProfile() ciphers[%d] = %d, want %d", i, c, tt.wantCiphers[i])
				}
			}
		})
	}
}

func testScheme() *runtime.Scheme {
	return runtime.NewScheme()
}

func TestResolve_Success(t *testing.T) {
	apiServer := newAPIServer(map[string]any{fieldType: profileTypeModern})
	s := testScheme()
	fc := fake.NewClientBuilder().WithScheme(s).WithObjects(apiServer).Build()

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
	s := testScheme()
	fc := fake.NewClientBuilder().WithScheme(s).Build()

	result, err := resolve(context.Background(), fc)
	if err != nil {
		t.Fatalf("resolve() error = %v, expected fallback", err)
	}
	if result.APIAvailable {
		t.Error("expected APIAvailable = false on NotFound")
	}
	cfg := &tls.Config{}
	result.TLSOpts[0](cfg)
	if cfg.MinVersion != tls.VersionTLS12 {
		t.Errorf("expected TLS 1.2 fallback, got %d", cfg.MinVersion)
	}
}

func TestResolve_TransientError_SetsAPIAvailable(t *testing.T) {
	fc := &errorClient{err: apierrors.NewServiceUnavailable("api down")}
	result, err := resolve(context.Background(), fc)
	if err != nil {
		t.Fatalf("resolve() error = %v, expected fallback", err)
	}
	if !result.APIAvailable {
		t.Error("expected APIAvailable = true on transient error")
	}
}

func TestResolve_Forbidden_SetsAPIAvailable(t *testing.T) {
	gr := schema.GroupResource{
		Group: "config.openshift.io", Resource: "apiservers",
	}
	fc := &errorClient{err: apierrors.NewForbidden(gr, apiServerName, nil)}
	result, err := resolve(context.Background(), fc)
	if err != nil {
		t.Fatalf("resolve() error = %v, expected fallback", err)
	}
	if !result.APIAvailable {
		t.Error("expected APIAvailable = true on Forbidden")
	}
	cfg := &tls.Config{}
	result.TLSOpts[0](cfg)
	if cfg.MinVersion != tls.VersionTLS12 {
		t.Errorf("expected TLS 1.2 fallback, got %d", cfg.MinVersion)
	}
}

func TestResolve_Unauthorized_SetsAPIAvailable(t *testing.T) {
	fc := &errorClient{err: apierrors.NewUnauthorized("not authenticated")}
	result, err := resolve(context.Background(), fc)
	if err != nil {
		t.Fatalf("resolve() error = %v, expected fallback", err)
	}
	if !result.APIAvailable {
		t.Error("expected APIAvailable = true on Unauthorized")
	}
	cfg := &tls.Config{}
	result.TLSOpts[0](cfg)
	if cfg.MinVersion != tls.VersionTLS12 {
		t.Errorf("expected TLS 1.2 fallback, got %d", cfg.MinVersion)
	}
}

func TestResolve_FatalError_Returns(t *testing.T) {
	fc := &errorClient{err: apierrors.NewResourceExpired("resource removed")}
	_, err := resolve(context.Background(), fc)
	if err == nil {
		t.Fatal("expected error on resource expired, got nil")
	}
}

func TestResolve_UnsupportedCiphers_FailsClosed(t *testing.T) {
	apiServer := newAPIServer(map[string]any{
		fieldType: profileTypeCustom,
		fieldCustom: map[string]any{
			fieldMinTLSVersion: tlsVersionName12,
			fieldCiphers:       []any{"UNSUPPORTED-ONLY"},
		},
	})
	s := testScheme()
	fc := fake.NewClientBuilder().WithScheme(s).WithObjects(apiServer).Build()
	_, err := resolve(context.Background(), fc)
	if err == nil {
		t.Fatal("expected fail-closed error for all-unsupported ciphers")
	}
}

func TestProfileWatcher_DetectsChange(t *testing.T) {
	apiServer := newAPIServer(map[string]any{fieldType: profileTypeModern})
	s := testScheme()
	fc := fake.NewClientBuilder().WithScheme(s).WithObjects(apiServer).Build()

	changed := false
	w := &ProfileWatcher{
		Client:         fc,
		InitialProfile: map[string]any{fieldType: profileTypeIntermediate},
		OnProfileChange: func(_ context.Context) error {
			changed = true
			return nil
		},
	}
	w.lastProfile = map[string]any{fieldType: profileTypeIntermediate}

	_, err := w.Reconcile(context.Background(), reconcile.Request{
		NamespacedName: client.ObjectKey{Name: apiServerName},
	})
	if err != nil {
		t.Fatalf("Reconcile() error = %v", err)
	}
	if !changed {
		t.Error("expected OnProfileChange to be called")
	}
}

func TestProfileWatcher_IgnoresNonCluster(t *testing.T) {
	s := testScheme()
	fc := fake.NewClientBuilder().WithScheme(s).Build()
	called := false
	w := &ProfileWatcher{
		Client:          fc,
		OnProfileChange: func(_ context.Context) error { called = true; return nil },
	}
	_, err := w.Reconcile(context.Background(), reconcile.Request{
		NamespacedName: client.ObjectKey{Name: "not-cluster"},
	})
	if err != nil {
		t.Fatalf("Reconcile() error = %v", err)
	}
	if called {
		t.Error("should not call OnProfileChange for non-cluster")
	}
}

func TestProfileWatcher_NoChangeNoCallback(t *testing.T) {
	profile := map[string]any{fieldType: profileTypeIntermediate}
	apiServer := newAPIServer(profile)
	s := testScheme()
	fc := fake.NewClientBuilder().WithScheme(s).WithObjects(apiServer).Build()

	called := false
	w := &ProfileWatcher{
		Client:         fc,
		InitialProfile: profile,
		OnProfileChange: func(_ context.Context) error {
			called = true
			return nil
		},
	}
	w.lastProfile = profile

	_, err := w.Reconcile(context.Background(), reconcile.Request{
		NamespacedName: client.ObjectKey{Name: apiServerName},
	})
	if err != nil {
		t.Fatalf("Reconcile() error = %v", err)
	}
	if called {
		t.Error("should not call OnProfileChange when unchanged")
	}
}

func TestProfileWatcher_NilProfileTreatedAsIntermediate(t *testing.T) {
	// OpenShift leaves spec.tlsSecurityProfile unset (nil) = Intermediate
	// Watcher seeded with {"type": "Intermediate"} should NOT restart
	apiServer := newAPIServer(nil) // no profile set
	s := testScheme()
	fc := fake.NewClientBuilder().WithScheme(s).WithObjects(apiServer).Build()

	called := false
	w := &ProfileWatcher{
		Client:         fc,
		InitialProfile: map[string]any{fieldType: profileTypeIntermediate},
		OnProfileChange: func(_ context.Context) error {
			called = true
			return nil
		},
	}
	w.lastProfile = map[string]any{fieldType: profileTypeIntermediate}

	_, err := w.Reconcile(context.Background(), reconcile.Request{
		NamespacedName: client.ObjectKey{Name: apiServerName},
	})
	if err != nil {
		t.Fatalf("Reconcile() error = %v", err)
	}
	if called {
		t.Error("should NOT restart when nil profile matches Intermediate")
	}
}

func TestResolve_ForbiddenMarksDegraded(t *testing.T) {
	gr := schema.GroupResource{Group: "config.openshift.io", Resource: "apiservers"}
	fc := &errorClient{err: apierrors.NewForbidden(gr, apiServerName, nil)}
	result, err := resolve(context.Background(), fc)
	if err != nil {
		t.Fatalf("resolve() error = %v (controller stays fail-open)", err)
	}
	// Controller stays fail-open (APIAvailable true), but the result is flagged
	// degraded so fail-closed consumers (the backend listener) can reject it.
	if !result.Degraded {
		t.Error("expected Degraded = true on Forbidden read")
	}
}

func TestResolve_UnknownTypeMarksDegraded(t *testing.T) {
	apiServer := newAPIServer(map[string]any{fieldType: "SuperSecure"})
	fc := fake.NewClientBuilder().WithScheme(testScheme()).WithObjects(apiServer).Build()
	result, err := resolve(context.Background(), fc)
	if err != nil {
		t.Fatalf("resolve() error = %v (controller stays fail-open)", err)
	}
	if !result.Degraded {
		t.Error("expected Degraded = true for unknown profile type")
	}
}

func TestResolve_SuccessNotDegraded(t *testing.T) {
	apiServer := newAPIServer(map[string]any{fieldType: profileTypeModern})
	fc := fake.NewClientBuilder().WithScheme(testScheme()).WithObjects(apiServer).Build()
	result, err := resolve(context.Background(), fc)
	if err != nil {
		t.Fatalf("resolve() error = %v", err)
	}
	if result.Degraded {
		t.Error("expected Degraded = false for a cleanly resolved profile")
	}
}

func TestResolve_CustomGroupsAppliedToCurvePreferences(t *testing.T) {
	apiServer := newAPIServer(map[string]any{
		fieldType: profileTypeCustom,
		fieldCustom: map[string]any{
			fieldMinTLSVersion: tlsVersionName12,
			fieldCiphers:       []any{openSSLCipherECDHEECDSAAES128GCMSHA256},
			fieldGroups:        []any{"P-384", "P-256", "BOGUS"},
		},
	})
	fc := fake.NewClientBuilder().WithScheme(testScheme()).WithObjects(apiServer).Build()
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

func TestResolve_CustomCanonicalGroupNames(t *testing.T) {
	// OpenShift uses secp256r1/secp384r1/secp521r1; these valid names must resolve
	// (regression: previously only P-256/P-384 were recognized).
	apiServer := newAPIServer(map[string]any{
		fieldType: profileTypeCustom,
		fieldCustom: map[string]any{
			fieldMinTLSVersion: tlsVersionName13,
			fieldGroups:        []any{"secp384r1", "secp256r1", "secp521r1"},
		},
	})
	fc := fake.NewClientBuilder().WithScheme(testScheme()).WithObjects(apiServer).Build()
	result, err := resolve(context.Background(), fc)
	if err != nil {
		t.Fatalf("resolve() error = %v (canonical group names must resolve)", err)
	}
	cfg := &tls.Config{}
	for _, fn := range result.TLSOpts {
		fn(cfg)
	}
	want := []tls.CurveID{tls.CurveP384, tls.CurveP256, tls.CurveP521}
	if len(cfg.CurvePreferences) != len(want) {
		t.Fatalf("expected %d curves, got %d", len(want), len(cfg.CurvePreferences))
	}
	for i, c := range want {
		if cfg.CurvePreferences[i] != c {
			t.Errorf("curve[%d] = %d, want %d", i, cfg.CurvePreferences[i], c)
		}
	}
}

func TestResolve_CustomAllUnsupportedGroupsFailsClosed(t *testing.T) {
	apiServer := newAPIServer(map[string]any{
		fieldType: profileTypeCustom,
		fieldCustom: map[string]any{
			fieldMinTLSVersion: tlsVersionName12,
			fieldCiphers:       []any{openSSLCipherECDHEECDSAAES128GCMSHA256},
			fieldGroups:        []any{"BOGUS-1", "BOGUS-2"},
		},
	})
	fc := fake.NewClientBuilder().WithScheme(testScheme()).WithObjects(apiServer).Build()
	if _, err := resolve(context.Background(), fc); err == nil {
		t.Fatal("expected error when all custom groups are unsupported")
	}
}

func TestResolve_CustomRSACiphersSupported(t *testing.T) {
	// Parity with pkg/tls and the operator: an RSA GCM cipher the other resolvers
	// accept must also resolve here (regression for the incomplete cipher map).
	apiServer := newAPIServer(map[string]any{
		fieldType: profileTypeCustom,
		fieldCustom: map[string]any{
			fieldMinTLSVersion: tlsVersionName12,
			fieldCiphers:       []any{"AES128-GCM-SHA256", "ECDHE-RSA-AES128-SHA256"},
		},
	})
	fc := fake.NewClientBuilder().WithScheme(testScheme()).WithObjects(apiServer).Build()
	result, err := resolve(context.Background(), fc)
	if err != nil {
		t.Fatalf("resolve() error = %v (RSA/CBC ciphers should be supported)", err)
	}
	cfg := &tls.Config{}
	for _, fn := range result.TLSOpts {
		fn(cfg)
	}
	want := []uint16{tls.TLS_RSA_WITH_AES_128_GCM_SHA256, tls.TLS_ECDHE_RSA_WITH_AES_128_CBC_SHA256}
	if len(cfg.CipherSuites) != len(want) {
		t.Fatalf("expected %d cipher suites, got %d (%v)", len(want), len(cfg.CipherSuites), cfg.CipherSuites)
	}
	for i, c := range want {
		if cfg.CipherSuites[i] != c {
			t.Errorf("cipher[%d] = %d, want %d", i, cfg.CipherSuites[i], c)
		}
	}
}

func TestResolve_CustomTLS13CiphersResolve(t *testing.T) {
	// A TLS 1.3 Custom profile listing only TLS 1.3 cipher names must resolve
	// (they are Go-managed/skipped), not fail closed as "no usable ciphers".
	apiServer := newAPIServer(map[string]any{
		fieldType: profileTypeCustom,
		fieldCustom: map[string]any{
			fieldMinTLSVersion: tlsVersionName13,
			fieldCiphers:       []any{"TLS_AES_128_GCM_SHA256"},
		},
	})
	fc := fake.NewClientBuilder().WithScheme(testScheme()).WithObjects(apiServer).Build()
	result, err := resolve(context.Background(), fc)
	if err != nil {
		t.Fatalf("resolve() error = %v (TLS 1.3 custom profile should resolve)", err)
	}
	cfg := &tls.Config{}
	for _, fn := range result.TLSOpts {
		fn(cfg)
	}
	if cfg.MinVersion != tls.VersionTLS13 {
		t.Errorf("expected TLS 1.3, got %d", cfg.MinVersion)
	}
}

func newAPIServerWithAdherence(profile map[string]any, adherence string) *unstructured.Unstructured {
	obj := newAPIServer(profile)
	spec, _, _ := unstructured.NestedMap(obj.Object, fieldSpec)
	if spec == nil {
		spec = map[string]any{}
	}
	spec[fieldTLSAdherence] = adherence
	obj.Object[fieldSpec] = spec
	return obj
}

func TestResolve_OldProfileAppliesCiphers(t *testing.T) {
	// The Old profile must install the runtime-supported Old cipher set (parity with
	// the shared BFF and operator resolvers), not leave Go defaults.
	apiServer := newAPIServer(map[string]any{fieldType: profileTypeOld})
	fc := fake.NewClientBuilder().WithScheme(testScheme()).WithObjects(apiServer).Build()
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
	if len(cfg.CipherSuites) == 0 {
		t.Error("expected the Old profile to install a non-empty cipher set, got none")
	}
}

func TestResolve_MalformedGroupsMarksDegraded(t *testing.T) {
	// A groups field of the wrong shape (not a string array) must surface as degraded
	// so a strict consumer rejects it rather than silently serving default curves.
	apiServer := newAPIServer(map[string]any{
		fieldType: profileTypeCustom,
		fieldCustom: map[string]any{
			fieldMinTLSVersion: tlsVersionName12,
			fieldCiphers:       []any{openSSLCipherECDHEECDSAAES128GCMSHA256},
			fieldGroups:        "not-a-string-array",
		},
	})
	fc := fake.NewClientBuilder().WithScheme(testScheme()).WithObjects(apiServer).Build()
	result, err := resolve(context.Background(), fc)
	if err != nil {
		t.Fatalf("resolve() error = %v", err)
	}
	if !result.Degraded {
		t.Error("expected Degraded = true for a malformed groups field")
	}
}

func TestResolve_PopulatesAdherence(t *testing.T) {
	apiServer := newAPIServerWithAdherence(map[string]any{fieldType: profileTypeIntermediate}, AdherenceStrict)
	fc := fake.NewClientBuilder().WithScheme(testScheme()).WithObjects(apiServer).Build()
	result, err := resolve(context.Background(), fc)
	if err != nil {
		t.Fatalf("resolve() error = %v", err)
	}
	if result.Adherence != AdherenceStrict {
		t.Errorf("expected Adherence = %q, got %q", AdherenceStrict, result.Adherence)
	}
}

func TestProfileWatcher_DetectsAdherenceChange(t *testing.T) {
	// Same profile, but adherence changes Legacy -> Strict: must fire the callback.
	apiServer := newAPIServerWithAdherence(map[string]any{fieldType: profileTypeIntermediate}, AdherenceStrict)
	fc := fake.NewClientBuilder().WithScheme(testScheme()).WithObjects(apiServer).Build()

	fired := false
	w := &ProfileWatcher{
		Client:           fc,
		InitialProfile:   map[string]any{fieldType: profileTypeIntermediate},
		InitialAdherence: AdherenceLegacy,
		OnProfileChange:  func(_ context.Context) error { fired = true; return nil },
	}
	w.lastProfile = map[string]any{fieldType: profileTypeIntermediate}
	w.lastAdherence = AdherenceLegacy

	if _, err := w.Reconcile(context.Background(), reconcile.Request{
		NamespacedName: client.ObjectKey{Name: apiServerName},
	}); err != nil {
		t.Fatalf("Reconcile() error = %v", err)
	}
	if !fired {
		t.Error("expected OnProfileChange to fire on adherence change")
	}
}

func TestProfileWatcher_CallbackErrorDoesNotAdvanceLastProfile(t *testing.T) {
	apiServer := newAPIServer(map[string]any{fieldType: profileTypeModern})
	fc := fake.NewClientBuilder().WithScheme(testScheme()).WithObjects(apiServer).Build()

	calls := 0
	w := &ProfileWatcher{
		Client:         fc,
		InitialProfile: map[string]any{fieldType: profileTypeIntermediate},
		OnProfileChange: func(_ context.Context) error {
			calls++
			return context.DeadlineExceeded // simulate a failed re-resolve
		},
	}
	w.lastProfile = map[string]any{fieldType: profileTypeIntermediate}

	// First reconcile: callback fails, so the request is requeued (error) and
	// lastProfile must NOT advance.
	if _, err := w.Reconcile(context.Background(), reconcile.Request{
		NamespacedName: client.ObjectKey{Name: apiServerName},
	}); err == nil {
		t.Fatal("expected Reconcile to return the callback error for requeue")
	}
	// Second reconcile (the retry): the change is still pending, so the callback
	// fires again rather than being lost.
	_, _ = w.Reconcile(context.Background(), reconcile.Request{
		NamespacedName: client.ObjectKey{Name: apiServerName},
	})
	if calls < 2 {
		t.Errorf("expected callback retried after failure, got %d calls", calls)
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
