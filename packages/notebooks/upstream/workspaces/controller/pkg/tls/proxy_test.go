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
	"errors"
	"reflect"
	"strconv"
	"strings"
	"testing"

	apierrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/api/meta"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"
)

func TestGroupCurveIDsMatchCryptoTLS(t *testing.T) {
	checks := []struct {
		group string
		id    tls.CurveID
	}{
		{group: groupSecP256r1, id: tls.CurveP256},
		{group: groupSecP384r1, id: tls.CurveP384},
		{group: groupSecP521r1, id: tls.CurveP521},
		{group: groupX25519, id: tls.X25519},
		{group: groupX25519MLKEM768, id: tls.X25519MLKEM768},
	}
	for _, check := range checks {
		got := groupToCurveID[check.group]
		want := strconv.Itoa(int(check.id))
		if got != want {
			t.Errorf("%s = %s, crypto/tls CurveID %s", check.group, got, want)
		}
	}
	if tls.CurveP256 != 23 || tls.CurveP384 != 24 || tls.CurveP521 != 25 ||
		tls.X25519 != 29 || tls.X25519MLKEM768 != 4588 {
		t.Fatal("crypto/tls CurveIDs drifted from the kube-rbac-proxy flag values")
	}
}

func TestResolveProxyTLS(t *testing.T) {
	fallback := ProxyTLS{MinVersion: tlsVersionName12, Ciphers: intermediateIANACiphers(false)}
	fipsFallback := ProxyTLS{MinVersion: tlsVersionName12, Ciphers: intermediateIANACiphers(true)}
	strictIntermediate := ProxyTLS{
		MinVersion: tlsVersionName12,
		Ciphers:    intermediateIANACiphers(false),
		Curves:     []string{curveX25519MLKEM768, curveX25519, curveP256, curveP384},
	}
	strictModern := ProxyTLS{
		MinVersion: tlsVersionName13,
		Curves:     []string{curveX25519MLKEM768, curveX25519, curveP256, curveP384},
	}
	strictCustom := ProxyTLS{
		MinVersion: tlsVersionName12,
		Ciphers: []string{
			fipsCipherRSA256,
			http2CipherECDSA,
		},
		Curves: []string{curveP521, curveX25519, curveP256},
	}
	tls13Custom := ProxyTLS{
		MinVersion: tlsVersionName13,
		Curves:     []string{curveP384},
	}

	tests := []struct {
		name    string
		object  client.Object
		readErr error
		fips    bool
		want    ProxyTLS
		wantErr error
	}{
		{
			name: "missing APIServer uses hardened Intermediate",
			want: fallback,
		},
		{
			name:    "API group is absent",
			readErr: &meta.NoKindMatchError{GroupKind: schema.GroupKind{Group: apiServerGroup, Kind: "APIServer"}},
			want:    fallback,
		},
		{
			name: "forbidden read fails closed",
			readErr: apierrors.NewForbidden(
				schema.GroupResource{Group: apiServerGroup, Resource: "apiservers"},
				apiServerName,
				errors.New("denied"),
			),
			wantErr: errors.New("reading APIServer"),
		},
		{
			name:   "unset adherence ignores a Modern profile",
			object: proxyAPIServer(map[string]any{fieldType: profileTypeModern}, ""),
			want:   fallback,
		},
		{
			name:   "NoOpinion ignores a Modern profile",
			object: proxyAPIServer(map[string]any{fieldType: profileTypeModern}, adherenceNoOpinion),
			want:   fallback,
		},
		{
			name:   "LegacyAdheringComponentsOnly ignores a Modern profile",
			object: proxyAPIServer(map[string]any{fieldType: profileTypeModern}, adherenceLegacy),
			want:   fallback,
		},
		{
			name:   "strict with no profile uses hardened Intermediate",
			object: proxyAPIServer(nil, "StrictAllComponents"),
			want:   fallback,
		},
		{
			name:   "strict empty type uses hardened Intermediate",
			object: proxyAPIServer(map[string]any{}, "StrictAllComponents"),
			want:   fallback,
		},
		{
			name:   "strict Intermediate expands the well-known profile",
			object: proxyAPIServer(map[string]any{fieldType: profileTypeIntermediate}, "StrictAllComponents"),
			want:   strictIntermediate,
		},
		{
			name:   "strict Intermediate drops non-FIPS ciphers and groups",
			object: proxyAPIServer(map[string]any{fieldType: profileTypeIntermediate}, "StrictAllComponents"),
			fips:   true,
			want: ProxyTLS{
				MinVersion: tlsVersionName12,
				Ciphers:    intermediateIANACiphers(true),
				Curves:     []string{curveP256, curveP384},
			},
		},
		{
			name:   "FIPS fallback drops ChaCha20",
			object: proxyAPIServer(nil, adherenceLegacy),
			fips:   true,
			want:   fipsFallback,
		},
		{
			name:   "strict Modern is TLS 1.3 with curves and no cipher list",
			object: proxyAPIServer(map[string]any{fieldType: profileTypeModern}, "StrictAllComponents"),
			want:   strictModern,
		},
		{
			name:   "unknown adherence is strict",
			object: proxyAPIServer(map[string]any{fieldType: profileTypeModern}, "FuturePolicy"),
			want:   strictModern,
		},
		{
			name:   "strict custom keeps usable ciphers and curves in order",
			object: proxyAPIServer(customProfile(), "StrictAllComponents"),
			want:   strictCustom,
		},
		{
			name:   "strict TLS 1.3 custom omits the cipher flag",
			object: proxyAPIServer(tls13CustomProfile(), "StrictAllComponents"),
			want:   tls13Custom,
		},
		{
			name: "strict custom P-521 is kept in FIPS mode",
			object: proxyAPIServer(map[string]any{
				fieldType: profileTypeCustom,
				fieldCustom: map[string]any{
					fieldMinTLSVersion: tlsVersionName13,
					fieldGroups:        []any{groupSecP521r1},
				},
			}, "StrictAllComponents"),
			fips: true,
			want: ProxyTLS{MinVersion: tlsVersionName13, Curves: []string{curveP521}},
		},
		{
			name:    "strict Old is unrepresentable",
			object:  proxyAPIServer(map[string]any{fieldType: profileTypeOld}, "StrictAllComponents"),
			wantErr: ErrProxyTLSUnusable,
		},
		{
			name: "strict custom TLS1.2 token is unrepresentable",
			object: proxyAPIServer(map[string]any{
				fieldType: profileTypeCustom,
				fieldCustom: map[string]any{
					fieldMinTLSVersion: "TLS1.2",
					fieldCiphers:       []any{openSSLCipherECDHERSAAES128GCMSHA256},
				},
			}, "StrictAllComponents"),
			wantErr: ErrProxyTLSUnusable,
		},
		{
			name:    "strict custom without a custom block fails",
			object:  proxyAPIServer(map[string]any{fieldType: profileTypeCustom}, "StrictAllComponents"),
			wantErr: ErrProxyTLSUnusable,
		},
		{
			name:    "strict unknown type fails",
			object:  proxyAPIServer(map[string]any{fieldType: "Unexpected"}, "StrictAllComponents"),
			wantErr: ErrProxyTLSUnusable,
		},
		{
			name: "strict TLS 1.2 ciphers that are all unusable fail",
			object: proxyAPIServer(map[string]any{
				fieldType: profileTypeCustom,
				fieldCustom: map[string]any{
					fieldMinTLSVersion: tlsVersionName12,
					fieldCiphers:       []any{"DHE-RSA-AES128-GCM-SHA256", "DES-CBC3-SHA"},
				},
			}, "StrictAllComponents"),
			wantErr: ErrProxyTLSUnusable,
		},
		{
			name: "strict TLS 1.2 without an HTTP/2 cipher fails",
			object: proxyAPIServer(map[string]any{
				fieldType: profileTypeCustom,
				fieldCustom: map[string]any{
					fieldMinTLSVersion: tlsVersionName12,
					fieldCiphers:       []any{openSSLCipherECDHERSAAES256GCMSHA384},
				},
			}, "StrictAllComponents"),
			wantErr: ErrProxyTLSUnusable,
		},
		{
			name: "strict groups that are all unusable fail",
			object: proxyAPIServer(map[string]any{
				fieldType: profileTypeCustom,
				fieldCustom: map[string]any{
					fieldMinTLSVersion: tlsVersionName13,
					fieldGroups:        []any{groupX25519, groupX25519MLKEM768, "SecP256r1MLKEM768"},
				},
			}, "StrictAllComponents"),
			fips:    true,
			wantErr: ErrProxyTLSUnusable,
		},
		{
			name: "legacy ignores an invalid profile",
			object: proxyAPIServer(map[string]any{
				fieldType: profileTypeCustom,
				fieldCustom: map[string]any{
					fieldMinTLSVersion: "TLS1.2",
				},
			}, adherenceLegacy),
			want: fallback,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := resolveProxyCase(tt.object, tt.readErr, tt.fips)
			if tt.wantErr != nil {
				if !errors.Is(err, tt.wantErr) && (err == nil || !strings.Contains(err.Error(), tt.wantErr.Error())) {
					t.Fatalf("error = %v, want %v", err, tt.wantErr)
				}
				return
			}
			if err != nil {
				t.Fatalf("ResolveProxyTLS() error = %v", err)
			}
			if !reflect.DeepEqual(got, tt.want) {
				t.Fatalf("ResolveProxyTLS() = %#v, want %#v", got, tt.want)
			}
			assertProxyFlagShape(t, got.Args())
		})
	}
}

