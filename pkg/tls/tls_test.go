package tls

import (
	"context"
	"crypto/tls"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"k8s.io/client-go/rest"
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
	// Unknown profile types fail closed rather than silently substituting
	// Intermediate, which could serve a weaker policy than the cluster intends.
	profile := &tlsSecurityProfile{Type: "FutureType"}
	_, err := resolveProfileSpec(profile)
	if err == nil {
		t.Fatal("expected error for unknown TLS profile type")
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

func TestResolveCiphersMixedTLS13And12Exact(t *testing.T) {
	// A profile naming both TLS 1.3 and TLS 1.2 suites must skip the (Go-managed)
	// TLS 1.3 names and resolve the TLS 1.2 names to the exact IDs, in order.
	names := []string{
		"TLS_AES_128_GCM_SHA256",        // TLS 1.3 - skipped (Go-managed)
		"ECDHE-RSA-AES128-GCM-SHA256",   // TLS 1.2
		"TLS_CHACHA20_POLY1305_SHA256",  // TLS 1.3 - skipped
		"ECDHE-ECDSA-AES256-GCM-SHA384", // TLS 1.2
	}
	codes, dropped := resolveCiphers(names)
	if len(dropped) != 0 {
		t.Errorf("expected no dropped ciphers, got %v", dropped)
	}
	want := []uint16{
		tls.TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256,
		tls.TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384,
	}
	if len(codes) != len(want) {
		t.Fatalf("expected %d resolved ciphers, got %d (%v)", len(want), len(codes), codes)
	}
	for i, c := range want {
		if codes[i] != c {
			t.Errorf("cipher[%d] = 0x%x, want 0x%x", i, codes[i], c)
		}
	}
}

func TestResolveCiphersChaChaSHA256Aliases(t *testing.T) {
	// Cross-resolver parity: the OpenSSL CHACHA20-POLY1305-SHA256 aliases (used by
	// the operator and notebooks maps) must also resolve here.
	codes, dropped := resolveCiphers([]string{
		"ECDHE-ECDSA-CHACHA20-POLY1305-SHA256",
		"ECDHE-RSA-CHACHA20-POLY1305-SHA256",
	})
	if len(dropped) != 0 {
		t.Errorf("expected no dropped ciphers, got %v", dropped)
	}
	if len(codes) != 2 {
		t.Errorf("expected 2 resolved ciphers, got %d (%v)", len(codes), codes)
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

func TestTLSConfigFromCustomEmptyCiphersTLS12FailsClosed(t *testing.T) {
	// A sub-TLS-1.3 Custom profile with no ciphers must fail closed rather than
	// fall back to Go's default cipher set (which would broaden policy).
	profile := &tlsSecurityProfile{
		Type: "Custom",
		Custom: &struct {
			tlsProfileSpec
		}{
			tlsProfileSpec: tlsProfileSpec{
				MinTLSVersion: "VersionTLS12",
				Ciphers:       []string{},
			},
		},
	}
	if _, err := tlsConfigFromProfile(profile, testLogger()); err == nil {
		t.Fatal("expected error for TLS 1.2 Custom profile with no ciphers")
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

// TestServerTLSConfigFromRESTBuildsClient verifies the REST client path end to
// end: given a rest.Config with no NegotiatedSerializer (as returned by
// rest.InClusterConfig), serverTLSConfigFromREST must still construct a working
// client, fetch the APIServer resource and apply the returned profile.
//
// This is a regression test for the crash where UnversionedRESTClientFor failed
// with "NegotiatedSerializer is required when initializing a RESTClient" because
// the config never set one.
func TestServerTLSConfigFromRESTBuildsClient(t *testing.T) {
	const body = `{"spec":{"tlsSecurityProfile":{"type":"Modern"}}}`
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/apis/config.openshift.io/v1/apiservers/cluster" {
			http.Error(w, "unexpected path: "+r.URL.Path, http.StatusNotFound)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(body))
	}))
	defer srv.Close()

	// Intentionally leave NegotiatedSerializer unset, mirroring InClusterConfig.
	cfg := &rest.Config{Host: srv.URL}
	tlsCfg, err := serverTLSConfigFromREST(context.Background(), cfg, testLogger(), false)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if tlsCfg.MinVersion != tls.VersionTLS13 {
		t.Errorf("expected Modern profile (TLS 1.3), got MinVersion %d", tlsCfg.MinVersion)
	}
}

// TestServerTLSConfigFromRESTNotFoundFailsOpen verifies that a 404 for the
// APIServer resource fails open to Intermediate defaults rather than erroring.
func TestServerTLSConfigFromRESTNotFoundFailsOpen(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Error(w, `{"kind":"Status","apiVersion":"v1","status":"Failure","reason":"NotFound","code":404}`, http.StatusNotFound)
	}))
	defer srv.Close()

	cfg := &rest.Config{Host: srv.URL}
	tlsCfg, err := serverTLSConfigFromREST(context.Background(), cfg, testLogger(), false)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if tlsCfg.MinVersion != tls.VersionTLS12 || len(tlsCfg.CipherSuites) != 6 {
		t.Errorf("expected Intermediate defaults on 404, got MinVersion %d with %d ciphers",
			tlsCfg.MinVersion, len(tlsCfg.CipherSuites))
	}
}

