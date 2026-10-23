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
	"fmt"
	"time"

	apierrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/api/meta"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/rest"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

var log = ctrl.Log.WithName("tls")

// tls13CipherNames contains TLS 1.3 cipher names that Go manages automatically.
// These must not be placed in tls.Config.CipherSuites (which controls TLS 1.0–1.2 only).
var tls13CipherNames = map[string]bool{
	"TLS_AES_128_GCM_SHA256":       true,
	"TLS_AES_256_GCM_SHA384":       true,
	"TLS_CHACHA20_POLY1305_SHA256": true,
}

// openSSLToGoCipher maps OpenSSL cipher suite names to Go crypto/tls constants.
// Only TLS 1.0–1.2 ciphers are included; TLS 1.3 ciphers are managed by Go automatically.
var openSSLToGoCipher = map[string]uint16{
	"ECDHE-ECDSA-AES128-GCM-SHA256":        tls.TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256,
	"ECDHE-RSA-AES128-GCM-SHA256":          tls.TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256,
	"ECDHE-ECDSA-AES256-GCM-SHA384":        tls.TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384,
	"ECDHE-RSA-AES256-GCM-SHA384":          tls.TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384,
	"ECDHE-ECDSA-CHACHA20-POLY1305-SHA256": tls.TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305_SHA256,
	"ECDHE-RSA-CHACHA20-POLY1305-SHA256":   tls.TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305_SHA256,
	"ECDHE-ECDSA-CHACHA20-POLY1305":        tls.TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305_SHA256,
	"ECDHE-RSA-CHACHA20-POLY1305":          tls.TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305_SHA256,
	// Legacy CBC/RSA ciphers from the Old profile (those Go still supports).
	"ECDHE-ECDSA-AES128-SHA256": tls.TLS_ECDHE_ECDSA_WITH_AES_128_CBC_SHA256,
	"ECDHE-RSA-AES128-SHA256":   tls.TLS_ECDHE_RSA_WITH_AES_128_CBC_SHA256,
	"ECDHE-ECDSA-AES128-SHA":    tls.TLS_ECDHE_ECDSA_WITH_AES_128_CBC_SHA,
	"ECDHE-RSA-AES128-SHA":      tls.TLS_ECDHE_RSA_WITH_AES_128_CBC_SHA,
	"ECDHE-ECDSA-AES256-SHA":    tls.TLS_ECDHE_ECDSA_WITH_AES_256_CBC_SHA,
	"ECDHE-RSA-AES256-SHA":      tls.TLS_ECDHE_RSA_WITH_AES_256_CBC_SHA,
	"AES128-GCM-SHA256":         tls.TLS_RSA_WITH_AES_128_GCM_SHA256,
	"AES256-GCM-SHA384":         tls.TLS_RSA_WITH_AES_256_GCM_SHA384,
	"AES128-SHA256":             tls.TLS_RSA_WITH_AES_128_CBC_SHA256,
	"AES128-SHA":                tls.TLS_RSA_WITH_AES_128_CBC_SHA,
	"AES256-SHA":                tls.TLS_RSA_WITH_AES_256_CBC_SHA,
	// DES-CBC3-SHA is in the OCP Old profile but Go's crypto/tls does not
	// support it, so it is intentionally omitted (dropped at resolve time).
}

// oldCipherNames is the Mozilla Old cipher set (OpenSSL names), matching the
// pkg/tls well-known Old profile. Names Go does not support (e.g. DES-CBC3-SHA)
// are dropped by resolveCipherNames at runtime.
var oldCipherNames = []string{
	"ECDHE-ECDSA-AES128-GCM-SHA256",
	"ECDHE-RSA-AES128-GCM-SHA256",
	"ECDHE-ECDSA-AES256-GCM-SHA384",
	"ECDHE-RSA-AES256-GCM-SHA384",
	"ECDHE-ECDSA-CHACHA20-POLY1305",
	"ECDHE-RSA-CHACHA20-POLY1305",
	"ECDHE-ECDSA-AES128-SHA256",
	"ECDHE-RSA-AES128-SHA256",
	"ECDHE-ECDSA-AES128-SHA",
	"ECDHE-RSA-AES128-SHA",
	"ECDHE-ECDSA-AES256-SHA",
	"ECDHE-RSA-AES256-SHA",
	"AES128-GCM-SHA256",
	"AES256-GCM-SHA384",
	"AES128-SHA256",
	"AES128-SHA",
	"AES256-SHA",
	"DES-CBC3-SHA",
}

// IntermediateCiphers is the Mozilla Intermediate cipher suite set.
var IntermediateCiphers = []uint16{
	tls.TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256,
	tls.TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256,
	tls.TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384,
	tls.TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384,
	tls.TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305_SHA256,
	tls.TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305_SHA256,
}

var tlsVersionMap = map[string]uint16{
	"VersionTLS10": tls.VersionTLS10,
	"VersionTLS11": tls.VersionTLS11,
	"VersionTLS12": tls.VersionTLS12,
	"VersionTLS13": tls.VersionTLS13,
}

