package tls

import (
	"crypto/tls"
	"log/slog"
	"os"
	"testing"
)

func testLogger() *slog.Logger {
	return slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelDebug}))
}

func TestIntermediateDefaults(t *testing.T) {
	cfg := intermediateDefaults()
	if cfg.MinVersion != tls.VersionTLS12 {
		t.Errorf("expected MinVersion TLS 1.2, got %d", cfg.MinVersion)
	}
	if len(cfg.CipherSuites) != 6 {
		t.Errorf("expected 6 cipher suites, got %d", len(cfg.CipherSuites))
	}
	if len(cfg.NextProtos) != 2 || cfg.NextProtos[0] != "h2" || cfg.NextProtos[1] != "http/1.1" {
		t.Errorf("expected NextProtos [h2, http/1.1], got %v", cfg.NextProtos)
	}
}

func TestIntermediateCiphersAreValid(t *testing.T) {
	for _, id := range intermediateCiphers {
		name := tls.CipherSuiteName(id)
		if name == "" {
			t.Errorf("unknown cipher suite ID %d", id)
		}
	}
}

func TestResolveProfileSpecNil(t *testing.T) {
	spec, err := resolveProfileSpec(nil)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	expected := wellKnownProfiles["Intermediate"]
	if spec.MinTLSVersion != expected.MinTLSVersion {
		t.Errorf("expected Intermediate MinTLSVersion %s, got %s", expected.MinTLSVersion, spec.MinTLSVersion)
	}
}

func TestResolveProfileSpecIntermediate(t *testing.T) {
	profile := &tlsSecurityProfile{Type: "Intermediate"}
	spec, err := resolveProfileSpec(profile)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if spec.MinTLSVersion != "VersionTLS12" {
		t.Errorf("expected VersionTLS12, got %s", spec.MinTLSVersion)
	}
}

func TestResolveProfileSpecModern(t *testing.T) {
	profile := &tlsSecurityProfile{Type: "Modern"}
	spec, err := resolveProfileSpec(profile)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if spec.MinTLSVersion != "VersionTLS13" {
		t.Errorf("expected VersionTLS13, got %s", spec.MinTLSVersion)
	}
}

func TestResolveProfileSpecOld(t *testing.T) {
	profile := &tlsSecurityProfile{Type: "Old"}
	spec, err := resolveProfileSpec(profile)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if spec.MinTLSVersion != "VersionTLS10" {
		t.Errorf("expected VersionTLS10, got %s", spec.MinTLSVersion)
	}
}

func TestResolveProfileSpecCustomNil(t *testing.T) {
	profile := &tlsSecurityProfile{Type: "Custom"}
	_, err := resolveProfileSpec(profile)
	if err == nil {
		t.Fatal("expected error for custom profile with nil Custom field")
	}
}

func TestResolveProfileSpecCustom(t *testing.T) {
	profile := &tlsSecurityProfile{
		Type: "Custom",
		Custom: &struct {
			tlsProfileSpec
		}{
			tlsProfileSpec: tlsProfileSpec{
				MinTLSVersion: "VersionTLS13",
				Ciphers:       []string{},
			},
		},
	}
	spec, err := resolveProfileSpec(profile)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if spec.MinTLSVersion != "VersionTLS13" {
		t.Errorf("expected VersionTLS13, got %s", spec.MinTLSVersion)
	}
}

func TestResolveProfileSpecUnknownType(t *testing.T) {
	profile := &tlsSecurityProfile{Type: "FutureType"}
	spec, err := resolveProfileSpec(profile)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	// Should fall back to Intermediate
	if spec.MinTLSVersion != "VersionTLS12" {
		t.Errorf("expected VersionTLS12 (Intermediate fallback), got %s", spec.MinTLSVersion)
	}
}

func TestResolveCiphers(t *testing.T) {
	names := []string{
		"ECDHE-ECDSA-AES128-GCM-SHA256",
		"ECDHE-RSA-AES128-GCM-SHA256",
		"UNKNOWN-CIPHER",
	}
	codes, dropped := resolveCiphers(names)
	if len(codes) != 2 {
		t.Errorf("expected 2 codes, got %d", len(codes))
	}
	if len(dropped) != 1 || dropped[0] != "UNKNOWN-CIPHER" {
		t.Errorf("expected [UNKNOWN-CIPHER] dropped, got %v", dropped)
	}
}

func TestResolveCiphersDHEDropped(t *testing.T) {
	// DHE ciphers are not supported by Go and should be dropped, not remapped.
	names := []string{
		"ECDHE-RSA-AES128-GCM-SHA256",
		"DHE-RSA-AES128-GCM-SHA256",
		"DHE-RSA-AES256-GCM-SHA384",
	}
	codes, dropped := resolveCiphers(names)
	if len(codes) != 1 {
		t.Errorf("expected 1 resolved code, got %d", len(codes))
	}
	if len(dropped) != 2 {
		t.Errorf("expected 2 dropped DHE ciphers, got %v", dropped)
	}
	for _, d := range dropped {
		if d != "DHE-RSA-AES128-GCM-SHA256" && d != "DHE-RSA-AES256-GCM-SHA384" {
			t.Errorf("unexpected dropped cipher: %s", d)
		}
	}
}

