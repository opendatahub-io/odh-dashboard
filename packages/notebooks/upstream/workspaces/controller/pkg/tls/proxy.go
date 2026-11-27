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
	"crypto/fips140"
	"crypto/tls"
	"errors"
	"fmt"
	"os"
	"slices"
	"strings"
	"sync"

	apierrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/api/meta"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

const (
	adherenceNoOpinion = "NoOpinion"
	adherenceLegacy    = "LegacyAdheringComponentsOnly"

	fieldProfileOld   = "old"
	fieldProfileInter = "intermediate"
	fieldProfileMod   = "modern"

	http2CipherECDSA   = "TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256"
	http2CipherRSA     = "TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256"
	fipsCipherECDSA256 = "TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384"
	fipsCipherRSA256   = "TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384"

	curveP256           = "23"
	curveP384           = "24"
	curveP521           = "25"
	curveX25519         = "29"
	curveX25519MLKEM768 = "4588"
)

// ErrProxyTLSUnusable is returned when a strict TLS profile cannot be represented
// by the Workspace kube-rbac-proxy sidecar. Reconcile returns this error and does
// not publish a new pod template from that profile.
var ErrProxyTLSUnusable = errors.New("kube-rbac-proxy TLS profile is unusable")

// ProxyTLS is the kube-rbac-proxy listener TLS configuration.
// Ciphers are IANA names. Curves are decimal CurveIDs.
// Ciphers is empty when the cipher flag must be omitted.
// Curves is empty when the honored profile does not restrict groups.
type ProxyTLS struct {
	MinVersion string
	Ciphers    []string
	Curves     []string
}

// Args returns kube-rbac-proxy flags for this listener.
// The cipher flag is omitted for TLS 1.3. The curve flag is omitted when
// Curves is empty. The hardened Intermediate fallback has no group list, so
// it leaves Curves empty.
func (p ProxyTLS) Args() []string {
	args := make([]string, 0, 3)
	if p.MinVersion != "" {
		args = append(args, "--tls-min-version="+p.MinVersion)
	}
	if len(p.Ciphers) > 0 {
		args = append(args, "--tls-cipher-suites="+strings.Join(p.Ciphers, ","))
	}
	if len(p.Curves) > 0 {
		args = append(args, "--tls-curve-preferences="+strings.Join(p.Curves, ","))
	}
	return args
}

// fipsProcReadLog reports a missing FIPS proc file once. FIPSEnabled runs on every
// reconcile, and a container without this file would otherwise log on each pass.
var fipsProcReadLog sync.Once

// FIPSEnabled reports whether this process should drop non-FIPS ciphers and groups.
//
// OpenShift enables FIPS for the whole cluster, so the node running this controller
// matches the nodes that run Workspace pods. A missing or unreadable
// /proc/sys/crypto/fips_enabled is treated as non-FIPS and logged once; the
// controller keeps reconciling.
func FIPSEnabled() bool {
	if fips140.Enabled() {
		return true
	}
	data, err := os.ReadFile("/proc/sys/crypto/fips_enabled")
	if err != nil {
		fipsProcReadLog.Do(func() {
			log.Info(
				"unable to read /proc/sys/crypto/fips_enabled; treating this controller as non-FIPS",
				"error", err,
			)
		})
		return false
	}
	return strings.TrimSpace(string(data)) == "1"
}

// ResolveProxyTLS reads the APIServer TLS profile and adherence and returns the
// kube-rbac-proxy listener settings for the next StatefulSet reconcile.
// Missing APIServer, NoOpinion, and LegacyAdheringComponentsOnly use hardened
// Intermediate defaults. StrictAllComponents and any other adherence use the
// configured profile. A strict profile that cannot be represented returns
// ErrProxyTLSUnusable. Other read failures are returned so reconcile does not
// publish a new pod template from an unknown profile.
func ResolveProxyTLS(ctx context.Context, reader client.Reader, fips bool) (ProxyTLS, error) {
	apiServer := &unstructured.Unstructured{}
	apiServer.SetGroupVersionKind(apiServerGVK)
	if err := reader.Get(ctx, client.ObjectKey{Name: apiServerName}, apiServer); err != nil {
		if meta.IsNoMatchError(err) || apierrors.IsNotFound(err) {
			return intermediateProxyTLS(fips), nil
		}
		return ProxyTLS{}, fmt.Errorf("reading APIServer for kube-rbac-proxy TLS: %w", err)
	}

	adherence, _, err := unstructured.NestedString(apiServer.Object, fieldSpec, fieldTLSAdherence)
	if err != nil {
		return ProxyTLS{}, fmt.Errorf("reading APIServer tlsAdherence for kube-rbac-proxy: %w", err)
	}
	if !strictAdherence(adherence) {
		return intermediateProxyTLS(fips), nil
	}

	profile, found, err := unstructured.NestedMap(apiServer.Object, fieldSpec, fieldTLSSecurityProfile)
	if err != nil {
		return ProxyTLS{}, fmt.Errorf("%w: reading tlsSecurityProfile: %w", ErrProxyTLSUnusable, err)
	}
	if !found || profile == nil {
		return intermediateProxyTLS(fips), nil
	}
	return proxyTLSFromProfile(profile, fips)
}

