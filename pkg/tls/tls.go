// Package tls provides TLS configuration derived from the OpenShift cluster-wide
// TLS security profile (apiservers.config.openshift.io/cluster). On non-OpenShift
// clusters it falls back to Mozilla Intermediate defaults.
//
// This package uses k8s.io/client-go directly (no controller-runtime or
// openshift/api dependency) so it can be used by plain HTTP servers such as
// BFF services without pulling in heavy transitive dependencies.
package tls

import (
	"context"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"log/slog"

	"k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/api/meta"
	"k8s.io/client-go/rest"
)

// intermediateMinVersion is TLS 1.2 per Mozilla Intermediate profile.
const intermediateMinVersion = tls.VersionTLS12

// intermediateCiphers is the Mozilla Intermediate cipher set, used as fallback
// when the cluster TLS profile is unavailable.
var intermediateCiphers = []uint16{
	tls.TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256,
	tls.TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256,
	tls.TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384,
	tls.TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384,
	tls.TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305_SHA256,
	tls.TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305_SHA256,
}

// nextProtos is the ALPN protocol list always set on the TLS config.
var nextProtos = []string{"h2", "http/1.1"}

// openSSLToGo maps OpenSSL cipher suite names (as used by OpenShift TLS profiles)
// to Go crypto/tls cipher suite IDs.
var openSSLToGo = map[string]uint16{
	// TLS 1.2 ciphers (OpenSSL names)
	"ECDHE-ECDSA-AES128-GCM-SHA256":       tls.TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256,
	"ECDHE-RSA-AES128-GCM-SHA256":         tls.TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256,
	"ECDHE-ECDSA-AES256-GCM-SHA384":       tls.TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384,
	"ECDHE-RSA-AES256-GCM-SHA384":         tls.TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384,
	"ECDHE-ECDSA-CHACHA20-POLY1305":       tls.TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305_SHA256,
	"ECDHE-RSA-CHACHA20-POLY1305":         tls.TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305_SHA256,
	"ECDHE-ECDSA-AES128-SHA256":           tls.TLS_ECDHE_ECDSA_WITH_AES_128_CBC_SHA256,
	"ECDHE-RSA-AES128-SHA256":             tls.TLS_ECDHE_RSA_WITH_AES_128_CBC_SHA256,
	"ECDHE-ECDSA-AES128-SHA":              tls.TLS_ECDHE_ECDSA_WITH_AES_128_CBC_SHA,
	"ECDHE-RSA-AES128-SHA":                tls.TLS_ECDHE_RSA_WITH_AES_128_CBC_SHA,
	"AES128-GCM-SHA256":                   tls.TLS_RSA_WITH_AES_128_GCM_SHA256,
	"AES256-GCM-SHA384":                   tls.TLS_RSA_WITH_AES_256_GCM_SHA384,
	"AES128-SHA256":                       tls.TLS_RSA_WITH_AES_128_CBC_SHA256,
	"AES128-SHA":                          tls.TLS_RSA_WITH_AES_128_CBC_SHA,
	"AES256-SHA":                          tls.TLS_RSA_WITH_AES_256_CBC_SHA,
	// IANA names (some profiles use these)
	"TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256":       tls.TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256,
	"TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256":         tls.TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256,
	"TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384":       tls.TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384,
	"TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384":         tls.TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384,
	"TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305_SHA256":  tls.TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305_SHA256,
	"TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305_SHA256":    tls.TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305_SHA256,
	"TLS_ECDHE_ECDSA_WITH_AES_128_CBC_SHA256":        tls.TLS_ECDHE_ECDSA_WITH_AES_128_CBC_SHA256,
	"TLS_ECDHE_RSA_WITH_AES_128_CBC_SHA256":          tls.TLS_ECDHE_RSA_WITH_AES_128_CBC_SHA256,
	"TLS_ECDHE_ECDSA_WITH_AES_128_CBC_SHA":           tls.TLS_ECDHE_ECDSA_WITH_AES_128_CBC_SHA,
	"TLS_ECDHE_RSA_WITH_AES_128_CBC_SHA":             tls.TLS_ECDHE_RSA_WITH_AES_128_CBC_SHA,
	"TLS_RSA_WITH_AES_128_GCM_SHA256":                tls.TLS_RSA_WITH_AES_128_GCM_SHA256,
	"TLS_RSA_WITH_AES_256_GCM_SHA384":                tls.TLS_RSA_WITH_AES_256_GCM_SHA384,
	"TLS_RSA_WITH_AES_128_CBC_SHA256":                tls.TLS_RSA_WITH_AES_128_CBC_SHA256,
	"TLS_RSA_WITH_AES_128_CBC_SHA":                   tls.TLS_RSA_WITH_AES_128_CBC_SHA,
	"TLS_RSA_WITH_AES_256_CBC_SHA":                   tls.TLS_RSA_WITH_AES_256_CBC_SHA,
}