// tlsGroupMap maps OpenShift TLS group (key-exchange curve) names to Go
// tls.CurveID constants. OpenShift exposes these on Custom profiles via the
// `groups` field; the well-known profiles do not restrict groups.
var tlsGroupMap = map[string]tls.CurveID{
	// Canonical OpenShift TLSSecurityProfile group names (config/v1).
	"secp256r1":      tls.CurveP256,
	"secp384r1":      tls.CurveP384,
	"secp521r1":      tls.CurveP521,
	"X25519":         tls.X25519,
	"X25519MLKEM768": tls.X25519MLKEM768,
	// NIST aliases also accepted for robustness.
	"P-256": tls.CurveP256,
	"P-384": tls.CurveP384,
	"P-521": tls.CurveP521,
}

// Result holds the resolved TLS configuration.
type Result struct {
	TLSOpts      []func(*tls.Config)
	APIAvailable bool
	Profile      map[string]interface{}
}

// Resolve reads the cluster TLS profile from apiservers.config.openshift.io/cluster
// via unstructured client and returns TLS option functions for controller-runtime.
// On non-OpenShift clusters or when the profile cannot be read, it returns
// hardened Intermediate defaults. Returns an error only on unexpected failures
// that should prevent startup (fail-closed).
func Resolve(ctx context.Context, cfg *rest.Config) (Result, error) {
	k8sClient, err := client.New(cfg, client.Options{})
	if err != nil {
		return Result{}, fmt.Errorf("creating bootstrap client for TLS profile: %w", err)
	}

	resolveCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	return resolve(resolveCtx, k8sClient)
}

func resolve(ctx context.Context, k8sClient client.Reader) (Result, error) {
	var result Result

	apiServer := &unstructured.Unstructured{}
	apiServer.SetGroupVersionKind(schema.GroupVersionKind{
		Group: "config.openshift.io", Version: "v1", Kind: "APIServer",
	})

	if err := k8sClient.Get(ctx, client.ObjectKey{Name: "cluster"}, apiServer); err != nil {
		switch {
		case meta.IsNoMatchError(err):
			log.Info("TLS profile not available, using hardened defaults (non-OpenShift cluster)")
		case apierrors.IsNotFound(err):
			log.Info("APIServer resource not found, using hardened defaults")
		case apierrors.IsServiceUnavailable(err),
			apierrors.IsTimeout(err),
			apierrors.IsServerTimeout(err),
			apierrors.IsTooManyRequests(err),
			errors.Is(err, context.DeadlineExceeded):
			log.Info("Transient error reading APIServer TLS profile, using hardened defaults", "error", err)
			result.APIAvailable = true
			result.Profile = map[string]interface{}{"type": "Intermediate"}
		case apierrors.IsForbidden(err), apierrors.IsUnauthorized(err):
			// RBAC denies reading the profile, so the cluster TLS policy cannot
			// be guaranteed. Fail closed rather than silently serving weaker
			// defaults; grant config.openshift.io/apiservers get/list/watch to fix.
			return result, fmt.Errorf("denied reading APIServer TLS profile (check RBAC): %w", err)
		default:
			return result, fmt.Errorf("failed to read APIServer TLS profile: %w", err)
		}
		result.TLSOpts = append(result.TLSOpts, intermediateWithALPN)
		return result, nil
	}

	result.APIAvailable = true
	result.Profile, _, _ = unstructured.NestedMap(apiServer.Object, "spec", "tlsSecurityProfile")

	minVersion, ciphers, curves, err := parseProfile(apiServer)
	if err != nil {
		return result, fmt.Errorf("invalid cluster TLS profile: %w", err)
	}
	// A sub-TLS-1.3 profile must enable at least one usable cipher suite; an
	// empty or all-unsupported set must fail closed rather than leave CipherSuites
	// unset (which would fall back to Go's defaults and broaden policy).
	if minVersion < tls.VersionTLS13 && len(ciphers) == 0 {
		return result, fmt.Errorf("TLS profile with minimum version below 1.3 resolved to no usable cipher suites")
	}
	if curves != nil && len(curves) == 0 {
		return result, fmt.Errorf("custom TLS profile specified groups but none are supported by Go")
	}

	result.TLSOpts = append(result.TLSOpts, func(c *tls.Config) {
		c.MinVersion = minVersion
		if len(ciphers) > 0 {
			c.CipherSuites = ciphers
		}
		if len(curves) > 0 {
			c.CurvePreferences = curves
		}
		c.NextProtos = []string{"h2", "http/1.1"}
	})
	return result, nil
}

func intermediateWithALPN(c *tls.Config) {
	c.MinVersion = tls.VersionTLS12
	c.CipherSuites = IntermediateCiphers
	c.NextProtos = []string{"h2", "http/1.1"}
}