func strictAdherence(adherence string) bool {
	switch adherence {
	case "", adherenceNoOpinion, adherenceLegacy:
		return false
	default:
		return true
	}
}

type profileSpec struct {
	minVersion string
	ciphers    []string
	groups     []string
}

func proxyTLSFromProfile(profile map[string]any, fips bool) (ProxyTLS, error) {
	profileType, _, err := unstructured.NestedString(profile, fieldType)
	if err != nil {
		return ProxyTLS{}, fmt.Errorf("%w: reading profile type: %w", ErrProxyTLSUnusable, err)
	}
	if profileType == "" {
		return intermediateProxyTLS(fips), nil
	}
	spec, err := specForType(profile, profileType)
	if err != nil {
		return ProxyTLS{}, err
	}
	return specToProxyTLS(spec, fips)
}

func specForType(profile map[string]any, profileType string) (profileSpec, error) {
	switch profileType {
	case profileTypeOld:
		spec := builtinOld()
		err := applyOptionalBlock(&spec, profile, fieldProfileOld)
		return spec, err
	case profileTypeIntermediate:
		spec := builtinIntermediate()
		err := applyOptionalBlock(&spec, profile, fieldProfileInter)
		return spec, err
	case profileTypeModern:
		spec := builtinModern()
		err := applyOptionalBlock(&spec, profile, fieldProfileMod)
		return spec, err
	case profileTypeCustom:
		block, found, err := unstructured.NestedMap(profile, fieldCustom)
		if err != nil {
			return profileSpec{}, fmt.Errorf("%w: reading custom profile: %w", ErrProxyTLSUnusable, err)
		}
		if !found || block == nil {
			return profileSpec{}, fmt.Errorf("%w: custom TLS profile is missing its custom block", ErrProxyTLSUnusable)
		}
		var spec profileSpec
		if err := applySpecFields(&spec, block, true); err != nil {
			return profileSpec{}, err
		}
		return spec, nil
	default:
		return profileSpec{}, fmt.Errorf("%w: unknown TLS profile type %q", ErrProxyTLSUnusable, profileType)
	}
}

func applyOptionalBlock(spec *profileSpec, profile map[string]any, key string) error {
	block, found, err := unstructured.NestedMap(profile, key)
	if err != nil {
		return fmt.Errorf("%w: reading %s profile block: %w", ErrProxyTLSUnusable, key, err)
	}
	if !found || block == nil {
		return nil
	}
	return applySpecFields(spec, block, false)
}

func applySpecFields(spec *profileSpec, block map[string]any, custom bool) error {
	minVersion, found, err := unstructured.NestedString(block, fieldMinTLSVersion)
	if err != nil {
		return fmt.Errorf("%w: reading minTLSVersion: %w", ErrProxyTLSUnusable, err)
	}
	switch {
	case found && minVersion != "":
		spec.minVersion = minVersion
	case custom:
		return fmt.Errorf("%w: custom TLS profile is missing minTLSVersion", ErrProxyTLSUnusable)
	}

	ciphers, found, err := unstructured.NestedStringSlice(block, fieldCiphers)
	if err != nil {
		return fmt.Errorf("%w: reading ciphers: %w", ErrProxyTLSUnusable, err)
	}
	if found {
		spec.ciphers = ciphers
	}

	groups, found, err := unstructured.NestedStringSlice(block, fieldGroups)
	if err != nil {
		return fmt.Errorf("%w: reading groups: %w", ErrProxyTLSUnusable, err)
	}
	if found {
		spec.groups = groups
	}
	return nil
}