// tlsVersionMap maps OpenShift TLS version strings to Go tls version constants.
var tlsVersionMap = map[string]uint16{
	"VersionTLS10": tls.VersionTLS10,
	"VersionTLS11": tls.VersionTLS11,
	"VersionTLS12": tls.VersionTLS12,
	"VersionTLS13": tls.VersionTLS13,
}

// tlsProfileSpec mirrors the relevant fields from configv1.TLSProfileSpec
// without importing openshift/api (avoids transitive dep conflicts).
type tlsProfileSpec struct {
	Ciphers       []string `json:"ciphers"`
	MinTLSVersion string   `json:"minTLSVersion"`
}

// tlsSecurityProfile mirrors the relevant fields from configv1.TLSSecurityProfile.
type tlsSecurityProfile struct {
	Type   string `json:"type"`
	Custom *struct {
		tlsProfileSpec
	} `json:"custom,omitempty"`
}

// apiServerSpec mirrors the relevant fields from configv1.APIServerSpec.
type apiServerSpec struct {
	TLSSecurityProfile *tlsSecurityProfile `json:"tlsSecurityProfile,omitempty"`
}

// apiServerResource mirrors the relevant fields from configv1.APIServer.
type apiServerResource struct {
	Spec apiServerSpec `json:"spec"`
}

// wellKnownProfiles replicates the TLS profiles from openshift/api config/v1
// (github.com/openshift/api v0.0.0-20260317165824) to avoid importing openshift/api
// which has k8s version conflicts with the BFF Go modules.
var wellKnownProfiles = map[string]tlsProfileSpec{
	"Intermediate": {
		Ciphers: []string{
			"TLS_AES_128_GCM_SHA256",
			"TLS_AES_256_GCM_SHA384",
			"TLS_CHACHA20_POLY1305_SHA256",
			"ECDHE-ECDSA-AES128-GCM-SHA256",
			"ECDHE-RSA-AES128-GCM-SHA256",
			"ECDHE-ECDSA-AES256-GCM-SHA384",
			"ECDHE-RSA-AES256-GCM-SHA384",
			"ECDHE-ECDSA-CHACHA20-POLY1305",
			"ECDHE-RSA-CHACHA20-POLY1305",
		},
		MinTLSVersion: "VersionTLS12",
	},
	"Modern": {
		Ciphers: []string{
			"TLS_AES_128_GCM_SHA256",
			"TLS_AES_256_GCM_SHA384",
			"TLS_CHACHA20_POLY1305_SHA256",
		},
		MinTLSVersion: "VersionTLS13",
	},
	"Old": {
		Ciphers: []string{
			"TLS_AES_128_GCM_SHA256",
			"TLS_AES_256_GCM_SHA384",
			"TLS_CHACHA20_POLY1305_SHA256",
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
			// DES-CBC3-SHA is in the OCP Old profile but Go's crypto/tls
			// does not support it. Dropped by resolveCiphers at runtime.
			"DES-CBC3-SHA",
		},
		MinTLSVersion: "VersionTLS10",
	},
}

// ServerTLSConfig reads the cluster-wide TLS security profile from the
// OpenShift APIServer resource and returns a *tls.Config suitable for
// http.Server.TLSConfig.
//
// On non-OpenShift clusters (IsNoMatchError) or when the APIServer singleton
// does not exist (IsNotFound), it returns Intermediate defaults
// (TLS 1.2, 6 ECDHE ciphers, ALPN h2+http/1.1).
//
// On any other error (client creation failure, permission denied, etc.) it
// returns the error so the caller can exit. This is the fail-closed behavior.
func ServerTLSConfig(ctx context.Context, logger *slog.Logger) (*tls.Config, error) {
	cfg, err := rest.InClusterConfig()
	if err != nil {
		// Not running in a cluster (e.g. local development).
		// Return Intermediate defaults.
		logger.Info("not running in-cluster, using Intermediate TLS defaults")
		return intermediateDefaults(), nil
	}

	return serverTLSConfigFromREST(ctx, cfg, logger)
}

// serverTLSConfigFromREST is the internal implementation that accepts a REST config,
// making it testable.
func serverTLSConfigFromREST(ctx context.Context, restCfg *rest.Config, logger *slog.Logger) (*tls.Config, error) {
	// Use a copy to avoid mutating the caller's config.
	cfg := rest.CopyConfig(restCfg)
	cfg.APIPath = "/apis"
	cfg.ContentConfig.ContentType = "application/json"

	restClient, err := rest.UnversionedRESTClientFor(cfg)
	if err != nil {
		return nil, fmt.Errorf("failed to create REST client for APIServer: %w", err)
	}

	raw, err := restClient.Get().
		AbsPath("/apis/config.openshift.io/v1/apiservers/cluster").
		Do(ctx).
		Raw()

	if err != nil {
		if meta.IsNoMatchError(err) || errors.IsNotFound(err) {
			logger.Info("TLS profile API not available, using Intermediate TLS defaults",
				"reason", reasonForError(err))
			return intermediateDefaults(), nil
		}
		return nil, fmt.Errorf("failed to get APIServer 'cluster': %w", err)
	}

	var apiServer apiServerResource
	if err := json.Unmarshal(raw, &apiServer); err != nil {
		return nil, fmt.Errorf("failed to parse APIServer response: %w", err)
	}

	return tlsConfigFromProfile(apiServer.Spec.TLSSecurityProfile, logger)
}

