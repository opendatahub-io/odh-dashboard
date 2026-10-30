package main

import (
	"flag"
	"strings"
	"testing"
)

func TestNewOriginParser(t *testing.T) {
	cases := []struct {
		name     string
		input    string
		expected []string
	}{
		{"one item", "https://test.com", []string{"https://test.com"}},
		{"two items", "https://test.com,https://test2.com", []string{"https://test.com", "https://test2.com"}},
		{"two items spaced", "https://test.com,    https://test2.com", []string{"https://test.com", "https://test2.com"}},
		{"empty", "", []string{}},
		{"wildcard", "*", []string{"*"}},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			var allowList []string
			parser := newOriginParser(&allowList, "")
			if err := parser(tc.input); err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if len(allowList) != len(tc.expected) {
				t.Fatalf("expected len=%d got=%d", len(tc.expected), len(allowList))
			}
			for i := range allowList {
				if allowList[i] != tc.expected[i] {
					t.Fatalf("expected %v got %v", tc.expected, allowList)
				}
			}
		})
	}
}

func TestNewOriginParserEnvironmentDefault(t *testing.T) {
	var allowList []string
	parser := newOriginParser(&allowList, "https://default.example, https://second.example")

	if want := []string{"https://default.example", "https://second.example"}; !equalStrings(allowList, want) {
		t.Fatalf("environment default = %v, want %v", allowList, want)
	}

	if err := parser("https://flag.example"); err != nil {
		t.Fatalf("unexpected parser error: %v", err)
	}
	if want := []string{"https://flag.example"}; !equalStrings(allowList, want) {
		t.Fatalf("flag value = %v, want %v", allowList, want)
	}
}

func TestNewOriginParserExplicitEmptyClearsEnvironmentDefaults(t *testing.T) {
	for _, tc := range []struct {
		name       string
		defaultVal string
	}{
		{name: "allowed origins", defaultVal: "*"},
		{name: "bundle paths", defaultVal: "/etc/pki/ca-bundle.pem"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			var parsed []string
			parser := newOriginParser(&parsed, tc.defaultVal)

			if err := parser(""); err != nil {
				t.Fatalf("unexpected parser error: %v", err)
			}
			if len(parsed) != 0 {
				t.Fatalf("explicit empty flag retained environment default: %v", parsed)
			}
		})
	}
}

func TestRegisterDevModeFlagReadsEnvironmentAndHonorsFlagOverride(t *testing.T) {
	t.Setenv("DEV_MODE", "true")

	var envDefault bool
	envFlags := flag.NewFlagSet("env-default", flag.ContinueOnError)
	registerDevModeFlag(envFlags, &envDefault)
	if err := envFlags.Parse(nil); err != nil {
		t.Fatalf("Parse() error = %v", err)
	}
	if !envDefault {
		t.Fatal("DEV_MODE=true should enable dev mode when the flag is omitted")
	}

	var explicitOverride bool
	overrideFlags := flag.NewFlagSet("explicit-override", flag.ContinueOnError)
	registerDevModeFlag(overrideFlags, &explicitOverride)
	if err := overrideFlags.Parse([]string{"-dev-mode=false"}); err != nil {
		t.Fatalf("Parse() error = %v", err)
	}
	if explicitOverride {
		t.Fatal("explicit -dev-mode=false should override DEV_MODE=true")
	}
}

func TestValidateBFFTransportTLSConfig(t *testing.T) {
	tests := []struct {
		name                string
		devMode             bool
		allowInsecureHTTP   bool
		dchEnabled          bool
		dchTLSEnabled       bool
		wantErrorContaining string
	}{
		{
			name:          "secure defaults are allowed",
			dchTLSEnabled: true,
		},
		{
			name:              "built-in plaintext opt-out is allowed in development",
			devMode:           true,
			allowInsecureHTTP: true,
			dchTLSEnabled:     true,
		},
		{
			name:                "built-in plaintext opt-out is rejected outside development",
			allowInsecureHTTP:   true,
			dchTLSEnabled:       true,
			wantErrorContaining: "BFF_CLIENTS_ALLOW_INSECURE_HTTP",
		},
		{
			name:          "DCH plaintext opt-out is allowed in development",
			devMode:       true,
			dchEnabled:    true,
			dchTLSEnabled: false,
		},
		{
			name:                "DCH plaintext opt-out is rejected outside development",
			dchEnabled:          true,
			dchTLSEnabled:       false,
			wantErrorContaining: "BFF_DCH_TLS_ENABLED=false",
		},
		{
			name:          "DCH TLS setting is ignored when DCH is disabled",
			dchEnabled:    false,
			dchTLSEnabled: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validateBFFTransportTLSConfig(tt.devMode, tt.allowInsecureHTTP, tt.dchEnabled, tt.dchTLSEnabled)
			if tt.wantErrorContaining == "" {
				if err != nil {
					t.Fatalf("validateBFFTransportTLSConfig() error = %v, want nil", err)
				}
				return
			}
			if err == nil || !strings.Contains(err.Error(), tt.wantErrorContaining) {
				t.Fatalf("validateBFFTransportTLSConfig() error = %v, want error containing %q", err, tt.wantErrorContaining)
			}
		})
	}
}

func equalStrings(a, b []string) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if a[i] != b[i] {
			return false
		}
	}
	return true
}