func specToProxyTLS(spec profileSpec, fips bool) (ProxyTLS, error) {
	switch spec.minVersion {
	case tlsVersionName12, tlsVersionName13:
	default:
		return ProxyTLS{}, fmt.Errorf(
			"%w: minimum TLS version %q cannot be represented",
			ErrProxyTLSUnusable, spec.minVersion,
		)
	}

	out := ProxyTLS{MinVersion: spec.minVersion}
	if spec.minVersion == tlsVersionName12 {
		ciphers, err := tls12Ciphers(spec.ciphers, fips)
		if err != nil {
			return ProxyTLS{}, err
		}
		out.Ciphers = ciphers
	}
	if len(spec.groups) > 0 {
		curves, err := curvesFromGroups(spec.groups, fips)
		if err != nil {
			return ProxyTLS{}, err
		}
		out.Curves = curves
	}
	return out, nil
}

func intermediateProxyTLS(fips bool) ProxyTLS {
	ciphers := make([]string, 0, len(IntermediateCiphers))
	for _, id := range IntermediateCiphers {
		name := tls.CipherSuiteName(id)
		if fips && !fipsCipher(name) {
			continue
		}
		ciphers = append(ciphers, name)
	}
	return ProxyTLS{MinVersion: tlsVersionName12, Ciphers: ciphers}
}

func tls12Ciphers(requested []string, fips bool) ([]string, error) {
	if len(requested) == 0 {
		return nil, fmt.Errorf("%w: no usable TLS 1.2 ciphers remain", ErrProxyTLSUnusable)
	}
	seen := make(map[string]struct{}, len(requested))
	out := make([]string, 0, len(requested))
	for _, name := range requested {
		iana, ok := cipherNames[name]
		if !ok || tls13Cipher[iana] || (fips && !fipsCipher(iana)) {
			continue
		}
		if _, dup := seen[iana]; dup {
			continue
		}
		seen[iana] = struct{}{}
		out = append(out, iana)
	}
	if len(out) == 0 {
		return nil, fmt.Errorf("%w: no usable TLS 1.2 ciphers remain", ErrProxyTLSUnusable)
	}
	if !hasHTTP2Cipher(out) {
		return nil, fmt.Errorf(
			"%w: TLS 1.2 cipher list has no HTTP/2 AES_128_GCM_SHA256 suite",
			ErrProxyTLSUnusable,
		)
	}
	return out, nil
}

func curvesFromGroups(groups []string, fips bool) ([]string, error) {
	seen := make(map[string]struct{}, len(groups))
	curves := make([]string, 0, len(groups))
	for _, group := range groups {
		id, ok := groupToCurveID[group]
		if !ok || (fips && !fipsCurve(id)) {
			continue
		}
		if _, dup := seen[id]; dup {
			continue
		}
		seen[id] = struct{}{}
		curves = append(curves, id)
	}
	if len(curves) == 0 {
		return nil, fmt.Errorf("%w: no usable TLS groups remain", ErrProxyTLSUnusable)
	}
	return curves, nil
}

func hasHTTP2Cipher(names []string) bool {
	for _, name := range names {
		if name == http2CipherECDSA || name == http2CipherRSA {
			return true
		}
	}
	return false
}

func fipsCipher(name string) bool {
	switch name {
	case http2CipherECDSA, http2CipherRSA, fipsCipherECDSA256, fipsCipherRSA256:
		return true
	default:
		return false
	}
}

// fipsCurve is the NIST curves accepted by both Go FIPS policies this process
// can run under: the native FIPS 140-3 module and BoringCrypto. Both include
// P-521. X25519 and the ML-KEM hybrids stay out because BoringCrypto does not
// accept them.
func fipsCurve(id string) bool {
	return id == curveP256 || id == curveP384 || id == curveP521
}

func builtinOld() profileSpec {
	return profileSpec{
		minVersion: tlsVersionName10,
		ciphers:    slices.Clone(oldProfileCiphers()),
		groups:     slices.Clone(defaultProfileGroups),
	}
}

func builtinIntermediate() profileSpec {
	return profileSpec{
		minVersion: tlsVersionName12,
		ciphers:    slices.Clone(intermediateProfileCiphers),
		groups:     slices.Clone(defaultProfileGroups),
	}
}