// parseProfile returns the resolved minimum TLS version, cipher suites, and
// key-exchange curves. Curves are nil for well-known profiles (no group
// restriction); only Custom profiles that set `groups` produce a non-nil slice.
// It fails closed: malformed specs and unknown profile types return an error
// rather than silently substituting Intermediate.
func parseProfile(apiServer *unstructured.Unstructured) (uint16, []uint16, []tls.CurveID, error) {
	spec, found, err := unstructured.NestedMap(apiServer.Object, "spec", "tlsSecurityProfile")
	if err != nil {
		return 0, nil, nil, fmt.Errorf("reading spec.tlsSecurityProfile: %w", err)
	}
	if !found || spec == nil {
		return tls.VersionTLS12, IntermediateCiphers, nil, nil
	}

	profileType, _, err := unstructured.NestedString(spec, "type")
	if err != nil {
		// A non-string discriminator is malformed; fail closed rather than
		// letting it coerce to "" and silently select Intermediate.
		return 0, nil, nil, fmt.Errorf("reading spec.tlsSecurityProfile.type: %w", err)
	}

	switch profileType {
	case "Intermediate", "":
		return tls.VersionTLS12, IntermediateCiphers, nil, nil
	case "Modern":
		return tls.VersionTLS13, nil, nil, nil
	case "Old":
		return tls.VersionTLS10, resolveCipherNames(oldCipherNames), nil, nil
	case "Custom":
		return parseCustomProfile(spec)
	default:
		return 0, nil, nil, fmt.Errorf("unknown TLS profile type %q", profileType)
	}
}

func parseCustomProfile(spec map[string]interface{}) (uint16, []uint16, []tls.CurveID, error) {
	custom, found, err := unstructured.NestedMap(spec, "custom")
	if err != nil {
		return 0, nil, nil, fmt.Errorf("reading custom TLS profile block: %w", err)
	}
	if !found || custom == nil {
		return 0, nil, nil, fmt.Errorf("custom TLS profile type specified but custom block is missing")
	}

	minTLSStr, _, _ := unstructured.NestedString(custom, "minTLSVersion")
	minVersion, ok := tlsVersionMap[minTLSStr]
	if !ok {
		return 0, nil, nil, fmt.Errorf("unknown minTLSVersion %q in custom TLS profile", minTLSStr)
	}

	ciphers, err := parseCustomCiphers(custom)
	if err != nil {
		return 0, nil, nil, err
	}
	groups, err := parseCustomGroups(custom)
	if err != nil {
		return 0, nil, nil, err
	}
	return minVersion, ciphers, groups, nil
}

func parseCustomCiphers(custom map[string]interface{}) ([]uint16, error) {
	cipherNames, found, err := unstructured.NestedStringSlice(custom, "ciphers")
	if err != nil {
		return nil, fmt.Errorf("reading ciphers from custom TLS profile: %w", err)
	}
	if !found || len(cipherNames) == 0 {
		return nil, nil
	}
	return resolveCipherNames(cipherNames), nil
}

// goNegotiableCiphers is the set of TLS ≤1.2 cipher suite IDs the running Go
// runtime can actually negotiate (secure + insecure-but-available). A mapped
// constant a future Go release removes from both is treated as unusable.
var goNegotiableCiphers = func() map[uint16]bool {
	m := make(map[uint16]bool)
	for _, c := range tls.CipherSuites() {
		m[c.ID] = true
	}
	for _, c := range tls.InsecureCipherSuites() {
		m[c.ID] = true
	}
	return m
}()

// resolveCipherNames maps OpenSSL/IANA cipher names to Go cipher suite IDs,
// skipping TLS 1.3 names (managed by Go), deduplicating, and dropping any name
// Go does not support or the running runtime cannot negotiate.
func resolveCipherNames(names []string) []uint16 {
	ciphers := make([]uint16, 0, len(names))
	seen := make(map[uint16]bool)
	for _, name := range names {
		if tls13CipherNames[name] {
			continue
		}
		id, ok := openSSLToGoCipher[name]
		if !ok {
			log.Info("Dropping unsupported cipher from TLS profile", "cipher", name)
			continue
		}
		if !goNegotiableCiphers[id] {
			log.Info("Dropping cipher the running Go runtime cannot negotiate", "cipher", name)
			continue
		}
		if seen[id] {
			continue
		}
		seen[id] = true
		ciphers = append(ciphers, id)
	}
	return ciphers
}

func parseCustomGroups(custom map[string]interface{}) ([]tls.CurveID, error) {
	groupNames, found, err := unstructured.NestedStringSlice(custom, "groups")
	if err != nil {
		return nil, fmt.Errorf("reading groups from custom TLS profile: %w", err)
	}
	if !found || len(groupNames) == 0 {
		return nil, nil
	}

	seen := make(map[tls.CurveID]bool)
	curves := make([]tls.CurveID, 0, len(groupNames))
	for _, name := range groupNames {
		id, ok := tlsGroupMap[name]
		if !ok {
			log.Info("Dropping unsupported group from custom TLS profile", "group", name)
			continue
		}
		if seen[id] {
			continue
		}
		seen[id] = true
		curves = append(curves, id)
	}
	return curves, nil
}
