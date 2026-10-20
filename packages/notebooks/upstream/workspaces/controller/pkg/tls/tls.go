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

const (
	apiServerName = "cluster"

	fieldSpec               = "spec"
	fieldTLSSecurityProfile = "tlsSecurityProfile"
	fieldType               = "type"
	fieldCustom             = "custom"
	fieldMinTLSVersion      = "minTLSVersion"
	fieldCiphers            = "ciphers"
	fieldGroups             = "groups"

	profileTypeIntermediate = "Intermediate"
	profileTypeModern       = "Modern"
	profileTypeOld          = "Old"
	profileTypeCustom       = "Custom"

	tlsVersionName10 = "VersionTLS10"
	tlsVersionName11 = "VersionTLS11"
	tlsVersionName12 = "VersionTLS12"
	tlsVersionName13 = "VersionTLS13"

	openSSLCipherECDHEECDSAAES128GCMSHA256 = "ECDHE-ECDSA-AES128-GCM-SHA256"
)

var apiServerGVK = schema.GroupVersionKind{
	Group: "config.openshift.io", Version: "v1", Kind: "APIServer",
}

// openSSLToGoCipher maps OpenSSL cipher suite names to Go crypto/tls constants.
var openSSLToGoCipher = map[string]uint16{
	"TLS_AES_128_GCM_SHA256":               tls.TLS_AES_128_GCM_SHA256,
	"TLS_AES_256_GCM_SHA384":               tls.TLS_AES_256_GCM_SHA384,
	"TLS_CHACHA20_POLY1305_SHA256":         tls.TLS_CHACHA20_POLY1305_SHA256,
	openSSLCipherECDHEECDSAAES128GCMSHA256: tls.TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256,
	"ECDHE-RSA-AES128-GCM-SHA256":          tls.TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256,
	"ECDHE-ECDSA-AES256-GCM-SHA384":        tls.TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384,
	"ECDHE-RSA-AES256-GCM-SHA384":          tls.TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384,
	"ECDHE-ECDSA-CHACHA20-POLY1305-SHA256": tls.TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305_SHA256,
	"ECDHE-RSA-CHACHA20-POLY1305-SHA256":   tls.TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305_SHA256,
	"ECDHE-ECDSA-CHACHA20-POLY1305":        tls.TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305_SHA256,
	"ECDHE-RSA-CHACHA20-POLY1305":          tls.TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305_SHA256,
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
	tlsVersionName10: tls.VersionTLS10,
	tlsVersionName11: tls.VersionTLS11,
	tlsVersionName12: tls.VersionTLS12,
	tlsVersionName13: tls.VersionTLS13,
}

// Result holds the resolved TLS configuration.
type Result struct {
	TLSOpts      []func(*tls.Config)
	APIAvailable bool
	Profile      map[string]any
	// Degraded is true when the profile could not be authoritatively resolved
	// and Intermediate defaults were substituted because of a problem (denied or
	// transient read, or a malformed/unknown profile) rather than a genuine
	// Intermediate/absent profile. Consumers that must fail closed (e.g. the
	// backend HTTPS listener, which holds the required RBAC) should treat a
	// degraded result as an error. The controller intentionally ignores it and
	// serves fail-open defaults, self-healing via the watcher.
	Degraded bool
}

// tlsGroupMap maps OpenShift TLS group (key-exchange curve) names to Go
// tls.CurveID constants. OpenShift exposes these on Custom profiles via the
// `groups` field; the well-known profiles do not restrict groups.
var tlsGroupMap = map[string]tls.CurveID{
	"X25519":         tls.X25519,
	"P-256":          tls.CurveP256,
	"P-384":          tls.CurveP384,
	"X25519MLKEM768": tls.X25519MLKEM768,
}