func builtinModern() profileSpec {
	return profileSpec{
		minVersion: tlsVersionName13,
		ciphers:    slices.Clone(modernProfileCiphers),
		groups:     slices.Clone(defaultProfileGroups),
	}
}

// OpenShift well-known profiles (Mozilla server-side TLS 5.8). Well-known types
// store only the type on the APIServer; the cipher and group lists live here.
var defaultProfileGroups = []string{
	groupX25519MLKEM768,
	groupX25519,
	groupSecP256r1,
	groupSecP384r1,
}

var intermediateProfileCiphers = []string{
	ianaCipherTLS13AES128,
	ianaCipherTLS13AES256,
	ianaCipherTLS13ChaCha,
	openSSLCipherECDHEECDSAAES128GCMSHA256,
	openSSLCipherECDHERSAAES128GCMSHA256,
	openSSLCipherECDHEECDSAAES256GCMSHA384,
	openSSLCipherECDHERSAAES256GCMSHA384,
	openSSLCipherECDHEECDSAChaCha,
	openSSLCipherECDHERSAChaCha,
}

var modernProfileCiphers = []string{
	ianaCipherTLS13AES128,
	ianaCipherTLS13AES256,
	ianaCipherTLS13ChaCha,
}

func oldProfileCiphers() []string {
	// The Old profile starts with the Intermediate suites, then older CBC and RSA suites.
	// Those extra names are not representable as kube-rbac-proxy TLS 1.2 ciphers and are dropped.
	extra := []string{
		"ECDHE-ECDSA-AES128-SHA256",
		"ECDHE-RSA-AES128-SHA256",
		"ECDHE-ECDSA-AES128-SHA",
		"ECDHE-RSA-AES128-SHA",
		"ECDHE-ECDSA-AES256-SHA384",
		"ECDHE-RSA-AES256-SHA384",
		"ECDHE-ECDSA-AES256-SHA",
		"ECDHE-RSA-AES256-SHA",
		"AES128-GCM-SHA256",
		"AES256-GCM-SHA384",
		"AES128-SHA256",
		"AES256-SHA256",
		"AES128-SHA",
		"AES256-SHA",
		"DES-CBC3-SHA",
	}
	return append(slices.Clone(intermediateProfileCiphers), extra...)
}

// groupToCurveID maps OpenShift group names to the numeric CurveIDs accepted by
// kube-rbac-proxy --tls-curve-preferences.
var groupToCurveID = map[string]string{
	groupSecP256r1:      curveP256,
	groupSecP384r1:      curveP384,
	groupSecP521r1:      curveP521,
	groupX25519:         curveX25519,
	groupX25519MLKEM768: curveX25519MLKEM768,
}

// openSSLToIANA maps the OpenSSL names used by OpenShift profiles to IANA names.
var openSSLToIANA = map[string]string{
	openSSLCipherECDHEECDSAAES128GCMSHA256: http2CipherECDSA,
	openSSLCipherECDHERSAAES128GCMSHA256:   http2CipherRSA,
	openSSLCipherECDHEECDSAAES256GCMSHA384: fipsCipherECDSA256,
	openSSLCipherECDHERSAAES256GCMSHA384:   fipsCipherRSA256,
	openSSLCipherECDHEECDSAChaCha:          ianaCipherECDHEECDSAChaCha,
	openSSLCipherECDHERSAChaCha:            ianaCipherECDHERSAChaCha,
	openSSLCipherECDHEECDSAChaChaSHA256:    ianaCipherECDHEECDSAChaCha,
	openSSLCipherECDHERSAChaChaSHA256:      ianaCipherECDHERSAChaCha,
}

var (
	cipherNames = map[string]string{}
	tls13Cipher = map[string]bool{}
)

func init() {
	registerCipherSuites(tls.CipherSuites())
	for openssl, iana := range openSSLToIANA {
		if _, ok := cipherNames[iana]; ok {
			cipherNames[openssl] = iana
		}
	}
}

func registerCipherSuites(suites []*tls.CipherSuite) {
	for _, suite := range suites {
		cipherNames[suite.Name] = suite.Name
		if suite.ID >= 0x1300 && suite.ID <= 0x13ff {
			tls13Cipher[suite.Name] = true
		}
	}
}
