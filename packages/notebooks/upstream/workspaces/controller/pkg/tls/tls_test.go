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
			name: "Old returns TLS 1.0 with nil ciphers",
			apiServer: newAPIServer(map[string]any{
				fieldType: profileTypeOld,
			}),
			wantMinVersion: tls.VersionTLS10,
			wantCiphers:    nil,
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
			gotMinVersion, gotCiphers := parseProfile(tt.apiServer)

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
	fc := &errorClient{err: apierrors.NewGone("resource removed")}
	_, err := resolve(context.Background(), fc)
	if err == nil {
		t.Fatal("expected error on Gone, got nil")
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
		OnProfileChange: func(_ context.Context) {
			changed = true
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
		OnProfileChange: func(_ context.Context) { called = true },
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
		OnProfileChange: func(_ context.Context) {
			called = true
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
		OnProfileChange: func(_ context.Context) {
			called = true
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