// goNegotiableCiphers is the set of TLS ≤1.2 cipher suite IDs the running Go
// runtime can actually negotiate (secure + insecure-but-available), so a mapped
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
	apiServer.SetGroupVersionKind(apiServerGVK)

	if err := k8sClient.Get(ctx, client.ObjectKey{Name: apiServerName}, apiServer); err != nil {
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
			result.Degraded = true
			result.Profile = intermediateProfileMap()
		case apierrors.IsForbidden(err), apierrors.IsUnauthorized(err):
			log.Info("Forbidden/Unauthorized reading APIServer TLS profile, registering watcher for self-heal", "error", err)
			result.APIAvailable = true
			result.Degraded = true
			result.Profile = intermediateProfileMap()
		default:
			return result, fmt.Errorf("failed to read APIServer TLS profile: %w", err)
		}
		result.TLSOpts = append(result.TLSOpts, intermediateWithALPN)
		return result, nil
	}

	result.APIAvailable = true
	profile, _, _ := unstructured.NestedMap(apiServer.Object, fieldSpec, fieldTLSSecurityProfile)
	result.Profile = normalizeProfileMap(profile)

	minVersion, ciphers, curves, degraded := parseProfile(apiServer)
	result.Degraded = degraded
	// A Custom profile that enumerated ciphers must leave at least one usable one.
	if ciphers != nil && len(ciphers) == 0 {
		return result, fmt.Errorf("custom TLS profile specified ciphers but none are supported by Go")
	}
	// A Custom profile that restricts groups must leave at least one usable curve.
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
// key-exchange curves, plus a degraded flag. degraded is true when the profile
// was malformed or unknown and Intermediate was substituted — consumers that
// must fail closed check Result.Degraded; the controller ignores it and serves
// the fail-open defaults.
func parseProfile(apiServer *unstructured.Unstructured) (uint16, []uint16, []tls.CurveID, bool) {
	spec, found, err := unstructured.NestedMap(apiServer.Object, fieldSpec, fieldTLSSecurityProfile)
	if err != nil {
		log.Error(err, "Failed to read spec.tlsSecurityProfile from APIServer")
		return tls.VersionTLS12, IntermediateCiphers, nil, true
	}
	if !found || spec == nil {
		return tls.VersionTLS12, IntermediateCiphers, nil, false
	}

	profileType, _, err := unstructured.NestedString(spec, fieldType)
	if err != nil {
		log.Error(err, "Failed to read spec.tlsSecurityProfile.type from APIServer")
		return tls.VersionTLS12, IntermediateCiphers, nil, true
	}

	switch profileType {
	case profileTypeIntermediate, "":
		return tls.VersionTLS12, IntermediateCiphers, nil, false
	case profileTypeModern:
		return tls.VersionTLS13, nil, nil, false
	case profileTypeOld:
		return tls.VersionTLS10, nil, nil, false
	case profileTypeCustom:
		return parseCustomProfile(spec)
	default:
		log.Info("Unknown TLS profile type, falling back to Intermediate (degraded)", fieldType, profileType)
		return tls.VersionTLS12, IntermediateCiphers, nil, true
	}
}

func parseCustomProfile(spec map[string]any) (uint16, []uint16, []tls.CurveID, bool) {
	custom, found, err := unstructured.NestedMap(spec, fieldCustom)
	if err != nil {
		log.Error(err, "Failed to read custom TLS profile block")
		return tls.VersionTLS12, IntermediateCiphers, nil, true
	}
	if !found || custom == nil {
		log.Info("Custom TLS profile type specified but custom block is nil, falling back to Intermediate (degraded)")
		return tls.VersionTLS12, IntermediateCiphers, nil, true
	}

	minTLSStr, _, _ := unstructured.NestedString(custom, fieldMinTLSVersion)
	minVersion, ok := tlsVersionMap[minTLSStr]
	if !ok {
		log.Info("Unknown minTLSVersion in custom profile, falling back to Intermediate (degraded)", fieldMinTLSVersion, minTLSStr)
		return tls.VersionTLS12, IntermediateCiphers, nil, true
	}

	curves := parseCustomGroups(custom)

	cipherNames, found, err := unstructured.NestedStringSlice(custom, fieldCiphers)
	if err != nil {
		log.Error(err, "Failed to read ciphers from custom TLS profile")
		return minVersion, nil, curves, true
	}
	if !found || len(cipherNames) == 0 {
		// A Custom profile without ciphers is malformed (OpenShift requires them);
		// mark degraded so fail-closed consumers reject it.
		log.Info("Custom TLS profile has no ciphers, falling back to Intermediate (degraded)")
		return minVersion, IntermediateCiphers, curves, true
	}

	return minVersion, resolveCipherNames(cipherNames), curves, false
}

// resolveCipherNames maps OpenSSL/IANA cipher names to Go cipher suite IDs,
// dropping any name Go does not support or the running runtime cannot negotiate.
func resolveCipherNames(names []string) []uint16 {
	ciphers := make([]uint16, 0, len(names))
	for _, name := range names {
		id, ok := openSSLToGoCipher[name]
		if !ok {
			log.Info("Dropping unsupported cipher from custom TLS profile", "cipher", name)
			continue
		}
		if !goNegotiableCiphers[id] {
			log.Info("Dropping cipher the running Go runtime cannot negotiate", "cipher", name)
			continue
		}
		ciphers = append(ciphers, id)
	}
	return ciphers
}

// parseCustomGroups maps a Custom profile's `groups` to Go curve IDs. A nil
// return means no restriction; a non-nil empty slice means every requested group
// was unusable (the caller fails closed).
func parseCustomGroups(custom map[string]any) []tls.CurveID {
	groupNames, found, err := unstructured.NestedStringSlice(custom, fieldGroups)
	if err != nil {
		log.Error(err, "Failed to read groups from custom TLS profile")
		return nil
	}
	if !found || len(groupNames) == 0 {
		return nil
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
	return curves
}

func intermediateProfileMap() map[string]any {
	return map[string]any{fieldType: profileTypeIntermediate}
}