// tlsConfigFromProfile builds a *tls.Config from a TLS security profile.
func tlsConfigFromProfile(profile *tlsSecurityProfile, logger *slog.Logger) (*tls.Config, error) {
	spec, err := resolveProfileSpec(profile)
	if err != nil {
		return nil, fmt.Errorf("failed to resolve TLS profile: %w", err)
	}

	// Log when an unknown profile type falls back to Intermediate defaults.
	if profile != nil && profile.Type != "" {
		if _, known := wellKnownProfiles[profile.Type]; !known && profile.Type != "Custom" {
			logger.Warn("unknown TLS profile type, falling back to Intermediate defaults",
				"requestedType", profile.Type)
		}
	}

	minVersion, ok := tlsVersionMap[spec.MinTLSVersion]
	if !ok {
		return nil, fmt.Errorf("unsupported TLS version %q in cluster profile", spec.MinTLSVersion)
	}

	tlsCfg := &tls.Config{
		MinVersion: minVersion,
		NextProtos: nextProtos,
	}

	// TLS 1.3 cipher suites are not configurable in Go (all TLS 1.3 ciphers are always enabled).
	// Only set CipherSuites for TLS 1.2 and below.
	if minVersion < tls.VersionTLS13 {
		ciphers, dropped := resolveCiphers(spec.Ciphers)
		if len(dropped) > 0 {
			logger.Info("some ciphers from cluster TLS profile are not supported by Go, dropped",
				"dropped", dropped)
		}
		if len(spec.Ciphers) > 0 && len(ciphers) == 0 {
			return nil, fmt.Errorf("custom TLS profile specified %d ciphers but none are supported by Go", len(spec.Ciphers))
		}
		tlsCfg.CipherSuites = ciphers
	}

	logger.Info("TLS config derived from cluster profile",
		"minVersion", spec.MinTLSVersion,
		"cipherCount", len(tlsCfg.CipherSuites))

	return tlsCfg, nil
}

// resolveProfileSpec converts a TLS security profile to a concrete spec.
// If profile is nil or has no type, Intermediate defaults are returned.
func resolveProfileSpec(profile *tlsSecurityProfile) (tlsProfileSpec, error) {
	defaultProfile := wellKnownProfiles["Intermediate"]

	if profile == nil || profile.Type == "" {
		return defaultProfile, nil
	}

	if profile.Type == "Custom" {
		if profile.Custom == nil {
			return tlsProfileSpec{}, fmt.Errorf("custom TLS profile specified but Custom field is nil")
		}
		return profile.Custom.tlsProfileSpec, nil
	}

	if spec, ok := wellKnownProfiles[profile.Type]; ok {
		return spec, nil
	}

	// Unknown profile type: return Intermediate as safe default.
	return defaultProfile, nil
}

// resolveCiphers converts cipher name strings (OpenSSL or IANA format) to Go cipher suite IDs.
// Returns the resolved IDs and a list of names that could not be mapped.
func resolveCiphers(names []string) ([]uint16, []string) {
	var codes []uint16
	var dropped []string
	seen := make(map[uint16]bool)

	for _, name := range names {
		code, ok := openSSLToGo[name]
		if !ok {
			dropped = append(dropped, name)
			continue
		}
		if seen[code] {
			continue // deduplicate (e.g. same cipher under OpenSSL and IANA names)
		}
		seen[code] = true
		codes = append(codes, code)
	}

	return codes, dropped
}

// intermediateDefaults returns a *tls.Config with Mozilla Intermediate settings.
func intermediateDefaults() *tls.Config {
	return &tls.Config{
		MinVersion:   intermediateMinVersion,
		CipherSuites: intermediateCiphers,
		NextProtos:   nextProtos,
	}
}

// reasonForError returns a human-readable reason for the error.
func reasonForError(err error) string {
	if meta.IsNoMatchError(err) {
		return "API group config.openshift.io not registered (non-OpenShift cluster)"
	}
	if errors.IsNotFound(err) {
		return "APIServer 'cluster' resource not found"
	}
	if statusErr, ok := err.(*errors.StatusError); ok {
		return string(statusErr.ErrStatus.Reason)
	}
	return err.Error()
}
