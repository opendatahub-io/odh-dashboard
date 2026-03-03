package api

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestIsValidDNS1123Label(t *testing.T) {
	tests := []struct {
		name  string
		label string
		valid bool
	}{
		// Valid cases
		{
			name:  "valid simple lowercase",
			label: "test",
			valid: true,
		},
		{
			name:  "valid with hyphens",
			label: "test-namespace",
			valid: true,
		},
		{
			name:  "valid with numbers",
			label: "test123",
			valid: true,
		},
		{
			name:  "valid starting with number",
			label: "123test",
			valid: true,
		},
		{
			name:  "valid single character",
			label: "a",
			valid: true,
		},
		{
			name:  "valid max length (63 chars)",
			label: "a123456789012345678901234567890123456789012345678901234567890ab",
			valid: true,
		},

		// Invalid cases
		{
			name:  "invalid empty string",
			label: "",
			valid: false,
		},
		{
			name:  "invalid uppercase",
			label: "Test",
			valid: false,
		},
		{
			name:  "invalid uppercase all",
			label: "TEST",
			valid: false,
		},
		{
			name:  "invalid starting with hyphen",
			label: "-test",
			valid: false,
		},
		{
			name:  "invalid ending with hyphen",
			label: "test-",
			valid: false,
		},
		{
			name:  "invalid with underscore",
			label: "test_namespace",
			valid: false,
		},
		{
			name:  "invalid with special chars",
			label: "test@namespace",
			valid: false,
		},
		{
			name:  "invalid with spaces",
			label: "test namespace",
			valid: false,
		},
		{
			name:  "invalid with dots",
			label: "test.namespace",
			valid: false,
		},
		{
			name:  "invalid too long (64 chars)",
			label: "a1234567890123456789012345678901234567890123456789012345678901234",
			valid: false,
		},
		{
			name:  "invalid much too long",
			label: "this-is-a-very-long-namespace-name-that-exceeds-the-maximum-allowed-length-for-dns-labels",
			valid: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := isValidDNS1123Label(tt.label)
			assert.Equal(t, tt.valid, result, "isValidDNS1123Label(%q) = %v, want %v", tt.label, result, tt.valid)
		})
	}
}