func TestResolveCiphersDeduplicate(t *testing.T) {
	// Same cipher listed under both OpenSSL and IANA names should be deduplicated.
	names := []string{
		"ECDHE-RSA-AES128-GCM-SHA256",
		"TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256",
	}
	codes, dropped := resolveCiphers(names)
	if len(codes) != 1 {
		t.Errorf("expected 1 deduplicated code, got %d", len(codes))
	}
	if len(dropped) != 0 {
		t.Errorf("expected no dropped ciphers, got %v", dropped)
	}
}

func TestResolveCiphersIANA(t *testing.T) {
	names := []string{
		"TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256",
		"TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384",
	}
	codes, dropped := resolveCiphers(names)
	if len(codes) != 2 {
		t.Errorf("expected 2 codes, got %d", len(codes))
	}
	if len(dropped) != 0 {
		t.Errorf("expected no dropped, got %v", dropped)
	}
	if codes[0] != tls.TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256 {
		t.Errorf("wrong first cipher code: %d", codes[0])
	}
}

func TestTLSConfigFromNilProfile(t *testing.T) {
	cfg, err := tlsConfigFromProfile(nil, testLogger())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	// Nil profile = Intermediate defaults
	if cfg.MinVersion != tls.VersionTLS12 {
		t.Errorf("expected TLS 1.2, got %d", cfg.MinVersion)
	}
	if len(cfg.NextProtos) != 2 {
		t.Errorf("expected 2 NextProtos, got %d", len(cfg.NextProtos))
	}
}

func TestTLSConfigFromModernProfile(t *testing.T) {
	profile := &tlsSecurityProfile{Type: "Modern"}
	cfg, err := tlsConfigFromProfile(profile, testLogger())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	// Modern = TLS 1.3
	if cfg.MinVersion != tls.VersionTLS13 {
		t.Errorf("expected TLS 1.3, got %d", cfg.MinVersion)
	}
	// TLS 1.3: CipherSuites should not be set (Go manages them)
	if cfg.CipherSuites != nil {
		t.Errorf("expected nil CipherSuites for TLS 1.3, got %v", cfg.CipherSuites)
	}
	if len(cfg.NextProtos) != 2 {
		t.Errorf("expected 2 NextProtos, got %d", len(cfg.NextProtos))
	}
}

func TestTLSConfigFromIntermediateProfile(t *testing.T) {
	profile := &tlsSecurityProfile{Type: "Intermediate"}
	cfg, err := tlsConfigFromProfile(profile, testLogger())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if cfg.MinVersion != tls.VersionTLS12 {
		t.Errorf("expected TLS 1.2, got %d", cfg.MinVersion)
	}
	// Should have ciphers set (the ones that are mappable)
	if len(cfg.CipherSuites) == 0 {
		t.Error("expected non-empty CipherSuites for Intermediate profile")
	}
	if len(cfg.NextProtos) != 2 {
		t.Errorf("expected 2 NextProtos, got %d", len(cfg.NextProtos))
	}
}

func TestTLSConfigFromCustomAllUnsupportedCiphers(t *testing.T) {
	// A custom profile where every cipher is unmapped should return an error.
	profile := &tlsSecurityProfile{
		Type: "Custom",
		Custom: &struct {
			tlsProfileSpec
		}{
			tlsProfileSpec: tlsProfileSpec{
				MinTLSVersion: "VersionTLS12",
				Ciphers:       []string{"BOGUS-CIPHER-1", "BOGUS-CIPHER-2"},
			},
		},
	}
	_, err := tlsConfigFromProfile(profile, testLogger())
	if err == nil {
		t.Fatal("expected error when all custom ciphers are unsupported")
	}
}

func TestTLSConfigFromOldProfile(t *testing.T) {
	profile := &tlsSecurityProfile{Type: "Old"}
	cfg, err := tlsConfigFromProfile(profile, testLogger())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if cfg.MinVersion != tls.VersionTLS10 {
		t.Errorf("expected TLS 1.0, got %d", cfg.MinVersion)
	}
	// Old profile has many ciphers; verify the CBC/SHA ciphers from the Old profile resolve.
	// The Old profile lists 20 ciphers; DHE and TLS 1.3 ciphers get dropped, the rest should resolve.
	if len(cfg.CipherSuites) < 10 {
		t.Errorf("expected at least 10 resolved cipher suites for Old profile, got %d", len(cfg.CipherSuites))
	}
}

func TestResolveCiphersOldProfileCBCCiphers(t *testing.T) {
	// Verify the CBC ciphers from the Old profile all resolve.
	cbcCiphers := []string{
		"ECDHE-ECDSA-AES128-SHA256",
		"ECDHE-ECDSA-AES128-SHA",
		"ECDHE-RSA-AES128-SHA",
		"AES128-SHA",
	}
	codes, dropped := resolveCiphers(cbcCiphers)
	if len(dropped) != 0 {
		t.Errorf("expected no dropped CBC ciphers, got %v", dropped)
	}
	if len(codes) != 4 {
		t.Errorf("expected 4 resolved CBC ciphers, got %d", len(codes))
	}
}

func TestTLSConfigFromUnknownProfileLogs(t *testing.T) {
	// Unknown profile type should not error but should fall back to Intermediate.
	profile := &tlsSecurityProfile{Type: "FutureProfile"}
	cfg, err := tlsConfigFromProfile(profile, testLogger())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if cfg.MinVersion != tls.VersionTLS12 {
		t.Errorf("expected TLS 1.2 (Intermediate fallback), got %d", cfg.MinVersion)
	}
}