// TestServerTLSConfigFromRESTForbiddenFailsClosed verifies that a 403 reading the
// APIServer profile fails closed (returns an error) rather than silently serving
// weaker Intermediate defaults.
func TestServerTLSConfigFromRESTForbiddenFailsClosed(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Error(w, `{"kind":"Status","apiVersion":"v1","status":"Failure","reason":"Forbidden","code":403}`, http.StatusForbidden)
	}))
	defer srv.Close()

	cfg := &rest.Config{Host: srv.URL}
	if _, err := serverTLSConfigFromREST(context.Background(), cfg, testLogger(), false); err == nil {
		t.Fatal("expected error on 403 (fail-closed), got nil")
	}
}

// TestServerTLSConfigFromRESTUnauthorizedFailsClosed verifies the same for 401.
func TestServerTLSConfigFromRESTUnauthorizedFailsClosed(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Error(w, `{"kind":"Status","apiVersion":"v1","status":"Failure","reason":"Unauthorized","code":401}`, http.StatusUnauthorized)
	}))
	defer srv.Close()

	cfg := &rest.Config{Host: srv.URL}
	if _, err := serverTLSConfigFromREST(context.Background(), cfg, testLogger(), false); err == nil {
		t.Fatal("expected error on 401 (fail-closed), got nil")
	}
}

// TestServerTLSConfigFromRESTTransientLenientFailsOpen verifies that at startup
// (lenient) a 503 falls back to Intermediate defaults.
func TestServerTLSConfigFromRESTTransientLenientFailsOpen(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Error(w, `{"kind":"Status","apiVersion":"v1","status":"Failure","reason":"ServiceUnavailable","code":503}`, http.StatusServiceUnavailable)
	}))
	defer srv.Close()

	cfg := &rest.Config{Host: srv.URL}
	tlsCfg, err := serverTLSConfigFromREST(context.Background(), cfg, testLogger(), false)
	if err != nil {
		t.Fatalf("unexpected error (lenient should fail open on 503): %v", err)
	}
	if tlsCfg.MinVersion != tls.VersionTLS12 {
		t.Errorf("expected Intermediate defaults on transient error, got MinVersion %d", tlsCfg.MinVersion)
	}
}

// TestServerTLSConfigFromRESTTransientStrictFailsClosed verifies that during
// reload polling (strict) a 503 returns an error so the caller keeps the running
// policy rather than downgrading to Intermediate.
func TestServerTLSConfigFromRESTTransientStrictFailsClosed(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Error(w, `{"kind":"Status","apiVersion":"v1","status":"Failure","reason":"ServiceUnavailable","code":503}`, http.StatusServiceUnavailable)
	}))
	defer srv.Close()

	cfg := &rest.Config{Host: srv.URL}
	if _, err := serverTLSConfigFromREST(context.Background(), cfg, testLogger(), true); err == nil {
		t.Fatal("expected error on 503 when strict (reload must keep current config), got nil")
	}
}

// TestServerTLSConfigFromRESTNotFoundStrictStillFailsOpen verifies that a
// genuinely non-OpenShift cluster (NotFound) resolves to Intermediate even in
// strict mode, so reload polling on such clusters is stable.
func TestServerTLSConfigFromRESTNotFoundStrictStillFailsOpen(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Error(w, `{"kind":"Status","apiVersion":"v1","status":"Failure","reason":"NotFound","code":404}`, http.StatusNotFound)
	}))
	defer srv.Close()

	cfg := &rest.Config{Host: srv.URL}
	tlsCfg, err := serverTLSConfigFromREST(context.Background(), cfg, testLogger(), true)
	if err != nil {
		t.Fatalf("unexpected error (NotFound should fail open even when strict): %v", err)
	}
	if tlsCfg.MinVersion != tls.VersionTLS12 {
		t.Errorf("expected Intermediate defaults on NotFound, got MinVersion %d", tlsCfg.MinVersion)
	}
}

