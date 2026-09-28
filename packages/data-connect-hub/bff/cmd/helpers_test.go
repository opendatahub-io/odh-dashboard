package main

import (
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

func TestValidateInsecureSkipVerify(t *testing.T) {
	tests := []struct {
		name               string
		insecureSkipVerify bool
		devMode            bool
		certFile           string
		wantError          string
	}{
		{
			name: "verification enabled",
		},
		{
			name:               "local development without server certificate",
			insecureSkipVerify: true,
			devMode:            true,
		},
		{
			name:               "insecure TLS outside development mode",
			insecureSkipVerify: true,
			wantError:          "only allowed in dev mode",
		},
		{
			name:               "insecure TLS with server certificate",
			insecureSkipVerify: true,
			devMode:            true,
			certFile:           "/etc/tls/private/tls.crt",
			wantError:          "not allowed when a server certificate is configured",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validateInsecureSkipVerify(tt.insecureSkipVerify, tt.devMode, tt.certFile)
			if tt.wantError == "" {
				if err != nil {
					t.Fatalf("unexpected error: %v", err)
				}
				return
			}
			if err == nil {
				t.Fatalf("expected error containing %q", tt.wantError)
			}
			if !strings.Contains(err.Error(), tt.wantError) {
				t.Fatalf("expected error containing %q, got %q", tt.wantError, err.Error())
			}
		})
	}
}