func TestProxyTLSArgsOmitCipherFlagForTLS13(t *testing.T) {
	settings, err := resolveProxyCase(proxyAPIServer(tls13CustomProfile(), "StrictAllComponents"), nil, false)
	if err != nil {
		t.Fatal(err)
	}
	args := settings.Args()
	if len(args) != 2 {
		t.Fatalf("args = %v", args)
	}
	if args[0] != "--tls-min-version="+tlsVersionName13 {
		t.Fatalf("min version arg = %s", args[0])
	}
	if args[1] != "--tls-curve-preferences="+curveP384 {
		t.Fatalf("curve arg = %s", args[1])
	}
	for _, arg := range args {
		if strings.Contains(arg, "cipher") {
			t.Fatalf("TLS 1.3 args include a cipher flag: %s", arg)
		}
	}
}

func TestIntermediateFallbackOmitsCurves(t *testing.T) {
	settings, err := resolveProxyCase(nil, nil, false)
	if err != nil {
		t.Fatal(err)
	}
	for _, arg := range settings.Args() {
		if strings.Contains(arg, "curve") {
			t.Fatalf("fallback args include a curve flag: %s", arg)
		}
	}
	joined := strings.Join(settings.Ciphers, ",")
	if !strings.Contains(settings.Args()[1], joined) {
		t.Fatalf("cipher flag = %v", settings.Args())
	}
}