func TestResolveGroups(t *testing.T) {
	names := []string{"X25519", "P-256", "P-384", "X25519MLKEM768", "UNKNOWN-GROUP"}
	curves, dropped := resolveGroups(names)
	if len(curves) != 4 {
		t.Errorf("expected 4 resolved curves, got %d", len(curves))
	}
	if len(dropped) != 1 || dropped[0] != "UNKNOWN-GROUP" {
		t.Errorf("expected [UNKNOWN-GROUP] dropped, got %v", dropped)
	}
	if curves[0] != tls.X25519 || curves[1] != tls.CurveP256 {
		t.Errorf("groups not mapped in order: %v", curves)
	}
}

func TestResolveGroupsCanonicalOpenShiftNames(t *testing.T) {
	// OpenShift TLSSecurityProfile uses secp256r1/secp384r1/secp521r1 (not P-256 etc.).
	curves, dropped := resolveGroups([]string{"secp256r1", "secp384r1", "secp521r1"})
	if len(dropped) != 0 {
		t.Fatalf("expected no dropped groups, got %v", dropped)
	}
	want := []tls.CurveID{tls.CurveP256, tls.CurveP384, tls.CurveP521}
	if len(curves) != len(want) {
		t.Fatalf("expected %d curves, got %d", len(want), len(curves))
	}
	for i, c := range want {
		if curves[i] != c {
			t.Errorf("curve[%d] = %d, want %d", i, curves[i], c)
		}
	}
}

func TestResolveGroupsDeduplicate(t *testing.T) {
	curves, dropped := resolveGroups([]string{"P-256", "P-256"})
	if len(curves) != 1 {
		t.Errorf("expected 1 deduplicated curve, got %d", len(curves))
	}
	if len(dropped) != 0 {
		t.Errorf("expected no dropped groups, got %v", dropped)
	}
}

func TestTLSConfigWellKnownProfileNoCurvePreferences(t *testing.T) {
	// Well-known profiles don't restrict groups, so CurvePreferences stays nil
	// and Go's secure defaults apply.
	profile := &tlsSecurityProfile{Type: "Intermediate"}
	cfg, err := tlsConfigFromProfile(profile, testLogger())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if cfg.CurvePreferences != nil {
		t.Errorf("expected nil CurvePreferences for well-known profile, got %v", cfg.CurvePreferences)
	}
}

func TestTLSConfigFromCustomProfileGroups(t *testing.T) {
	// A Custom profile that restricts groups must be enforced via CurvePreferences.
	profile := &tlsSecurityProfile{
		Type: "Custom",
		Custom: &struct {
			tlsProfileSpec
		}{
			tlsProfileSpec: tlsProfileSpec{
				MinTLSVersion: "VersionTLS13",
				Groups:        []string{"P-384", "P-256"},
			},
		},
	}
	cfg, err := tlsConfigFromProfile(profile, testLogger())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(cfg.CurvePreferences) != 2 {
		t.Fatalf("expected 2 curve preferences, got %d", len(cfg.CurvePreferences))
	}
	if cfg.CurvePreferences[0] != tls.CurveP384 || cfg.CurvePreferences[1] != tls.CurveP256 {
		t.Errorf("curve preferences not honored in order: %v", cfg.CurvePreferences)
	}
}

func TestTLSConfigFromCustomAllUnsupportedGroups(t *testing.T) {
	// A custom profile where every group is unmapped should fail closed.
	profile := &tlsSecurityProfile{
		Type: "Custom",
		Custom: &struct {
			tlsProfileSpec
		}{
			tlsProfileSpec: tlsProfileSpec{
				MinTLSVersion: "VersionTLS13",
				Groups:        []string{"BOGUS-GROUP-1", "BOGUS-GROUP-2"},
			},
		},
	}
	_, err := tlsConfigFromProfile(profile, testLogger())
	if err == nil {
		t.Fatal("expected error when all custom groups are unsupported")
	}
}

func TestTLSConfigFromUnknownProfileFailsClosed(t *testing.T) {
	// Unknown profile type must fail closed rather than fall back to Intermediate.
	profile := &tlsSecurityProfile{Type: "FutureProfile"}
	_, err := tlsConfigFromProfile(profile, testLogger())
	if err == nil {
		t.Fatal("expected error for unknown TLS profile type")
	}
}