func intermediateIANACiphers(fips bool) []string {
	names := []string{
		http2CipherECDSA,
		http2CipherRSA,
		fipsCipherECDSA256,
		fipsCipherRSA256,
		ianaCipherECDHEECDSAChaCha,
		ianaCipherECDHERSAChaCha,
	}
	if !fips {
		return names
	}
	return names[:4]
}

func customProfile() map[string]any {
	return map[string]any{
		fieldType: profileTypeCustom,
		fieldCustom: map[string]any{
			fieldMinTLSVersion: tlsVersionName12,
			fieldCiphers: []any{
				openSSLCipherECDHERSAAES256GCMSHA384,
				ianaCipherTLS13AES128,
				openSSLCipherECDHEECDSAAES128GCMSHA256,
				openSSLCipherECDHEECDSAAES128GCMSHA256,
				"DHE-RSA-AES128-GCM-SHA256",
			},
			fieldGroups: []any{
				"BOGUS",
				groupSecP521r1,
				groupX25519,
				groupSecP256r1,
				groupSecP256r1,
				"SecP256r1MLKEM768",
			},
		},
	}
}

func tls13CustomProfile() map[string]any {
	return map[string]any{
		fieldType: profileTypeCustom,
		fieldCustom: map[string]any{
			fieldMinTLSVersion: tlsVersionName13,
			fieldCiphers:       []any{ianaCipherTLS13AES128, ianaCipherTLS13AES256},
			fieldGroups:        []any{groupSecP384r1},
		},
	}
}

func proxyAPIServer(profile map[string]any, adherence string) *unstructured.Unstructured {
	obj := newAPIServer(profile)
	if adherence == "" && profile != nil {
		return obj
	}
	spec, _ := obj.Object[fieldSpec].(map[string]any)
	if spec == nil {
		spec = map[string]any{}
		obj.Object[fieldSpec] = spec
	}
	if profile == nil {
		delete(spec, fieldTLSSecurityProfile)
	}
	if adherence != "" {
		spec[fieldTLSAdherence] = adherence
	}
	return obj
}

func resolveProxyCase(obj client.Object, readErr error, fips bool) (ProxyTLS, error) {
	if readErr != nil {
		return ResolveProxyTLS(context.Background(), &errorClient{err: readErr}, fips)
	}
	builder := fake.NewClientBuilder().WithScheme(testScheme())
	if obj != nil {
		builder = builder.WithObjects(obj)
	}
	return ResolveProxyTLS(context.Background(), builder.Build(), fips)
}

func assertProxyFlagShape(t *testing.T, args []string) {
	t.Helper()
	for _, arg := range args {
		if strings.HasPrefix(arg, "--tls-cipher-suite=") || strings.HasPrefix(arg, "--metrics-tls") {
			t.Errorf("unexpected flag %s", arg)
		}
		if strings.Contains(arg, "=TLS1.") {
			t.Errorf("unexpected TLS version token in %s", arg)
		}
	}
}
